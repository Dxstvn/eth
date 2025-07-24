import { v4 as uuidv4 } from 'uuid';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { secureLocalStorage } from './secure-storage';

// Audit action types
export enum AuditActionType {
  // User management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // Transactions
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED = 'TRANSACTION_UPDATED',
  TRANSACTION_CANCELLED = 'TRANSACTION_CANCELLED',
  TRANSACTION_COMPLETED = 'TRANSACTION_COMPLETED',
  FUNDS_RELEASED = 'FUNDS_RELEASED',
  DISPUTE_RAISED = 'DISPUTE_RAISED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  
  // Wallets
  WALLET_CONNECTED = 'WALLET_CONNECTED',
  WALLET_DISCONNECTED = 'WALLET_DISCONNECTED',
  WALLET_REGISTERED = 'WALLET_REGISTERED',
  WALLET_REMOVED = 'WALLET_REMOVED',
  PRIMARY_WALLET_CHANGED = 'PRIMARY_WALLET_CHANGED',
  
  // Files and documents
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  
  // Contacts
  CONTACT_INVITED = 'CONTACT_INVITED',
  CONTACT_ACCEPTED = 'CONTACT_ACCEPTED',
  CONTACT_REJECTED = 'CONTACT_REJECTED',
  CONTACT_REMOVED = 'CONTACT_REMOVED',
  
  // System settings
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  NOTIFICATION_SETTINGS_CHANGED = 'NOTIFICATION_SETTINGS_CHANGED',
  PRIVACY_SETTINGS_CHANGED = 'PRIVACY_SETTINGS_CHANGED',
  
  // Security events
  SUSPICIOUS_ACTIVITY_DETECTED = 'SUSPICIOUS_ACTIVITY_DETECTED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  DATA_EXPORT = 'DATA_EXPORT',
  BULK_OPERATION = 'BULK_OPERATION',
}

// Audit entry interface
export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  sessionId?: string;
  action: AuditActionType;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Audit trail manager
export class AuditTrailManager {
  private static instance: AuditTrailManager;
  private storageKey = 'audit_trail';
  private maxLocalEntries = 1000;
  
  private constructor() {}
  
  static getInstance(): AuditTrailManager {
    if (!AuditTrailManager.instance) {
      AuditTrailManager.instance = new AuditTrailManager();
    }
    return AuditTrailManager.instance;
  }
  
  // Log an audit entry
  log(
    action: AuditActionType,
    resourceType: string,
    details: Record<string, any>,
    options?: {
      resourceId?: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): void {
    const entry: AuditEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      action,
      resourceType,
      resourceId: options?.resourceId,
      details,
      ipAddress: this.getClientIp(),
      userAgent: this.getUserAgent(),
      location: this.getLocation(),
      oldValues: options?.oldValues,
      newValues: options?.newValues,
      metadata: options?.metadata,
    };
    
    // Store locally
    this.storeLocal(entry);
    
    // Send to security logger
    this.logToSecuritySystem(entry);
    
    // Send to remote audit service
    this.sendToRemoteAudit(entry);
  }
  
  // Store audit entry locally
  private storeLocal(entry: AuditEntry): void {
    try {
      const existingEntries = secureLocalStorage.getItem<AuditEntry[]>(this.storageKey) || [];
      
      // Add new entry
      existingEntries.unshift(entry);
      
      // Keep only the most recent entries
      if (existingEntries.length > this.maxLocalEntries) {
        existingEntries.splice(this.maxLocalEntries);
      }
      
      secureLocalStorage.setItem(this.storageKey, existingEntries);
    } catch (error) {
      console.error('Failed to store audit entry locally:', error);
    }
  }
  
  // Log to security system
  private logToSecuritySystem(entry: AuditEntry): void {
    // Map audit actions to security event types
    const securityEventMap: Record<AuditActionType, SecurityEventType> = {
      [AuditActionType.USER_LOGIN]: SecurityEventType.LOGIN_SUCCESS,
      [AuditActionType.USER_LOGOUT]: SecurityEventType.LOGOUT,
      [AuditActionType.PASSWORD_CHANGED]: SecurityEventType.PASSWORD_CHANGED,
      [AuditActionType.SUSPICIOUS_ACTIVITY_DETECTED]: SecurityEventType.SUSPICIOUS_ACTIVITY,
      [AuditActionType.SECURITY_VIOLATION]: SecurityEventType.SUSPICIOUS_ACTIVITY,
      [AuditActionType.DATA_EXPORT]: SecurityEventType.DATA_EXPORT,
      // Default for other actions
      [AuditActionType.DOCUMENT_UPLOADED]: SecurityEventType.SENSITIVE_DATA_ACCESS,
    };
    
    const securityEventType = securityEventMap[entry.action] || SecurityEventType.SENSITIVE_DATA_ACCESS;
    const severity = this.getSeverityForAction(entry.action);
    
    securityLogger.log(securityEventType, severity, {
      auditId: entry.id,
      action: entry.action,
      resourceType: entry.resourceType,
      ...entry.details,
    });
  }
  
  // Send to remote audit service
  private async sendToRemoteAudit(entry: AuditEntry): Promise<void> {
    try {
      // In a real implementation, this would send to your audit service
      await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      console.error('Failed to send audit entry to remote service:', error);
    }
  }
  
  // Get severity level for action
  private getSeverityForAction(action: AuditActionType): SecurityEventSeverity {
    const highSeverityActions = [
      AuditActionType.USER_DELETED,
      AuditActionType.FUNDS_RELEASED,
      AuditActionType.DISPUTE_RAISED,
      AuditActionType.SUSPICIOUS_ACTIVITY_DETECTED,
      AuditActionType.SECURITY_VIOLATION,
      AuditActionType.DATA_EXPORT,
    ];
    
    const mediumSeverityActions = [
      AuditActionType.PASSWORD_CHANGED,
      AuditActionType.TRANSACTION_CANCELLED,
      AuditActionType.WALLET_REMOVED,
      AuditActionType.DOCUMENT_DELETED,
    ];
    
    if (highSeverityActions.includes(action)) {
      return SecurityEventSeverity.HIGH;
    } else if (mediumSeverityActions.includes(action)) {
      return SecurityEventSeverity.MEDIUM;
    } else {
      return SecurityEventSeverity.LOW;
    }
  }
  
  // Get audit entries
  getAuditEntries(
    filters?: {
      userId?: string;
      action?: AuditActionType;
      resourceType?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    }
  ): AuditEntry[] {
    try {
      let entries = secureLocalStorage.getItem<AuditEntry[]>(this.storageKey) || [];
      
      // Apply filters
      if (filters) {
        if (filters.userId) {
          entries = entries.filter(e => e.userId === filters.userId);
        }
        if (filters.action) {
          entries = entries.filter(e => e.action === filters.action);
        }
        if (filters.resourceType) {
          entries = entries.filter(e => e.resourceType === filters.resourceType);
        }
        if (filters.dateFrom) {
          entries = entries.filter(e => e.timestamp >= filters.dateFrom!.getTime());
        }
        if (filters.dateTo) {
          entries = entries.filter(e => e.timestamp <= filters.dateTo!.getTime());
        }
        if (filters.limit) {
          entries = entries.slice(0, filters.limit);
        }
      }
      
      return entries;
    } catch (error) {
      console.error('Failed to get audit entries:', error);
      return [];
    }
  }
  
  // Clear local audit entries
  clearLocalAuditEntries(): void {
    secureLocalStorage.removeItem(this.storageKey);
  }
  
  // Helper methods
  private getCurrentUserId(): string {
    try {
      const authData = localStorage.getItem('clearhold_auth_token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId || 'unknown';
      }
    } catch {}
    return 'unknown';
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
    return undefined; // Would be provided by server
  }
  
  private getUserAgent(): string | undefined {
    return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  }
  
  private getLocation(): string | undefined {
    return typeof window !== 'undefined' ? window.location.href : undefined;
  }
}

// Global audit trail manager
export const auditTrail = AuditTrailManager.getInstance();

// React hook for audit logging
export function useAuditTrail() {
  const log = React.useCallback(
    (
      action: AuditActionType,
      resourceType: string,
      details: Record<string, any>,
      options?: {
        resourceId?: string;
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        metadata?: Record<string, any>;
      }
    ) => {
      auditTrail.log(action, resourceType, details, options);
    },
    []
  );
  
  const getEntries = React.useCallback(
    (filters?: Parameters<typeof auditTrail.getAuditEntries>[0]) => {
      return auditTrail.getAuditEntries(filters);
    },
    []
  );
  
  return { log, getEntries };
}

// Convenience functions for common audit actions
export const auditActions = {
  // User actions
  logUserLogin: (userId: string, method: string) => {
    auditTrail.log(AuditActionType.USER_LOGIN, 'user', { method }, { resourceId: userId });
  },
  
  logUserLogout: (userId: string) => {
    auditTrail.log(AuditActionType.USER_LOGOUT, 'user', {}, { resourceId: userId });
  },
  
  logProfileUpdate: (userId: string, changes: Record<string, any>) => {
    auditTrail.log(AuditActionType.PROFILE_UPDATED, 'user', changes, { resourceId: userId });
  },
  
  // Transaction actions
  logTransactionCreated: (transactionId: string, amount: string, counterparty: string) => {
    auditTrail.log(
      AuditActionType.TRANSACTION_CREATED,
      'transaction',
      { amount, counterparty },
      { resourceId: transactionId }
    );
  },
  
  logTransactionCompleted: (transactionId: string, amount: string) => {
    auditTrail.log(
      AuditActionType.TRANSACTION_COMPLETED,
      'transaction',
      { amount },
      { resourceId: transactionId }
    );
  },
  
  logFundsReleased: (transactionId: string, amount: string, recipient: string) => {
    auditTrail.log(
      AuditActionType.FUNDS_RELEASED,
      'transaction',
      { amount, recipient },
      { resourceId: transactionId }
    );
  },
  
  // Document actions
  logDocumentUploaded: (documentId: string, fileName: string, size: number) => {
    auditTrail.log(
      AuditActionType.DOCUMENT_UPLOADED,
      'document',
      { fileName, size },
      { resourceId: documentId }
    );
  },
  
  logDocumentDeleted: (documentId: string, fileName: string) => {
    auditTrail.log(
      AuditActionType.DOCUMENT_DELETED,
      'document',
      { fileName },
      { resourceId: documentId }
    );
  },
  
  // Wallet actions
  logWalletConnected: (address: string, network: string) => {
    auditTrail.log(
      AuditActionType.WALLET_CONNECTED,
      'wallet',
      { address, network },
      { resourceId: address }
    );
  },
  
  logWalletRemoved: (address: string, network: string) => {
    auditTrail.log(
      AuditActionType.WALLET_REMOVED,
      'wallet',
      { address, network },
      { resourceId: address }
    );
  },
  
  // Security actions
  logSuspiciousActivity: (reason: string, details: Record<string, any>) => {
    auditTrail.log(
      AuditActionType.SUSPICIOUS_ACTIVITY_DETECTED,
      'security',
      { reason, ...details }
    );
  },
  
  logDataExport: (dataType: string, recordCount: number) => {
    auditTrail.log(
      AuditActionType.DATA_EXPORT,
      'data',
      { dataType, recordCount }
    );
  },
};

import React from 'react';