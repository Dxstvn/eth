import { KYCAuditEntry, KYCActionType, kycAuditLogger } from '../services/kyc-audit-logger';
import { getAuditStorage } from '../services/audit-storage';

// Security pattern types
export enum SecurityPatternType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  ANOMALOUS_ACCESS = 'ANOMALOUS_ACCESS',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  SYSTEM_TAMPERING = 'SYSTEM_TAMPERING'
}

// Security alert interface
export interface SecurityAlert {
  id: string;
  timestamp: number;
  patternType: SecurityPatternType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  description: string;
  evidence: KYCAuditEntry[];
  recommendations: string[];
  autoBlocked: boolean;
}

// Pattern detection configuration
export interface PatternConfig {
  name: string;
  type: SecurityPatternType;
  conditions: PatternCondition[];
  severity: SecurityAlert['severity'];
  autoBlock?: boolean;
  alertThreshold?: number;
}

export interface PatternCondition {
  action?: KYCActionType | KYCActionType[];
  minOccurrences: number;
  timeWindowMinutes: number;
  additionalChecks?: (entries: KYCAuditEntry[]) => boolean;
}

// KYC Security Monitor class
export class KYCSecurityMonitor {
  private static instance: KYCSecurityMonitor;
  private patterns: PatternConfig[];
  private alerts: SecurityAlert[] = [];
  private blockedUsers: Set<string> = new Set();
  
  private constructor() {
    this.patterns = this.initializePatterns();
    this.startMonitoring();
  }
  
  static getInstance(): KYCSecurityMonitor {
    if (!KYCSecurityMonitor.instance) {
      KYCSecurityMonitor.instance = new KYCSecurityMonitor();
    }
    return KYCSecurityMonitor.instance;
  }
  
  // Initialize security patterns
  private initializePatterns(): PatternConfig[] {
    return [
      {
        name: 'Brute Force Authentication',
        type: SecurityPatternType.BRUTE_FORCE,
        conditions: [{
          action: KYCActionType.KYC_FAILED_AUTH_ATTEMPT,
          minOccurrences: 5,
          timeWindowMinutes: 5
        }],
        severity: 'high',
        autoBlock: true
      },
      {
        name: 'Data Exfiltration Attempt',
        type: SecurityPatternType.DATA_EXFILTRATION,
        conditions: [
          {
            action: [
              KYCActionType.PERSONAL_INFO_VIEWED,
              KYCActionType.DOCUMENT_VIEWED,
              KYCActionType.KYC_DATA_EXPORTED
            ],
            minOccurrences: 50,
            timeWindowMinutes: 10
          }
        ],
        severity: 'critical',
        autoBlock: true
      },
      {
        name: 'Rapid Document Access',
        type: SecurityPatternType.ANOMALOUS_ACCESS,
        conditions: [{
          action: KYCActionType.DOCUMENT_VIEWED,
          minOccurrences: 20,
          timeWindowMinutes: 2,
          additionalChecks: (entries) => {
            // Check if accessing different KYC IDs
            const uniqueKycIds = new Set(entries.map(e => e.kycId).filter(Boolean));
            return uniqueKycIds.size > 10;
          }
        }],
        severity: 'high'
      },
      {
        name: 'Unauthorized Admin Actions',
        type: SecurityPatternType.PRIVILEGE_ESCALATION,
        conditions: [{
          action: [
            KYCActionType.KYC_ADMIN_OVERRIDE,
            KYCActionType.KYC_APPROVED,
            KYCActionType.KYC_REJECTED
          ],
          minOccurrences: 1,
          timeWindowMinutes: 60,
          additionalChecks: (entries) => {
            // Check if user has admin role
            return entries.some(e => !e.details.isAdmin);
          }
        }],
        severity: 'critical',
        autoBlock: true
      },
      {
        name: 'Mass Data Modification',
        type: SecurityPatternType.SYSTEM_TAMPERING,
        conditions: [{
          action: [
            KYCActionType.PERSONAL_INFO_UPDATED,
            KYCActionType.DOCUMENT_DELETED
          ],
          minOccurrences: 10,
          timeWindowMinutes: 5
        }],
        severity: 'high'
      },
      {
        name: 'Rate Limit Violations',
        type: SecurityPatternType.ANOMALOUS_ACCESS,
        conditions: [{
          action: KYCActionType.KYC_RATE_LIMIT_EXCEEDED,
          minOccurrences: 3,
          timeWindowMinutes: 15
        }],
        severity: 'medium'
      },
      {
        name: 'GDPR Compliance Violation',
        type: SecurityPatternType.COMPLIANCE_VIOLATION,
        conditions: [{
          action: KYCActionType.KYC_DATA_EXPORTED,
          minOccurrences: 1,
          timeWindowMinutes: 60,
          additionalChecks: (entries) => {
            // Check if export includes unmasked PII
            return entries.some(e => !e.compliance.piiMasked);
          }
        }],
        severity: 'high'
      }
    ];
  }
  
  // Start monitoring
  private startMonitoring(): void {
    // Check patterns every minute
    setInterval(() => {
      this.checkPatterns();
    }, 60 * 1000);
  }
  
  // Check security patterns
  private async checkPatterns(): Promise<void> {
    const storage = getAuditStorage();
    
    for (const pattern of this.patterns) {
      for (const condition of pattern.conditions) {
        const cutoffTime = new Date(Date.now() - condition.timeWindowMinutes * 60 * 1000);
        
        // Get relevant entries
        const entries = await storage.retrieve({
          action: condition.action,
          dateFrom: cutoffTime,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        });
        
        // Group by user
        const entriesByUser = new Map<string, KYCAuditEntry[]>();
        entries.forEach(entry => {
          const userEntries = entriesByUser.get(entry.userId) || [];
          userEntries.push(entry);
          entriesByUser.set(entry.userId, userEntries);
        });
        
        // Check each user
        for (const [userId, userEntries] of entriesByUser) {
          if (userEntries.length >= condition.minOccurrences) {
            // Apply additional checks if any
            if (!condition.additionalChecks || condition.additionalChecks(userEntries)) {
              this.createAlert(pattern, userId, userEntries);
            }
          }
        }
      }
    }
  }
  
  // Create security alert
  private createAlert(
    pattern: PatternConfig,
    userId: string,
    evidence: KYCAuditEntry[]
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      a => a.patternType === pattern.type && 
           a.userId === userId && 
           a.timestamp > Date.now() - 60 * 60 * 1000 // Within last hour
    );
    
    if (existingAlert) {
      return;
    }
    
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      patternType: pattern.type,
      severity: pattern.severity,
      userId,
      description: this.generateAlertDescription(pattern, evidence),
      evidence: evidence.slice(0, 10), // Include up to 10 evidence entries
      recommendations: this.generateRecommendations(pattern),
      autoBlocked: false
    };
    
    // Auto-block if configured
    if (pattern.autoBlock && userId !== 'anonymous') {
      this.blockUser(userId);
      alert.autoBlocked = true;
    }
    
    // Store alert
    this.alerts.push(alert);
    
    // Log the security event
    kycAuditLogger.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
      alertId: alert.id,
      patternType: pattern.type,
      severity: pattern.severity,
      userId,
      autoBlocked: alert.autoBlocked
    });
    
    // Notify administrators (in production, this would send actual notifications)
    this.notifyAdministrators(alert);
  }
  
  // Generate alert description
  private generateAlertDescription(pattern: PatternConfig, evidence: KYCAuditEntry[]): string {
    const descriptions: Record<SecurityPatternType, (evidence: KYCAuditEntry[]) => string> = {
      [SecurityPatternType.BRUTE_FORCE]: (entries) => 
        `${entries.length} failed authentication attempts detected in ${pattern.conditions[0].timeWindowMinutes} minutes`,
      
      [SecurityPatternType.DATA_EXFILTRATION]: (entries) => 
        `Potential data exfiltration: ${entries.length} data access operations in ${pattern.conditions[0].timeWindowMinutes} minutes`,
      
      [SecurityPatternType.PRIVILEGE_ESCALATION]: () => 
        `Unauthorized administrative action attempted`,
      
      [SecurityPatternType.ANOMALOUS_ACCESS]: (entries) => 
        `Unusual access pattern detected: ${entries.length} operations`,
      
      [SecurityPatternType.COMPLIANCE_VIOLATION]: () => 
        `Compliance violation detected in data handling`,
      
      [SecurityPatternType.SYSTEM_TAMPERING]: (entries) => 
        `Suspicious system modifications: ${entries.length} changes detected`
    };
    
    return descriptions[pattern.type](evidence);
  }
  
  // Generate recommendations
  private generateRecommendations(pattern: PatternConfig): string[] {
    const recommendations: Record<SecurityPatternType, string[]> = {
      [SecurityPatternType.BRUTE_FORCE]: [
        'Review authentication logs for source IP addresses',
        'Consider implementing CAPTCHA for this user',
        'Check for credential stuffing patterns',
        'Review password policy compliance'
      ],
      
      [SecurityPatternType.DATA_EXFILTRATION]: [
        'Immediately review all data access by this user',
        'Check for unauthorized API usage',
        'Verify user permissions and access requirements',
        'Consider revoking access temporarily',
        'Audit all exported data'
      ],
      
      [SecurityPatternType.PRIVILEGE_ESCALATION]: [
        'Verify user role assignments',
        'Review admin action authorization',
        'Check for session hijacking',
        'Audit all administrative actions by this user'
      ],
      
      [SecurityPatternType.ANOMALOUS_ACCESS]: [
        'Analyze access patterns for legitimacy',
        'Check for automated scraping',
        'Review user\'s normal usage patterns',
        'Consider rate limiting adjustments'
      ],
      
      [SecurityPatternType.COMPLIANCE_VIOLATION]: [
        'Review data handling procedures',
        'Ensure GDPR compliance measures are active',
        'Audit data retention policies',
        'Check encryption status of exported data'
      ],
      
      [SecurityPatternType.SYSTEM_TAMPERING]: [
        'Review all system modifications',
        'Check for data integrity issues',
        'Verify change authorization',
        'Consider system rollback if necessary'
      ]
    };
    
    return recommendations[pattern.type] || ['Review security logs for more details'];
  }
  
  // Block user
  private blockUser(userId: string): void {
    this.blockedUsers.add(userId);
    
    // In production, this would update the user's status in the database
    // and invalidate their sessions
  }
  
  // Check if user is blocked
  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }
  
  // Unblock user
  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
  }
  
  // Notify administrators
  private notifyAdministrators(alert: SecurityAlert): void {
    // In production, this would:
    // - Send email notifications
    // - Create dashboard alerts
    // - Trigger webhook notifications
    // - Log to SIEM systems
    
    if (alert.severity === 'critical') {
      console.error('[CRITICAL SECURITY ALERT]', alert);
    } else {
      console.warn('[SECURITY ALERT]', alert);
    }
  }
  
  // Get active alerts
  getActiveAlerts(filters?: {
    userId?: string;
    patternType?: SecurityPatternType;
    severity?: SecurityAlert['severity'];
    since?: Date;
  }): SecurityAlert[] {
    let alerts = [...this.alerts];
    
    if (filters) {
      if (filters.userId) {
        alerts = alerts.filter(a => a.userId === filters.userId);
      }
      if (filters.patternType) {
        alerts = alerts.filter(a => a.patternType === filters.patternType);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.since) {
        alerts = alerts.filter(a => a.timestamp >= filters.since.getTime());
      }
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // Generate security report
  async generateSecurityReport(dateRange: { from: Date; to: Date }): Promise<{
    summary: {
      totalAlerts: number;
      alertsBySeverity: Record<string, number>;
      alertsByType: Record<SecurityPatternType, number>;
      blockedUsers: number;
    };
    topThreats: Array<{
      type: SecurityPatternType;
      count: number;
      users: string[];
    }>;
    recommendations: string[];
    alerts: SecurityAlert[];
  }> {
    const alerts = this.getActiveAlerts({ since: dateRange.from })
      .filter(a => a.timestamp <= dateRange.to.getTime());
    
    // Calculate summary statistics
    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<SecurityPatternType, number> = {};
    const usersByType = new Map<SecurityPatternType, Set<string>>();
    
    alerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByType[alert.patternType] = (alertsByType[alert.patternType] || 0) + 1;
      
      if (alert.userId) {
        const users = usersByType.get(alert.patternType) || new Set();
        users.add(alert.userId);
        usersByType.set(alert.patternType, users);
      }
    });
    
    // Identify top threats
    const topThreats = Object.entries(alertsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type: type as SecurityPatternType,
        count,
        users: Array.from(usersByType.get(type as SecurityPatternType) || [])
      }));
    
    // Generate recommendations based on patterns
    const recommendations: string[] = [];
    
    if (alertsByType[SecurityPatternType.BRUTE_FORCE] > 10) {
      recommendations.push('Implement stronger authentication mechanisms (MFA)');
    }
    
    if (alertsByType[SecurityPatternType.DATA_EXFILTRATION] > 0) {
      recommendations.push('Review and tighten data access controls');
      recommendations.push('Implement data loss prevention (DLP) measures');
    }
    
    if (alertsBySeverity.critical > 0) {
      recommendations.push('Immediate security review required for critical alerts');
    }
    
    if (this.blockedUsers.size > 5) {
      recommendations.push('Review blocked user list and investigate patterns');
    }
    
    return {
      summary: {
        totalAlerts: alerts.length,
        alertsBySeverity,
        alertsByType,
        blockedUsers: this.blockedUsers.size
      },
      topThreats,
      recommendations,
      alerts: alerts.slice(0, 100) // Include up to 100 most recent alerts
    };
  }
}

// Global security monitor instance
export const kycSecurityMonitor = KYCSecurityMonitor.getInstance();

// React hook for security monitoring
export function useKYCSecurityMonitor() {
  const getAlerts = (filters?: Parameters<typeof kycSecurityMonitor.getActiveAlerts>[0]) => {
    return kycSecurityMonitor.getActiveAlerts(filters);
  };
  
  const isBlocked = (userId: string) => {
    return kycSecurityMonitor.isUserBlocked(userId);
  };
  
  const generateReport = async (dateRange: { from: Date; to: Date }) => {
    return kycSecurityMonitor.generateSecurityReport(dateRange);
  };
  
  return { getAlerts, isBlocked, generateReport };
}