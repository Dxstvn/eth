import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// KYC-specific audit action types
export enum KYCActionType {
  // Personal Information
  PERSONAL_INFO_VIEWED = 'KYC_PERSONAL_INFO_VIEWED',
  PERSONAL_INFO_UPDATED = 'KYC_PERSONAL_INFO_UPDATED',
  PERSONAL_INFO_SUBMITTED = 'KYC_PERSONAL_INFO_SUBMITTED',
  
  // Document Management
  DOCUMENT_UPLOADED = 'KYC_DOCUMENT_UPLOADED',
  DOCUMENT_VIEWED = 'KYC_DOCUMENT_VIEWED',
  DOCUMENT_DELETED = 'KYC_DOCUMENT_DELETED',
  DOCUMENT_VERIFIED = 'KYC_DOCUMENT_VERIFIED',
  
  // Risk Assessment
  RISK_ASSESSMENT_STARTED = 'KYC_RISK_ASSESSMENT_STARTED',
  RISK_ASSESSMENT_UPDATED = 'KYC_RISK_ASSESSMENT_UPDATED',
  RISK_ASSESSMENT_SUBMITTED = 'KYC_RISK_ASSESSMENT_SUBMITTED',
  
  // Status Changes
  KYC_STATUS_CHANGED = 'KYC_STATUS_CHANGED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  KYC_ADDITIONAL_INFO_REQUESTED = 'KYC_ADDITIONAL_INFO_REQUESTED',
  
  // Admin Actions
  KYC_ADMIN_REVIEW_STARTED = 'KYC_ADMIN_REVIEW_STARTED',
  KYC_ADMIN_REVIEW_COMPLETED = 'KYC_ADMIN_REVIEW_COMPLETED',
  KYC_ADMIN_OVERRIDE = 'KYC_ADMIN_OVERRIDE',
  
  // Security Events
  KYC_FAILED_AUTH_ATTEMPT = 'KYC_FAILED_AUTH_ATTEMPT',
  KYC_RATE_LIMIT_EXCEEDED = 'KYC_RATE_LIMIT_EXCEEDED',
  KYC_SUSPICIOUS_ACTIVITY = 'KYC_SUSPICIOUS_ACTIVITY',
  KYC_DATA_EXFILTRATION_ATTEMPT = 'KYC_DATA_EXFILTRATION_ATTEMPT',
  
  // Export and Report
  KYC_DATA_EXPORTED = 'KYC_DATA_EXPORTED',
  KYC_COMPLIANCE_REPORT_GENERATED = 'KYC_COMPLIANCE_REPORT_GENERATED',
  KYC_AUDIT_LOG_ACCESSED = 'KYC_AUDIT_LOG_ACCESSED',
}

// KYC Audit Entry interface
export interface KYCAuditEntry {
  id: string;
  timestamp: number;
  checksum: string;
  action: KYCActionType;
  userId: string;
  sessionId?: string;
  kycId?: string;
  details: {
    fieldName?: string;
    fieldType?: string;
    documentType?: string;
    fileName?: string;
    fileSize?: number;
    statusFrom?: string;
    statusTo?: string;
    reason?: string;
    riskScore?: string;
    [key: string]: any;
  };
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    deviceFingerprint?: string;
    requestId?: string;
  };
  compliance: {
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionPeriodDays: number;
    gdprCompliant: boolean;
    piiMasked: boolean;
  };
}

// Audit log export format
export interface KYCAuditExport {
  exportId: string;
  exportDate: string;
  exportedBy: string;
  filters: Record<string, any>;
  entries: KYCAuditEntry[];
  summary: {
    totalEntries: number;
    dateRange: {
      from: string;
      to: string;
    };
    actionCounts: Record<KYCActionType, number>;
  };
}

// KYC Audit Logger class
export class KYCAuditLogger {
  private static instance: KYCAuditLogger;
  private storageKey = 'kyc_audit_log';
  private retentionDays = 90; // Default retention period
  
  private constructor() {}
  
  static getInstance(): KYCAuditLogger {
    if (!KYCAuditLogger.instance) {
      KYCAuditLogger.instance = new KYCAuditLogger();
    }
    return KYCAuditLogger.instance;
  }
  
  // Generate checksum for audit entry integrity
  private generateChecksum(entry: Omit<KYCAuditEntry, 'checksum'>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      userId: entry.userId,
      details: entry.details,
      changes: entry.changes
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Mask PII data
  private maskPII(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const piiFields = [
      'ssn', 'socialSecurityNumber', 'taxId', 'ein',
      'dateOfBirth', 'dob', 'birthDate',
      'idNumber', 'passportNumber', 'driversLicense',
      'bankAccount', 'creditCard'
    ];
    
    const masked = { ...data };
    
    for (const key of Object.keys(masked)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field should be masked
      if (piiFields.some(field => lowerKey.includes(field))) {
        const value = String(masked[key]);
        masked[key] = value.length > 4 
          ? '*'.repeat(value.length - 4) + value.slice(-4)
          : '*'.repeat(value.length);
      }
      
      // Recursively mask nested objects
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskPII(masked[key]);
      }
    }
    
    return masked;
  }
  
  // Log KYC action
  log(
    action: KYCActionType,
    details: KYCAuditEntry['details'],
    options?: {
      kycId?: string;
      changes?: KYCAuditEntry['changes'];
      dataClassification?: KYCAuditEntry['compliance']['dataClassification'];
    }
  ): void {
    const entryWithoutChecksum: Omit<KYCAuditEntry, 'checksum'> = {
      id: uuidv4(),
      timestamp: Date.now(),
      action,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      kycId: options?.kycId,
      details: this.maskPII(details),
      changes: options?.changes ? {
        before: this.maskPII(options.changes.before),
        after: this.maskPII(options.changes.after)
      } : undefined,
      metadata: {
        ipAddress: this.getClientIp(),
        userAgent: this.getUserAgent(),
        location: this.getLocation(),
        deviceFingerprint: this.getDeviceFingerprint(),
        requestId: this.getRequestId()
      },
      compliance: {
        dataClassification: options?.dataClassification || 'confidential',
        retentionPeriodDays: this.retentionDays,
        gdprCompliant: true,
        piiMasked: true
      }
    };
    
    const entry: KYCAuditEntry = {
      ...entryWithoutChecksum,
      checksum: this.generateChecksum(entryWithoutChecksum)
    };
    
    // Store locally
    this.storeEntry(entry);
    
    // Send to remote service
    this.sendToRemote(entry);
    
    // Check for suspicious patterns
    this.checkSuspiciousPatterns(entry);
  }
  
  // Store audit entry
  private storeEntry(entry: KYCAuditEntry): void {
    try {
      const entries = this.getStoredEntries();
      entries.unshift(entry);
      
      // Apply retention policy
      const cutoffDate = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
      const retainedEntries = entries.filter(e => e.timestamp > cutoffDate);
      
      // Store with encryption
      if (typeof window !== 'undefined') {
        const encrypted = btoa(JSON.stringify(retainedEntries));
        localStorage.setItem(this.storageKey, encrypted);
      }
    } catch (error) {
      console.error('[SECURITY] Failed to store KYC audit entry:', error);
    }
  }
  
  // Get stored entries
  private getStoredEntries(): KYCAuditEntry[] {
    try {
      if (typeof window !== 'undefined') {
        const encrypted = localStorage.getItem(this.storageKey);
        if (encrypted) {
          const decrypted = atob(encrypted);
          return JSON.parse(decrypted);
        }
      }
    } catch (error) {
      console.error('[SECURITY] Failed to retrieve KYC audit entries:', error);
    }
    return [];
  }
  
  // Send to remote audit service
  private async sendToRemote(entry: KYCAuditEntry): Promise<void> {
    try {
      await fetch('/api/kyc/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('[SECURITY] Failed to send KYC audit to remote:', error);
    }
  }
  
  // Check for suspicious patterns
  private checkSuspiciousPatterns(entry: KYCAuditEntry): void {
    const recentEntries = this.getRecentEntries(5 * 60 * 1000); // Last 5 minutes
    const userEntries = recentEntries.filter(e => e.userId === entry.userId);
    
    // Multiple failed auth attempts
    const failedAuthAttempts = userEntries.filter(
      e => e.action === KYCActionType.KYC_FAILED_AUTH_ATTEMPT
    );
    if (failedAuthAttempts.length >= 3) {
      this.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
        reason: 'Multiple failed authentication attempts',
        count: failedAuthAttempts.length
      });
    }
    
    // Rapid document uploads
    const documentUploads = userEntries.filter(
      e => e.action === KYCActionType.DOCUMENT_UPLOADED
    );
    if (documentUploads.length >= 10) {
      this.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
        reason: 'Excessive document uploads',
        count: documentUploads.length
      });
    }
    
    // Data exfiltration patterns
    const dataAccess = userEntries.filter(
      e => [
        KYCActionType.PERSONAL_INFO_VIEWED,
        KYCActionType.DOCUMENT_VIEWED,
        KYCActionType.KYC_DATA_EXPORTED
      ].includes(e.action)
    );
    if (dataAccess.length >= 20) {
      this.log(KYCActionType.KYC_DATA_EXFILTRATION_ATTEMPT, {
        reason: 'Excessive data access patterns detected',
        accessCount: dataAccess.length
      });
    }
  }
  
  // Get recent entries
  private getRecentEntries(timeWindowMs: number): KYCAuditEntry[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.getStoredEntries().filter(e => e.timestamp > cutoff);
  }
  
  // Search audit logs
  search(filters: {
    userId?: string;
    kycId?: string;
    action?: KYCActionType | KYCActionType[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): KYCAuditEntry[] {
    let entries = this.getStoredEntries();
    
    // Apply filters
    if (filters.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }
    
    if (filters.kycId) {
      entries = entries.filter(e => e.kycId === filters.kycId);
    }
    
    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      entries = entries.filter(e => actions.includes(e.action));
    }
    
    if (filters.dateFrom) {
      entries = entries.filter(e => e.timestamp >= filters.dateFrom!.getTime());
    }
    
    if (filters.dateTo) {
      entries = entries.filter(e => e.timestamp <= filters.dateTo!.getTime());
    }
    
    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit
    if (filters.limit) {
      entries = entries.slice(0, filters.limit);
    }
    
    // Verify checksums
    return entries.filter(e => this.verifyChecksum(e));
  }
  
  // Verify entry checksum
  private verifyChecksum(entry: KYCAuditEntry): boolean {
    const { checksum, ...entryWithoutChecksum } = entry;
    const calculatedChecksum = this.generateChecksum(entryWithoutChecksum);
    return checksum === calculatedChecksum;
  }
  
  // Export audit logs
  async export(filters: Parameters<typeof this.search>[0], format: 'json' | 'csv' = 'json'): Promise<string> {
    const entries = this.search(filters);
    
    const exportData: KYCAuditExport = {
      exportId: uuidv4(),
      exportDate: new Date().toISOString(),
      exportedBy: this.getCurrentUserId(),
      filters,
      entries,
      summary: {
        totalEntries: entries.length,
        dateRange: {
          from: entries.length > 0 
            ? new Date(entries[entries.length - 1].timestamp).toISOString()
            : new Date().toISOString(),
          to: entries.length > 0 
            ? new Date(entries[0].timestamp).toISOString()
            : new Date().toISOString()
        },
        actionCounts: entries.reduce((acc, entry) => {
          acc[entry.action] = (acc[entry.action] || 0) + 1;
          return acc;
        }, {} as Record<KYCActionType, number>)
      }
    };
    
    // Log the export action
    this.log(KYCActionType.KYC_DATA_EXPORTED, {
      exportId: exportData.exportId,
      format,
      entryCount: entries.length,
      filters
    });
    
    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }
    
    return JSON.stringify(exportData, null, 2);
  }
  
  // Convert to CSV format
  private convertToCSV(exportData: KYCAuditExport): string {
    const headers = [
      'ID', 'Timestamp', 'Action', 'User ID', 'KYC ID',
      'Details', 'IP Address', 'User Agent', 'Checksum Valid'
    ];
    
    const rows = exportData.entries.map(entry => [
      entry.id,
      new Date(entry.timestamp).toISOString(),
      entry.action,
      entry.userId,
      entry.kycId || '',
      JSON.stringify(entry.details),
      entry.metadata.ipAddress || '',
      entry.metadata.userAgent || '',
      this.verifyChecksum(entry) ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  // Generate compliance report
  generateComplianceReport(dateRange: { from: Date; to: Date }): {
    totalActions: number;
    actionsByType: Record<KYCActionType, number>;
    userActivity: Array<{ userId: string; actionCount: number }>;
    securityEvents: number;
    dataExports: number;
    checksumFailures: number;
  } {
    const entries = this.search({
      dateFrom: dateRange.from,
      dateTo: dateRange.to
    });
    
    const userActionCounts = entries.reduce((acc, entry) => {
      acc[entry.userId] = (acc[entry.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const securityActions = [
      KYCActionType.KYC_FAILED_AUTH_ATTEMPT,
      KYCActionType.KYC_RATE_LIMIT_EXCEEDED,
      KYCActionType.KYC_SUSPICIOUS_ACTIVITY,
      KYCActionType.KYC_DATA_EXFILTRATION_ATTEMPT
    ];
    
    return {
      totalActions: entries.length,
      actionsByType: entries.reduce((acc, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      }, {} as Record<KYCActionType, number>),
      userActivity: Object.entries(userActionCounts)
        .map(([userId, count]) => ({ userId, actionCount: count }))
        .sort((a, b) => b.actionCount - a.actionCount)
        .slice(0, 10),
      securityEvents: entries.filter(e => securityActions.includes(e.action)).length,
      dataExports: entries.filter(e => e.action === KYCActionType.KYC_DATA_EXPORTED).length,
      checksumFailures: entries.filter(e => !this.verifyChecksum(e)).length
    };
  }
  
  // Helper methods
  private getCurrentUserId(): string {
    try {
      const authData = localStorage.getItem('clearhold_auth_token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId || 'anonymous';
      }
    } catch {}
    return 'anonymous';
  }
  
  private getCurrentSessionId(): string | undefined {
    try {
      const session = sessionStorage.getItem('clearhold_session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.id;
      }
    } catch {}
    return undefined;
  }
  
  private getClientIp(): string | undefined {
    // In production, this would come from server headers
    return undefined;
  }
  
  private getUserAgent(): string | undefined {
    return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  }
  
  private getLocation(): string | undefined {
    return typeof window !== 'undefined' ? window.location.href : undefined;
  }
  
  private getDeviceFingerprint(): string | undefined {
    // In production, use a library like FingerprintJS
    return undefined;
  }
  
  private getRequestId(): string | undefined {
    // In production, this would be a unique request ID from headers
    return uuidv4();
  }
}

// Global KYC audit logger instance
export const kycAuditLogger = KYCAuditLogger.getInstance();

// React hook for KYC audit logging
export function useKYCAuditLogger() {
  const log = (
    action: KYCActionType,
    details: KYCAuditEntry['details'],
    options?: Parameters<typeof kycAuditLogger.log>[2]
  ) => {
    kycAuditLogger.log(action, details, options);
  };
  
  const search = (filters: Parameters<typeof kycAuditLogger.search>[0]) => {
    return kycAuditLogger.search(filters);
  };
  
  const exportLogs = async (
    filters: Parameters<typeof kycAuditLogger.export>[0],
    format?: Parameters<typeof kycAuditLogger.export>[1]
  ) => {
    return kycAuditLogger.export(filters, format);
  };
  
  return { log, search, exportLogs };
}

// Convenience logging functions
export const kycAuditActions = {
  // Personal Information
  logPersonalInfoView: (kycId: string, fields?: string[]) => {
    kycAuditLogger.log(KYCActionType.PERSONAL_INFO_VIEWED, {
      fields: fields?.join(', ')
    }, { kycId });
  },
  
  logPersonalInfoUpdate: (kycId: string, fieldName: string, before: any, after: any) => {
    kycAuditLogger.log(KYCActionType.PERSONAL_INFO_UPDATED, {
      fieldName
    }, {
      kycId,
      changes: { before: { [fieldName]: before }, after: { [fieldName]: after } }
    });
  },
  
  // Documents
  logDocumentUpload: (kycId: string, documentType: string, fileName: string, fileSize: number) => {
    kycAuditLogger.log(KYCActionType.DOCUMENT_UPLOADED, {
      documentType,
      fileName,
      fileSize
    }, { kycId });
  },
  
  logDocumentDeletion: (kycId: string, documentType: string, fileName: string) => {
    kycAuditLogger.log(KYCActionType.DOCUMENT_DELETED, {
      documentType,
      fileName
    }, { kycId });
  },
  
  // Status Changes
  logStatusChange: (kycId: string, from: string, to: string, reason?: string) => {
    kycAuditLogger.log(KYCActionType.KYC_STATUS_CHANGED, {
      statusFrom: from,
      statusTo: to,
      reason
    }, { kycId });
  },
  
  // Security Events
  logFailedAuth: (reason: string) => {
    kycAuditLogger.log(KYCActionType.KYC_FAILED_AUTH_ATTEMPT, { reason });
  },
  
  logRateLimit: (operation: string) => {
    kycAuditLogger.log(KYCActionType.KYC_RATE_LIMIT_EXCEEDED, { operation });
  }
};