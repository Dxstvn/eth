import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';
import { incidentResponseSystem, IncidentType, IncidentSeverity } from './incident-response';

// Data classification levels
export enum DataClassification {
  PUBLIC = 'PUBLIC',           // Publicly available information
  INTERNAL = 'INTERNAL',       // Internal business information
  CONFIDENTIAL = 'CONFIDENTIAL', // Sensitive business information
  RESTRICTED = 'RESTRICTED',   // Highly sensitive information
  TOP_SECRET = 'TOP_SECRET',   // Most sensitive information
}

// Data types for financial services
export enum FinancialDataType {
  PERSONAL_INFO = 'PERSONAL_INFO',           // Name, address, phone
  FINANCIAL_INFO = 'FINANCIAL_INFO',         // Account numbers, balances
  PAYMENT_INFO = 'PAYMENT_INFO',             // Credit cards, bank details
  IDENTIFICATION = 'IDENTIFICATION',         // SSN, passport, driver's license
  BIOMETRIC = 'BIOMETRIC',                   // Fingerprints, facial recognition
  AUTHENTICATION = 'AUTHENTICATION',         // Passwords, tokens, keys
  TRANSACTION_DATA = 'TRANSACTION_DATA',     // Transaction history, patterns
  KYC_DATA = 'KYC_DATA',                    // Know Your Customer information
  LEGAL_DOCUMENTS = 'LEGAL_DOCUMENTS',       // Contracts, agreements
  AUDIT_LOGS = 'AUDIT_LOGS',                // System audit information
}

// DLP policy rule
export interface DLPRule {
  id: string;
  name: string;
  description: string;
  dataType: FinancialDataType;
  classification: DataClassification;
  patterns: RegExp[];
  keywords: string[];
  enabled: boolean;
  action: 'block' | 'alert' | 'encrypt' | 'redact';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// DLP violation
export interface DLPViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  dataType: FinancialDataType;
  classification: DataClassification;
  content: string;
  redactedContent: string;
  location: string;
  action: string;
  timestamp: number;
  userId?: string;
  metadata: Record<string, any>;
}

// Data Loss Prevention system
export class DataLossPreventionSystem {
  private static instance: DataLossPreventionSystem;
  private rules: Map<string, DLPRule> = new Map();
  private violations: DLPViolation[] = [];
  private isEnabled: boolean = true;
  
  private constructor() {
    this.initializeDefaultRules();
  }
  
  static getInstance(): DataLossPreventionSystem {
    if (!DataLossPreventionSystem.instance) {
      DataLossPreventionSystem.instance = new DataLossPreventionSystem();
    }
    return DataLossPreventionSystem.instance;
  }
  
  // Initialize default DLP rules
  private initializeDefaultRules(): void {
    const defaultRules: DLPRule[] = [
      {
        id: 'ssn-detection',
        name: 'Social Security Number Detection',
        description: 'Detect US Social Security Numbers',
        dataType: FinancialDataType.IDENTIFICATION,
        classification: DataClassification.RESTRICTED,
        patterns: [
          /\b\d{3}-\d{2}-\d{4}\b/g,           // XXX-XX-XXXX format
          /\b\d{3}\s\d{2}\s\d{4}\b/g,         // XXX XX XXXX format
          /\b\d{9}\b/g,                       // XXXXXXXXX format (9 digits)
        ],
        keywords: ['ssn', 'social security', 'social security number'],
        enabled: true,
        action: 'redact',
        severity: 'critical',
      },
      {
        id: 'credit-card-detection',
        name: 'Credit Card Number Detection',
        description: 'Detect credit card numbers',
        dataType: FinancialDataType.PAYMENT_INFO,
        classification: DataClassification.RESTRICTED,
        patterns: [
          /\b4[0-9]{12}(?:[0-9]{3})?\b/g,     // Visa
          /\b5[1-5][0-9]{14}\b/g,             // MasterCard
          /\b3[47][0-9]{13}\b/g,              // American Express
          /\b3[0-9]{4}\s?[0-9]{6}\s?[0-9]{5}\b/g, // Diners Club
        ],
        keywords: ['credit card', 'card number', 'cc number'],
        enabled: true,
        action: 'redact',
        severity: 'critical',
      },
      {
        id: 'bank-account-detection',
        name: 'Bank Account Number Detection',
        description: 'Detect bank account numbers',
        dataType: FinancialDataType.FINANCIAL_INFO,
        classification: DataClassification.RESTRICTED,
        patterns: [
          /\b\d{8,17}\b/g,                    // Account numbers (8-17 digits)
          /\b\d{9}\s?\d{9}\b/g,              // Routing + Account
        ],
        keywords: ['account number', 'routing number', 'bank account'],
        enabled: true,
        action: 'redact',
        severity: 'critical',
      },
      {
        id: 'email-detection',
        name: 'Email Address Detection',
        description: 'Detect email addresses',
        dataType: FinancialDataType.PERSONAL_INFO,
        classification: DataClassification.CONFIDENTIAL,
        patterns: [
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        ],
        keywords: ['email', 'email address'],
        enabled: true,
        action: 'alert',
        severity: 'medium',
      },
      {
        id: 'phone-number-detection',
        name: 'Phone Number Detection',
        description: 'Detect phone numbers',
        dataType: FinancialDataType.PERSONAL_INFO,
        classification: DataClassification.CONFIDENTIAL,
        patterns: [
          /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
          /\b\d{10}\b/g,
        ],
        keywords: ['phone', 'mobile', 'telephone'],
        enabled: true,
        action: 'alert',
        severity: 'medium',
      },
      {
        id: 'password-detection',
        name: 'Password Detection',
        description: 'Detect passwords in plaintext',
        dataType: FinancialDataType.AUTHENTICATION,
        classification: DataClassification.TOP_SECRET,
        patterns: [
          /password\s*[:=]\s*[^\s\n]+/gi,
          /pwd\s*[:=]\s*[^\s\n]+/gi,
        ],
        keywords: ['password', 'pwd', 'passwd'],
        enabled: true,
        action: 'block',
        severity: 'critical',
      },
      {
        id: 'crypto-key-detection',
        name: 'Cryptographic Key Detection',
        description: 'Detect cryptographic keys',
        dataType: FinancialDataType.AUTHENTICATION,
        classification: DataClassification.TOP_SECRET,
        patterns: [
          /-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g,
          /[A-Za-z0-9+/]{64,}/g, // Base64 encoded keys (simplified)
        ],
        keywords: ['private key', 'secret key', 'api key'],
        enabled: true,
        action: 'block',
        severity: 'critical',
      },
      {
        id: 'wallet-address-detection',
        name: 'Crypto Wallet Address Detection',
        description: 'Detect cryptocurrency wallet addresses',
        dataType: FinancialDataType.FINANCIAL_INFO,
        classification: DataClassification.CONFIDENTIAL,
        patterns: [
          /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, // Bitcoin
          /\b0x[a-fA-F0-9]{40}\b/g,               // Ethereum
        ],
        keywords: ['wallet address', 'btc address', 'eth address'],
        enabled: true,
        action: 'alert',
        severity: 'high',
      },
    ];
    
    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }
  
  // Scan content for sensitive data
  scanContent(
    content: string,
    location: string = 'unknown',
    userId?: string,
    metadata: Record<string, any> = {}
  ): DLPViolation[] {
    if (!this.isEnabled) return [];
    
    const violations: DLPViolation[] = [];
    
    this.rules.forEach(rule => {
      if (!rule.enabled) return;
      
      const ruleViolations = this.applyRule(rule, content, location, userId, metadata);
      violations.push(...ruleViolations);
    });
    
    // Store violations
    this.violations.push(...violations);
    
    // Process violations
    violations.forEach(violation => this.processViolation(violation));
    
    return violations;
  }
  
  // Apply DLP rule to content
  private applyRule(
    rule: DLPRule,
    content: string,
    location: string,
    userId?: string,
    metadata: Record<string, any> = {}
  ): DLPViolation[] {
    const violations: DLPViolation[] = [];
    
    // Check patterns
    rule.patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const violation: DLPViolation = {
          id: `dlp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          dataType: rule.dataType,
          classification: rule.classification,
          content: match[0],
          redactedContent: this.redactContent(match[0], rule.dataType),
          location,
          action: rule.action,
          timestamp: Date.now(),
          userId,
          metadata,
        };
        
        violations.push(violation);
      }
    });
    
    // Check keywords (case-insensitive)
    const lowerContent = content.toLowerCase();
    rule.keywords.forEach(keyword => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        // Find the actual occurrence for context
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        let match;
        while ((match = keywordRegex.exec(content)) !== null) {
          const contextStart = Math.max(0, match.index - 20);
          const contextEnd = Math.min(content.length, match.index + keyword.length + 20);
          const context = content.substring(contextStart, contextEnd);
          
          const violation: DLPViolation = {
            id: `dlp-kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            ruleName: rule.name,
            dataType: rule.dataType,
            classification: rule.classification,
            content: context,
            redactedContent: this.redactContent(context, rule.dataType),
            location,
            action: rule.action,
            timestamp: Date.now(),
            userId,
            metadata: { ...metadata, keyword, match: match[0] },
          };
          
          violations.push(violation);
        }
      }
    });
    
    return violations;
  }
  
  // Redact sensitive content
  private redactContent(content: string, dataType: FinancialDataType): string {
    switch (dataType) {
      case FinancialDataType.IDENTIFICATION:
        // SSN: XXX-XX-1234 (show last 4)
        if (content.match(/\d{3}-\d{2}-\d{4}/)) {
          return content.replace(/\d{3}-\d{2}-(\d{4})/, 'XXX-XX-$1');
        }
        return content.replace(/\d/g, 'X');
        
      case FinancialDataType.PAYMENT_INFO:
        // Credit card: XXXX-XXXX-XXXX-1234 (show last 4)
        return content.replace(/\d(?=\d{4})/g, 'X');
        
      case FinancialDataType.FINANCIAL_INFO:
        // Bank account: show last 4 digits
        if (content.length > 4) {
          return 'X'.repeat(content.length - 4) + content.slice(-4);
        }
        return content.replace(/\d/g, 'X');
        
      case FinancialDataType.AUTHENTICATION:
        return '[REDACTED]';
        
      case FinancialDataType.PERSONAL_INFO:
        // Email: j***@example.com
        if (content.includes('@')) {
          const [local, domain] = content.split('@');
          return local.charAt(0) + '***@' + domain;
        }
        // Phone: (555) XXX-1234
        return content.replace(/\d(?=\d{4})/g, 'X');
        
      default:
        return content.replace(/./g, 'X');
    }
  }
  
  // Process DLP violation
  private processViolation(violation: DLPViolation): void {
    // Log security event
    securityLogger.log(
      SecurityEventType.DATA_EXPORT,
      violation.classification === DataClassification.TOP_SECRET ? SecurityEventSeverity.CRITICAL :
      violation.classification === DataClassification.RESTRICTED ? SecurityEventSeverity.HIGH :
      violation.classification === DataClassification.CONFIDENTIAL ? SecurityEventSeverity.MEDIUM :
      SecurityEventSeverity.LOW,
      {
        action: 'DLP violation detected',
        violationId: violation.id,
        ruleId: violation.ruleId,
        dataType: violation.dataType,
        classification: violation.classification,
        location: violation.location,
        userId: violation.userId,
      }
    );
    
    // Create incident for critical violations
    if (violation.classification === DataClassification.TOP_SECRET ||
        violation.classification === DataClassification.RESTRICTED) {
      incidentResponseSystem.createIncident(
        IncidentType.DATA_BREACH,
        violation.classification === DataClassification.TOP_SECRET 
          ? IncidentSeverity.CRITICAL 
          : IncidentSeverity.HIGH,
        `DLP Violation: ${violation.ruleName}`,
        `Sensitive data detected: ${violation.dataType} at ${violation.location}`,
        'DLP System',
        {
          violationId: violation.id,
          ruleId: violation.ruleId,
          dataType: violation.dataType,
          classification: violation.classification,
        }
      );
    }
    
    // Audit trail
    auditTrail.log(
      AuditActionType.DATA_EXPORT,
      'data',
      {
        action: 'DLP violation',
        ruleId: violation.ruleId,
        dataType: violation.dataType,
        classification: violation.classification,
      },
      { resourceId: violation.id }
    );
  }
  
  // Sanitize content by removing/redacting sensitive data
  sanitizeContent(content: string, location: string = 'sanitization'): {
    sanitizedContent: string;
    violations: DLPViolation[];
  } {
    let sanitizedContent = content;
    const violations = this.scanContent(content, location);
    
    violations.forEach(violation => {
      if (violation.action === 'redact' || violation.action === 'block') {
        sanitizedContent = sanitizedContent.replace(
          violation.content,
          violation.redactedContent
        );
      }
    });
    
    return { sanitizedContent, violations };
  }
  
  // Check if content is safe for transmission/storage
  isContentSafe(content: string, location: string = 'safety-check'): {
    isSafe: boolean;
    violations: DLPViolation[];
    blockedViolations: DLPViolation[];
  } {
    const violations = this.scanContent(content, location);
    const blockedViolations = violations.filter(v => v.action === 'block');
    
    return {
      isSafe: blockedViolations.length === 0,
      violations,
      blockedViolations,
    };
  }
  
  // Add custom DLP rule
  addRule(rule: DLPRule): void {
    this.rules.set(rule.id, rule);
  }
  
  // Remove DLP rule
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }
  
  // Enable/disable rule
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
  
  // Get all rules
  getAllRules(): DLPRule[] {
    return Array.from(this.rules.values());
  }
  
  // Get violations
  getViolations(limit?: number, filters?: {
    dataType?: FinancialDataType;
    classification?: DataClassification;
    userId?: string;
    timeRange?: { from: number; to: number };
  }): DLPViolation[] {
    let violations = [...this.violations];
    
    if (filters) {
      if (filters.dataType) {
        violations = violations.filter(v => v.dataType === filters.dataType);
      }
      if (filters.classification) {
        violations = violations.filter(v => v.classification === filters.classification);
      }
      if (filters.userId) {
        violations = violations.filter(v => v.userId === filters.userId);
      }
      if (filters.timeRange) {
        violations = violations.filter(v => 
          v.timestamp >= filters.timeRange!.from && 
          v.timestamp <= filters.timeRange!.to
        );
      }
    }
    
    // Sort by timestamp (newest first)
    violations.sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? violations.slice(0, limit) : violations;
  }
  
  // Generate DLP report
  generateReport(timeRange?: { from: number; to: number }): {
    summary: {
      totalViolations: number;
      criticalViolations: number;
      blockedActions: number;
      topDataTypes: Array<{ dataType: FinancialDataType; count: number }>;
      topLocations: Array<{ location: string; count: number }>;
    };
    violations: DLPViolation[];
    trends: Array<{
      date: string;
      violations: number;
    }>;
  } {
    const violations = this.getViolations(undefined, { timeRange });
    
    // Count by data type
    const dataTypeCounts = new Map<FinancialDataType, number>();
    violations.forEach(v => {
      dataTypeCounts.set(v.dataType, (dataTypeCounts.get(v.dataType) || 0) + 1);
    });
    
    // Count by location
    const locationCounts = new Map<string, number>();
    violations.forEach(v => {
      locationCounts.set(v.location, (locationCounts.get(v.location) || 0) + 1);
    });
    
    const summary = {
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => 
        v.classification === DataClassification.TOP_SECRET ||
        v.classification === DataClassification.RESTRICTED
      ).length,
      blockedActions: violations.filter(v => v.action === 'block').length,
      topDataTypes: Array.from(dataTypeCounts.entries())
        .map(([dataType, count]) => ({ dataType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topLocations: Array.from(locationCounts.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
    
    // Generate trends (daily counts)
    const trends: Array<{ date: string; violations: number }> = [];
    const dailyCounts = new Map<string, number>();
    
    violations.forEach(v => {
      const date = new Date(v.timestamp).toISOString().split('T')[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });
    
    Array.from(dailyCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => {
        trends.push({ date, violations: count });
      });
    
    return { summary, violations, trends };
  }
  
  // Enable/disable DLP system
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.HIGH,
      { action: `DLP system ${enabled ? 'enabled' : 'disabled'}` }
    );
  }
  
  // Clear violations
  clearViolations(): void {
    this.violations = [];
  }
}

// Export singleton
export const dataLossPreventionSystem = DataLossPreventionSystem.getInstance();