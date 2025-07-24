import { v4 as uuidv4 } from 'uuid';

// Security event types
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  
  // Authorization events
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_VIOLATION = 'PERMISSION_VIOLATION',
  
  // Security violations
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Data events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  
  // System events
  SECURITY_CONFIG_CHANGED = 'SECURITY_CONFIG_CHANGED',
  AUDIT_LOG_ACCESS = 'AUDIT_LOG_ACCESS',
  ERROR = 'ERROR',
}

// Security event severity levels
export enum SecurityEventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Security event interface
export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  stackTrace?: string;
}

// Security logger configuration
export interface SecurityLoggerConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

// Default configuration
const defaultConfig: SecurityLoggerConfig = {
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableRemoteLogging: true,
  remoteEndpoint: '/api/security/logs',
  bufferSize: 50,
  flushInterval: 30000, // 30 seconds
};

// Security logger class
export class SecurityLogger {
  private static instance: SecurityLogger;
  private config: SecurityLoggerConfig;
  private eventBuffer: SecurityEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  private constructor(config: Partial<SecurityLoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.startAutoFlush();
  }
  
  static getInstance(config?: Partial<SecurityLoggerConfig>): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger(config);
    }
    return SecurityLogger.instance;
  }
  
  // Log a security event
  log(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    details: Record<string, any>,
    error?: Error
  ): void {
    const event: SecurityEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      severity,
      details,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      ipAddress: this.getClientIp(),
      userAgent: this.getUserAgent(),
      stackTrace: error?.stack,
    };
    
    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(event);
    }
    
    // Add to buffer
    this.eventBuffer.push(event);
    
    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flush();
    }
    
    // For critical events, flush immediately
    if (severity === SecurityEventSeverity.CRITICAL) {
      this.flush();
    }
  }
  
  // Log specific event types
  logLogin(success: boolean, userId?: string, details?: Record<string, any>): void {
    this.log(
      success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      success ? SecurityEventSeverity.LOW : SecurityEventSeverity.MEDIUM,
      { userId, ...details }
    );
  }
  
  logAccessDenied(resource: string, userId?: string, reason?: string): void {
    this.log(
      SecurityEventType.ACCESS_DENIED,
      SecurityEventSeverity.MEDIUM,
      { resource, userId, reason }
    );
  }
  
  logRateLimit(operation: string, userId?: string): void {
    this.log(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventSeverity.MEDIUM,
      { operation, userId }
    );
  }
  
  logSecurityViolation(
    type: 'CSRF' | 'XSS' | 'SQL_INJECTION' | 'OTHER',
    details: Record<string, any>
  ): void {
    const eventType = {
      CSRF: SecurityEventType.CSRF_VIOLATION,
      XSS: SecurityEventType.XSS_ATTEMPT,
      SQL_INJECTION: SecurityEventType.SQL_INJECTION_ATTEMPT,
      OTHER: SecurityEventType.SUSPICIOUS_ACTIVITY,
    }[type];
    
    this.log(eventType, SecurityEventSeverity.HIGH, details);
  }
  
  logDataAccess(
    dataType: string,
    operation: 'READ' | 'WRITE' | 'DELETE',
    details: Record<string, any>
  ): void {
    this.log(
      operation === 'READ' 
        ? SecurityEventType.SENSITIVE_DATA_ACCESS 
        : SecurityEventType.DATA_MODIFICATION,
      SecurityEventSeverity.LOW,
      { dataType, operation, ...details }
    );
  }
  
  // Console logging
  private logToConsole(event: SecurityEvent): void {
    const style = {
      LOW: 'color: blue',
      MEDIUM: 'color: orange',
      HIGH: 'color: red',
      CRITICAL: 'color: red; font-weight: bold',
    }[event.severity];
    
    console.log(
      `%c[Security ${event.severity}] ${event.type}`,
      style,
      {
        timestamp: new Date(event.timestamp).toISOString(),
        ...event.details,
      }
    );
  }
  
  // Flush events to remote endpoint
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      try {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });
      } catch (error) {
        console.error('Failed to send security logs:', error);
        // Re-add events to buffer on failure
        this.eventBuffer.unshift(...events);
      }
    }
  }
  
  // Start auto-flush timer
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  // Helper methods
  private getCurrentUserId(): string | undefined {
    // Get from auth context or session
    try {
      const authData = localStorage.getItem('clearhold_auth_token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId;
      }
    } catch {}
    return undefined;
  }
  
  private getCurrentSessionId(): string | undefined {
    // Get from session storage
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
    // In a real app, this would come from server headers
    return undefined;
  }
  
  private getUserAgent(): string | undefined {
    return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  }
  
  // Clean up
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Global security logger instance
export const securityLogger = SecurityLogger.getInstance();

// React hook for security logging
export function useSecurityLogger() {
  const log = React.useCallback(
    (
      type: SecurityEventType,
      severity: SecurityEventSeverity,
      details: Record<string, any>
    ) => {
      securityLogger.log(type, severity, details);
    },
    []
  );
  
  const logLogin = React.useCallback(
    (success: boolean, userId?: string, details?: Record<string, any>) => {
      securityLogger.logLogin(success, userId, details);
    },
    []
  );
  
  const logAccessDenied = React.useCallback(
    (resource: string, userId?: string, reason?: string) => {
      securityLogger.logAccessDenied(resource, userId, reason);
    },
    []
  );
  
  const logSecurityViolation = React.useCallback(
    (type: 'CSRF' | 'XSS' | 'SQL_INJECTION' | 'OTHER', details: Record<string, any>) => {
      securityLogger.logSecurityViolation(type, details);
    },
    []
  );
  
  return {
    log,
    logLogin,
    logAccessDenied,
    logSecurityViolation,
  };
}

// Security monitoring dashboard data
export interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  eventsByType: Record<SecurityEventType, number>;
  recentEvents: SecurityEvent[];
}

// Get security metrics (for dashboard)
export async function getSecurityMetrics(
  timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<SecurityMetrics> {
  // In a real app, this would fetch from the backend
  // For now, return mock data
  return {
    totalEvents: 0,
    eventsBySeverity: {
      [SecurityEventSeverity.LOW]: 0,
      [SecurityEventSeverity.MEDIUM]: 0,
      [SecurityEventSeverity.HIGH]: 0,
      [SecurityEventSeverity.CRITICAL]: 0,
    },
    eventsByType: Object.values(SecurityEventType).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<SecurityEventType, number>
    ),
    recentEvents: [],
  };
}

import React from 'react';