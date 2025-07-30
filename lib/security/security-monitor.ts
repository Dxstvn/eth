import { EventEmitter } from 'events';

/**
 * Security Monitoring and Alerting System
 * 
 * Monitors and alerts on:
 * 1. Failed login attempts
 * 2. Suspicious API activity
 * 3. Token theft attempts
 * 4. Rate limit violations
 * 5. CSRF attempts
 * 6. XSS attempts
 * 7. SQL injection attempts
 * 8. Unauthorized access attempts
 */

export enum SecurityEventType {
  // Authentication events
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGOUT = 'LOGOUT',
  TOKEN_THEFT_DETECTED = 'TOKEN_THEFT_DETECTED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  
  // Authorization events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  
  // Security violations
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  
  // API security
  INVALID_API_KEY = 'INVALID_API_KEY',
  HMAC_VERIFICATION_FAILED = 'HMAC_VERIFICATION_FAILED',
  SUSPICIOUS_REQUEST_PATTERN = 'SUSPICIOUS_REQUEST_PATTERN',
  
  // Data security
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT_ATTEMPT = 'DATA_EXPORT_ATTEMPT',
  
  // System events
  SECURITY_CONFIG_CHANGED = 'SECURITY_CONFIG_CHANGED',
  SUSPICIOUS_USER_AGENT = 'SUSPICIOUS_USER_AGENT',
  GEO_ANOMALY_DETECTED = 'GEO_ANOMALY_DETECTED'
}

export enum SecurityEventSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  details: Record<string, any>;
  stackTrace?: string;
}

export interface SecurityAlert {
  eventId: string;
  message: string;
  severity: SecurityEventSeverity;
  actionRequired: boolean;
  suggestedActions?: string[];
}

class SecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = []
  private alerts: SecurityAlert[] = []
  private blockedIPs = new Set<string>()
  private suspiciousPatterns = new Map<string, number>()
  private alertThresholds: Record<SecurityEventType, { count: number; window: number }> = {
    [SecurityEventType.LOGIN_FAILED]: { count: 3, window: 15 * 60 * 1000 }, // 3 in 15 minutes
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: { count: 5, window: 5 * 60 * 1000 }, // 5 in 5 minutes
    [SecurityEventType.UNAUTHORIZED_ACCESS]: { count: 5, window: 30 * 60 * 1000 }, // 5 in 30 minutes
    [SecurityEventType.XSS_ATTEMPT]: { count: 1, window: 0 }, // Alert immediately
    [SecurityEventType.SQL_INJECTION_ATTEMPT]: { count: 1, window: 0 }, // Alert immediately
    [SecurityEventType.TOKEN_THEFT_DETECTED]: { count: 1, window: 0 }, // Alert immediately
    [SecurityEventType.CSRF_ATTEMPT]: { count: 1, window: 0 }, // Alert immediately
    [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: { count: 1, window: 0 }, // Alert immediately
  }

  private static instance: SecurityMonitor

  private constructor() {
    super()
    this.setupEventHandlers()
    this.startCleanupInterval()
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }

    this.events.push(fullEvent)
    this.emit('security-event', fullEvent)

    // Check if this event should trigger an alert
    this.checkAlertThreshold(fullEvent)

    // Check for patterns
    this.analyzePatterns(fullEvent)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY ${fullEvent.severity}] ${fullEvent.type}:`, fullEvent.details)
    }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(fullEvent)
    }
  }

  /**
   * Log a failed login attempt
   */
  logFailedLogin(userId: string | undefined, ipAddress: string, reason: string): void {
    this.logEvent({
      type: SecurityEventType.LOGIN_FAILED,
      severity: SecurityEventSeverity.MEDIUM,
      userId,
      ipAddress,
      details: { reason }
    })
  }

  /**
   * Log successful login
   */
  logSuccessfulLogin(userId: string, ipAddress: string, method: string): void {
    this.logEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: SecurityEventSeverity.INFO,
      userId,
      ipAddress,
      details: { method }
    })
  }

  /**
   * Log rate limit violation
   */
  logRateLimitExceeded(ipAddress: string, endpoint: string, limit: number): void {
    this.logEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecurityEventSeverity.LOW,
      ipAddress,
      endpoint,
      details: { limit }
    })
  }

  /**
   * Log potential XSS attempt
   */
  logXSSAttempt(userId: string | undefined, ipAddress: string, payload: string, location: string): void {
    this.logEvent({
      type: SecurityEventType.XSS_ATTEMPT,
      severity: SecurityEventSeverity.HIGH,
      userId,
      ipAddress,
      details: { payload, location }
    })
  }

  /**
   * Log potential SQL injection attempt
   */
  logSQLInjectionAttempt(userId: string | undefined, ipAddress: string, query: string, endpoint: string): void {
    this.logEvent({
      type: SecurityEventType.SQL_INJECTION_ATTEMPT,
      severity: SecurityEventSeverity.CRITICAL,
      userId,
      ipAddress,
      endpoint,
      details: { query }
    })
  }

  /**
   * Check if an event should trigger an alert
   */
  private checkAlertThreshold(event: SecurityEvent): void {
    const threshold = this.alertThresholds[event.type]
    if (!threshold) return

    // Immediate alert events
    if (threshold.window === 0) {
      this.createAlert(event, `Security incident detected: ${event.type}`)
      return
    }

    // Count recent events of same type
    const recentEvents = this.events.filter(e => 
      e.type === event.type &&
      e.timestamp.getTime() > Date.now() - threshold.window &&
      (event.userId ? e.userId === event.userId : e.ipAddress === event.ipAddress)
    )

    if (recentEvents.length >= threshold.count) {
      this.createAlert(
        event,
        `Multiple ${event.type} events detected: ${recentEvents.length} in ${threshold.window / 60000} minutes`
      )
    }
  }

  /**
   * Create a security alert
   */
  private createAlert(event: SecurityEvent, message: string): void {
    const alert: SecurityAlert = {
      eventId: event.id,
      message,
      severity: event.severity,
      actionRequired: event.severity === SecurityEventSeverity.HIGH || 
                     event.severity === SecurityEventSeverity.CRITICAL,
      suggestedActions: this.getSuggestedActions(event)
    }

    this.alerts.push(alert)
    this.emit('security-alert', alert)

    // Send notifications based on severity
    if (alert.actionRequired) {
      this.sendUrgentNotification(alert)
    }
  }

  /**
   * Get suggested actions for an event type
   */
  private getSuggestedActions(event: SecurityEvent): string[] {
    const actions: Record<SecurityEventType, string[]> = {
      [SecurityEventType.LOGIN_FAILED]: [
        'Monitor for continued attempts',
        'Consider temporary IP block if pattern continues'
      ],
      [SecurityEventType.TOKEN_THEFT_DETECTED]: [
        'Revoke all user tokens immediately',
        'Force user to re-authenticate',
        'Review recent account activity'
      ],
      [SecurityEventType.XSS_ATTEMPT]: [
        'Review and patch vulnerable endpoint',
        'Check for data compromise',
        'Update input validation'
      ],
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: [
        'Block IP address',
        'Review database query construction',
        'Check for data access'
      ],
      [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: [
        'Review user permissions',
        'Audit recent permission changes',
        'Check for compromised accounts'
      ],
      // Add more as needed
    } as const

    return actions[event.type] || ['Review security logs', 'Monitor for continued activity']
  }

  /**
   * Analyze patterns in security events
   */
  private analyzePatterns(event: SecurityEvent): void {
    const key = `${event.type}-${event.ipAddress || event.userId}`
    const count = (this.suspiciousPatterns.get(key) || 0) + 1
    this.suspiciousPatterns.set(key, count)

    // Detect brute force patterns
    if (event.type === SecurityEventType.LOGIN_FAILED && count > 10) {
      this.logEvent({
        type: SecurityEventType.SUSPICIOUS_REQUEST_PATTERN,
        severity: SecurityEventSeverity.HIGH,
        ipAddress: event.ipAddress,
        userId: event.userId,
        details: { pattern: 'Potential brute force attack', attempts: count }
      })
    }

    // Detect scanning patterns
    const recentEndpoints = this.events
      .filter(e => e.ipAddress === event.ipAddress && e.timestamp.getTime() > Date.now() - 60000)
      .map(e => e.endpoint)
      .filter(Boolean)

    if (new Set(recentEndpoints).size > 20) {
      this.logEvent({
        type: SecurityEventType.SUSPICIOUS_REQUEST_PATTERN,
        severity: SecurityEventSeverity.MEDIUM,
        ipAddress: event.ipAddress,
        details: { pattern: 'Potential endpoint scanning', endpointsHit: new Set(recentEndpoints).size }
      })
    }
  }

  /**
   * Send urgent notification
   */
  private sendUrgentNotification(alert: SecurityAlert): void {
    // In production, this would:
    // 1. Send email to security team
    // 2. Send SMS for critical alerts
    // 3. Post to Slack/Discord security channel
    // 4. Create PagerDuty incident
    
    console.error('[SECURITY ALERT]', alert)
  }

  /**
   * Send event to logging service
   */
  private sendToLoggingService(event: SecurityEvent): void {
    // In production, send to:
    // - Elasticsearch/Logstash
    // - Splunk
    // - CloudWatch
    // - Custom logging service
    
    // For now, we'll store in memory
  }

  /**
   * Get security metrics
   */
  getMetrics(timeWindow: number = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topIPs: Array<{ ip: string; count: number }>;
    alertCount: number;
  } {
    const cutoff = Date.now() - timeWindow
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > cutoff)

    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const ipCounts: Record<string, number> = {}

    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      if (event.ipAddress) {
        ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1
      }
    })

    const topIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }))

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topIPs,
      alertCount: this.alerts.filter(a => 
        this.events.find(e => e.id === a.eventId)?.timestamp.getTime() || 0 > cutoff
      ).length
    }
  }

  /**
   * Block an IP address
   */
  blockIP(ipAddress: string, duration: number = 24 * 60 * 60 * 1000): void {
    this.blockedIPs.add(ipAddress)
    
    this.logEvent({
      type: SecurityEventType.ACCOUNT_BLOCKED,
      severity: SecurityEventSeverity.HIGH,
      ipAddress,
      details: { duration, reason: 'Manual block' }
    })

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress)
    }, duration)
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress)
  }

  /**
   * Export security report
   */
  exportReport(startDate: Date, endDate: Date): string {
    const relevantEvents = this.events.filter(e => 
      e.timestamp >= startDate && e.timestamp <= endDate
    )

    const report = {
      period: { start: startDate, end: endDate },
      summary: this.getMetrics(endDate.getTime() - startDate.getTime()),
      events: relevantEvents,
      alerts: this.alerts.filter(a => {
        const event = this.events.find(e => e.id === a.eventId)
        return event && event.timestamp >= startDate && event.timestamp <= endDate
      })
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Log all security events
    this.on('security-event', (event: SecurityEvent) => {
      // Additional processing can be added here
    })

    // Handle alerts
    this.on('security-alert', (alert: SecurityAlert) => {
      // Additional alert handling
    })
  }

  /**
   * Cleanup old events
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
      this.events = this.events.filter(e => e.timestamp.getTime() > cutoff)
      this.alerts = this.alerts.filter(a => {
        const event = this.events.find(e => e.id === a.eventId)
        return event && event.timestamp.getTime() > cutoff
      })
    }, 60 * 60 * 1000) // Every hour
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance()

// Export helper functions for common logging
export const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => 
  securityMonitor.logEvent(event)

export const logFailedLogin = (userId: string | undefined, ipAddress: string, reason: string) =>
  securityMonitor.logFailedLogin(userId, ipAddress, reason)

export const logRateLimitExceeded = (ipAddress: string, endpoint: string, limit: number) =>
  securityMonitor.logRateLimitExceeded(ipAddress, endpoint, limit)