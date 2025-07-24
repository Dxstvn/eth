import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';
import { incidentResponseSystem, IncidentType, IncidentSeverity } from './incident-response';
import { secureLocalStorage } from './secure-storage';

// Monitoring event types
export enum MonitoringEventType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_ACCESS = 'DATA_ACCESS',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  USER_ACTIVITY = 'USER_ACTIVITY',
  NETWORK_ACTIVITY = 'NETWORK_ACTIVITY',
  FILE_INTEGRITY = 'FILE_INTEGRITY',
}

// Alert severity levels
export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

// Alert status
export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  SUPPRESSED = 'SUPPRESSED',
}

// Monitoring rule
export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  eventType: MonitoringEventType;
  severity: AlertSeverity;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'regex';
    value: any;
  }>;
  threshold: {
    count: number;
    timeWindow: number; // minutes
  };
  enabled: boolean;
  suppressDuplicates: boolean;
  suppressionWindow: number; // minutes
  notifications: NotificationChannel[];
  actions: AlertAction[];
  createdAt: number;
  updatedAt: number;
}

// Security alert
export interface SecurityAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  eventType: MonitoringEventType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  details: Record<string, any>;
  triggeredAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  suppressedUntil?: number;
  occurrenceCount: number;
  lastOccurrence: number;
  affectedResources: string[];
  metadata: Record<string, any>;
}

// Notification channels
export interface NotificationChannel {
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'in-app';
  target: string;
  enabled: boolean;
  severityFilter: AlertSeverity[];
}

// Alert actions
export interface AlertAction {
  type: 'block_ip' | 'lock_account' | 'create_incident' | 'send_notification' | 'execute_script';
  parameters: Record<string, any>;
  automated: boolean;
}

// System metrics
export interface SystemMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  storage: number;
  networkIn: number;
  networkOut: number;
  activeUsers: number;
  failedLogins: number;
  successfulLogins: number;
  apiRequests: number;
  errorRate: number;
  responseTime: number;
}

// Security dashboard data
export interface SecurityDashboard {
  activeAlerts: number;
  criticalAlerts: number;
  resolvedAlertsToday: number;
  securityScore: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  recentIncidents: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  metrics: SystemMetrics;
  topThreats: Array<{
    threat: string;
    count: number;
    severity: AlertSeverity;
  }>;
}

// Security monitoring and alerting system
export class SecurityMonitoringSystem {
  private static instance: SecurityMonitoringSystem;
  private rules: Map<string, MonitoringRule> = new Map();
  private alerts: Map<string, SecurityAlert> = new Map();
  private metrics: SystemMetrics[] = [];
  private eventBuffer: Array<{
    type: MonitoringEventType;
    data: any;
    timestamp: number;
  }> = [];
  private isMonitoring: boolean = false;
  private metricsCollectionInterval?: NodeJS.Timeout;
  private ruleProcessingInterval?: NodeJS.Timeout;
  private storagePrefix = 'security_monitoring_';
  
  private constructor() {
    this.loadStoredData();
    this.initializeDefaultRules();
    this.startMonitoring();
  }
  
  static getInstance(): SecurityMonitoringSystem {
    if (!SecurityMonitoringSystem.instance) {
      SecurityMonitoringSystem.instance = new SecurityMonitoringSystem();
    }
    return SecurityMonitoringSystem.instance;
  }
  
  // Load stored monitoring data
  private loadStoredData(): void {
    const rules = secureLocalStorage.getItem<Record<string, MonitoringRule>>(`${this.storagePrefix}rules`);
    if (rules) {
      Object.entries(rules).forEach(([id, rule]) => {
        this.rules.set(id, rule);
      });
    }
    
    const alerts = secureLocalStorage.getItem<Record<string, SecurityAlert>>(`${this.storagePrefix}alerts`);
    if (alerts) {
      Object.entries(alerts).forEach(([id, alert]) => {
        this.alerts.set(id, alert);
      });
    }
    
    const metrics = secureLocalStorage.getItem<SystemMetrics[]>(`${this.storagePrefix}metrics`);
    if (metrics) {
      this.metrics = metrics;
    }
  }
  
  // Initialize default monitoring rules
  private initializeDefaultRules(): void {
    const defaultRules: MonitoringRule[] = [
      {
        id: 'failed-login-attempts',
        name: 'Failed Login Attempts',
        description: 'Monitor for excessive failed login attempts',
        eventType: MonitoringEventType.AUTHENTICATION,
        severity: AlertSeverity.HIGH,
        conditions: [
          { field: 'success', operator: 'equals', value: false },
        ],
        threshold: { count: 5, timeWindow: 15 },
        enabled: true,
        suppressDuplicates: true,
        suppressionWindow: 60,
        notifications: [
          { type: 'in-app', target: 'security', enabled: true, severityFilter: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] }
        ],
        actions: [
          { type: 'lock_account', parameters: { duration: 30 }, automated: true },
          { type: 'block_ip', parameters: { duration: 60 }, automated: true }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'unauthorized-access',
        name: 'Unauthorized Access Attempts',
        description: 'Detect unauthorized access to restricted resources',
        eventType: MonitoringEventType.AUTHORIZATION,
        severity: AlertSeverity.CRITICAL,
        conditions: [
          { field: 'authorized', operator: 'equals', value: false },
          { field: 'resource', operator: 'contains', value: 'admin' }
        ],
        threshold: { count: 1, timeWindow: 5 },
        enabled: true,
        suppressDuplicates: false,
        suppressionWindow: 0,
        notifications: [
          { type: 'in-app', target: 'security', enabled: true, severityFilter: [AlertSeverity.CRITICAL] }
        ],
        actions: [
          { type: 'create_incident', parameters: { type: 'UNAUTHORIZED_ACCESS' }, automated: true }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'suspicious-data-access',
        name: 'Suspicious Data Access Pattern',
        description: 'Monitor for unusual data access patterns',
        eventType: MonitoringEventType.DATA_ACCESS,
        severity: AlertSeverity.MEDIUM,
        conditions: [
          { field: 'recordCount', operator: 'greater', value: 1000 },
        ],
        threshold: { count: 1, timeWindow: 10 },
        enabled: true,
        suppressDuplicates: true,
        suppressionWindow: 120,
        notifications: [
          { type: 'in-app', target: 'security', enabled: true, severityFilter: [AlertSeverity.MEDIUM, AlertSeverity.HIGH] }
        ],
        actions: [
          { type: 'send_notification', parameters: { channel: 'security-team' }, automated: true }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'system-performance-degradation',
        name: 'System Performance Degradation',
        description: 'Alert when system performance degrades significantly',
        eventType: MonitoringEventType.PERFORMANCE,
        severity: AlertSeverity.MEDIUM,
        conditions: [
          { field: 'responseTime', operator: 'greater', value: 2000 }, // 2 seconds
        ],
        threshold: { count: 10, timeWindow: 5 },
        enabled: true,
        suppressDuplicates: true,
        suppressionWindow: 30,
        notifications: [
          { type: 'in-app', target: 'operations', enabled: true, severityFilter: [AlertSeverity.MEDIUM, AlertSeverity.HIGH] }
        ],
        actions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'security-violation',
        name: 'Security Policy Violation',
        description: 'Alert on any security policy violations',
        eventType: MonitoringEventType.SECURITY_VIOLATION,
        severity: AlertSeverity.HIGH,
        conditions: [
          { field: 'violation', operator: 'equals', value: true },
        ],
        threshold: { count: 1, timeWindow: 1 },
        enabled: true,
        suppressDuplicates: false,
        suppressionWindow: 0,
        notifications: [
          { type: 'in-app', target: 'security', enabled: true, severityFilter: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] }
        ],
        actions: [
          { type: 'create_incident', parameters: { type: 'SECURITY_VIOLATION' }, automated: true }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];
    
    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
    this.saveRules();
  }
  
  // Start monitoring system
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Start metrics collection
    this.metricsCollectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
    
    // Start rule processing
    this.ruleProcessingInterval = setInterval(() => {
      this.processRules();
    }, 30000); // Every 30 seconds
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      { action: 'Security monitoring started' }
    );
  }
  
  // Stop monitoring system
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    
    if (this.ruleProcessingInterval) {
      clearInterval(this.ruleProcessingInterval);
    }
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      { action: 'Security monitoring stopped' }
    );
  }
  
  // Log monitoring event
  logEvent(type: MonitoringEventType, data: any): void {
    const event = {
      type,
      data,
      timestamp: Date.now(),
    };
    
    this.eventBuffer.push(event);
    
    // Keep buffer size manageable
    if (this.eventBuffer.length > 1000) {
      this.eventBuffer = this.eventBuffer.slice(-500);
    }
    
    // Process event immediately for critical events
    if (type === MonitoringEventType.SECURITY_VIOLATION) {
      this.processEventAgainstRules(event);
    }
  }
  
  // Collect system metrics
  private collectSystemMetrics(): void {
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      storage: this.getStorageUsage(),
      networkIn: this.getNetworkIn(),
      networkOut: this.getNetworkOut(),
      activeUsers: this.getActiveUsers(),
      failedLogins: this.getFailedLogins(),
      successfulLogins: this.getSuccessfulLogins(),
      apiRequests: this.getAPIRequests(),
      errorRate: this.getErrorRate(),
      responseTime: this.getAverageResponseTime(),
    };
    
    this.metrics.push(metrics);
    
    // Keep only last 1440 entries (24 hours of minute-by-minute data)
    if (this.metrics.length > 1440) {
      this.metrics = this.metrics.slice(-1440);
    }
    
    this.saveMetrics();
    
    // Check metrics against thresholds
    this.checkMetricThresholds(metrics);
  }
  
  // Simplified metric collection (in production, these would collect real metrics)
  private getCPUUsage(): number {
    return Math.random() * 100;
  }
  
  private getMemoryUsage(): number {
    return Math.random() * 100;
  }
  
  private getStorageUsage(): number {
    return Math.random() * 100;
  }
  
  private getNetworkIn(): number {
    return Math.random() * 1000;
  }
  
  private getNetworkOut(): number {
    return Math.random() * 1000;
  }
  
  private getActiveUsers(): number {
    return Math.floor(Math.random() * 100);
  }
  
  private getFailedLogins(): number {
    return Math.floor(Math.random() * 10);
  }
  
  private getSuccessfulLogins(): number {
    return Math.floor(Math.random() * 50);
  }
  
  private getAPIRequests(): number {
    return Math.floor(Math.random() * 1000);
  }
  
  private getErrorRate(): number {
    return Math.random() * 5;
  }
  
  private getAverageResponseTime(): number {
    return 200 + Math.random() * 1000;
  }
  
  // Check metrics against thresholds
  private checkMetricThresholds(metrics: SystemMetrics): void {
    // CPU usage alert
    if (metrics.cpu > 90) {
      this.logEvent(MonitoringEventType.SYSTEM_HEALTH, {
        metric: 'cpu',
        value: metrics.cpu,
        threshold: 90,
      });
    }
    
    // Memory usage alert
    if (metrics.memory > 85) {
      this.logEvent(MonitoringEventType.SYSTEM_HEALTH, {
        metric: 'memory',
        value: metrics.memory,
        threshold: 85,
      });
    }
    
    // Response time alert
    if (metrics.responseTime > 2000) {
      this.logEvent(MonitoringEventType.PERFORMANCE, {
        metric: 'responseTime',
        value: metrics.responseTime,
        threshold: 2000,
      });
    }
    
    // Error rate alert
    if (metrics.errorRate > 5) {
      this.logEvent(MonitoringEventType.SYSTEM_HEALTH, {
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: 5,
      });
    }
  }
  
  // Process monitoring rules
  private processRules(): void {
    this.rules.forEach(rule => {
      if (!rule.enabled) return;
      
      const relevantEvents = this.getRelevantEvents(rule);
      const matchingEvents = this.filterEventsByConditions(relevantEvents, rule.conditions);
      
      if (matchingEvents.length >= rule.threshold.count) {
        this.triggerAlert(rule, matchingEvents);
      }
    });
  }
  
  // Process single event against rules
  private processEventAgainstRules(event: any): void {
    this.rules.forEach(rule => {
      if (!rule.enabled || rule.eventType !== event.type) return;
      
      if (this.eventMatchesConditions(event, rule.conditions)) {
        this.triggerAlert(rule, [event]);
      }
    });
  }
  
  // Get relevant events for rule
  private getRelevantEvents(rule: MonitoringRule): any[] {
    const timeWindow = rule.threshold.timeWindow * 60 * 1000; // Convert to milliseconds
    const cutoff = Date.now() - timeWindow;
    
    return this.eventBuffer.filter(event => 
      event.type === rule.eventType && 
      event.timestamp >= cutoff
    );
  }
  
  // Filter events by conditions
  private filterEventsByConditions(events: any[], conditions: MonitoringRule['conditions']): any[] {
    return events.filter(event => this.eventMatchesConditions(event, conditions));
  }
  
  // Check if event matches rule conditions
  private eventMatchesConditions(event: any, conditions: MonitoringRule['conditions']): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(event.data, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'greater':
          return Number(fieldValue) > Number(condition.value);
        case 'less':
          return Number(fieldValue) < Number(condition.value);
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        default:
          return false;
      }
    });
  }
  
  // Get field value from nested object
  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((curr, key) => curr?.[key], obj);
  }
  
  // Trigger security alert
  private triggerAlert(rule: MonitoringRule, matchingEvents: any[]): void {
    // Check for suppression
    if (rule.suppressDuplicates) {
      const existingAlert = Array.from(this.alerts.values()).find(alert => 
        alert.ruleId === rule.id && 
        alert.status === AlertStatus.ACTIVE &&
        (!alert.suppressedUntil || alert.suppressedUntil > Date.now())
      );
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.occurrenceCount++;
        existingAlert.lastOccurrence = Date.now();
        this.saveAlerts();
        return;
      }
    }
    
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SecurityAlert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      eventType: rule.eventType,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      title: rule.name,
      description: rule.description,
      details: {
        eventCount: matchingEvents.length,
        timeWindow: rule.threshold.timeWindow,
        events: matchingEvents.slice(0, 5), // Include first 5 events
      },
      triggeredAt: Date.now(),
      occurrenceCount: 1,
      lastOccurrence: Date.now(),
      affectedResources: this.extractAffectedResources(matchingEvents),
      metadata: {
        ruleThreshold: rule.threshold,
        conditions: rule.conditions,
      },
    };
    
    // Set suppression if enabled
    if (rule.suppressDuplicates && rule.suppressionWindow > 0) {
      alert.suppressedUntil = Date.now() + (rule.suppressionWindow * 60 * 1000);
    }
    
    this.alerts.set(alertId, alert);
    this.saveAlerts();
    
    // Execute alert actions
    this.executeAlertActions(alert, rule.actions);
    
    // Send notifications
    this.sendNotifications(alert, rule.notifications);
    
    // Log alert
    securityLogger.log(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      alert.severity === AlertSeverity.CRITICAL ? SecurityEventSeverity.CRITICAL :
      alert.severity === AlertSeverity.HIGH ? SecurityEventSeverity.HIGH :
      SecurityEventSeverity.MEDIUM,
      {
        action: 'Security alert triggered',
        alertId,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: alert.severity,
        eventCount: matchingEvents.length,
      }
    );
    
    auditTrail.log(
      AuditActionType.SECURITY_VIOLATION,
      'monitoring',
      {
        action: 'Security alert triggered',
        ruleId: rule.id,
        severity: alert.severity,
        eventCount: matchingEvents.length,
      },
      { resourceId: alertId }
    );
  }
  
  // Extract affected resources from events
  private extractAffectedResources(events: any[]): string[] {
    const resources = new Set<string>();
    
    events.forEach(event => {
      if (event.data.userId) resources.add(`user:${event.data.userId}`);
      if (event.data.resource) resources.add(`resource:${event.data.resource}`);
      if (event.data.ip) resources.add(`ip:${event.data.ip}`);
    });
    
    return Array.from(resources);
  }
  
  // Execute alert actions
  private executeAlertActions(alert: SecurityAlert, actions: AlertAction[]): void {
    actions.forEach(action => {
      if (!action.automated) return;
      
      try {
        switch (action.type) {
          case 'create_incident':
            incidentResponseSystem.createIncident(
              action.parameters.type || IncidentType.OTHER,
              alert.severity === AlertSeverity.CRITICAL ? IncidentSeverity.CRITICAL :
              alert.severity === AlertSeverity.HIGH ? IncidentSeverity.HIGH :
              IncidentSeverity.MEDIUM,
              alert.title,
              alert.description,
              'Security Monitoring System',
              { alertId: alert.id }
            );
            break;
            
          case 'block_ip':
            // Would implement IP blocking
            console.log(`[Action] Blocking IP for ${action.parameters.duration} minutes`);
            break;
            
          case 'lock_account':
            // Would implement account locking
            console.log(`[Action] Locking account for ${action.parameters.duration} minutes`);
            break;
            
          case 'send_notification':
            // Would send notification
            console.log(`[Action] Sending notification to ${action.parameters.channel}`);
            break;
            
          default:
            console.log(`[Action] Unknown action type: ${action.type}`);
        }
      } catch (error) {
        securityLogger.log(
          SecurityEventType.ERROR,
          SecurityEventSeverity.MEDIUM,
          {
            action: 'Alert action execution failed',
            alertId: alert.id,
            actionType: action.type,
            error: (error as Error).message,
          }
        );
      }
    });
  }
  
  // Send notifications
  private sendNotifications(alert: SecurityAlert, channels: NotificationChannel[]): void {
    channels.forEach(channel => {
      if (!channel.enabled) return;
      if (!channel.severityFilter.includes(alert.severity)) return;
      
      try {
        switch (channel.type) {
          case 'in-app':
            this.sendInAppNotification(alert, channel.target);
            break;
          case 'email':
            // Would send email
            console.log(`[Notification] Sending email to ${channel.target}`);
            break;
          case 'sms':
            // Would send SMS
            console.log(`[Notification] Sending SMS to ${channel.target}`);
            break;
          case 'slack':
            // Would send Slack message
            console.log(`[Notification] Sending Slack message to ${channel.target}`);
            break;
          case 'webhook':
            // Would call webhook
            console.log(`[Notification] Calling webhook ${channel.target}`);
            break;
        }
      } catch (error) {
        securityLogger.log(
          SecurityEventType.ERROR,
          SecurityEventSeverity.LOW,
          {
            action: 'Notification sending failed',
            alertId: alert.id,
            channel: channel.type,
            error: (error as Error).message,
          }
        );
      }
    });
  }
  
  // Send in-app notification
  private sendInAppNotification(alert: SecurityAlert, target: string): void {
    console.warn(`[SECURITY ALERT - ${target.toUpperCase()}] ${alert.severity}: ${alert.title}`);
    console.log(`Description: ${alert.description}`);
    console.log(`Triggered: ${new Date(alert.triggeredAt).toLocaleString()}`);
  }
  
  // Acknowledge alert
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== AlertStatus.ACTIVE) return false;
    
    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    
    this.saveAlerts();
    
    securityLogger.log(
      SecurityEventType.AUDIT_LOG_ACCESS,
      SecurityEventSeverity.LOW,
      {
        action: 'Alert acknowledged',
        alertId,
        acknowledgedBy,
      }
    );
    
    return true;
  }
  
  // Resolve alert
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;
    
    this.saveAlerts();
    
    securityLogger.log(
      SecurityEventType.AUDIT_LOG_ACCESS,
      SecurityEventSeverity.LOW,
      {
        action: 'Alert resolved',
        alertId,
        resolvedBy,
      }
    );
    
    return true;
  }
  
  // Get all alerts
  getAllAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.triggeredAt - a.triggeredAt);
  }
  
  // Get active alerts
  getActiveAlerts(): SecurityAlert[] {
    return this.getAllAlerts().filter(alert => alert.status === AlertStatus.ACTIVE);
  }
  
  // Get alerts by severity
  getAlertsBySeverity(severity: AlertSeverity): SecurityAlert[] {
    return this.getAllAlerts().filter(alert => alert.severity === severity);
  }
  
  // Generate security dashboard
  generateDashboard(): SecurityDashboard {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const resolvedToday = this.getAllAlerts().filter(a => 
      a.status === AlertStatus.RESOLVED && a.resolvedAt && a.resolvedAt >= todayStart.getTime()
    );
    
    // Calculate security score (simplified)
    const securityScore = Math.max(0, 100 - (criticalAlerts.length * 20) - (activeAlerts.length * 5));
    
    // Determine threat level
    let threatLevel: SecurityDashboard['threatLevel'] = 'low';
    if (criticalAlerts.length > 0) threatLevel = 'critical';
    else if (activeAlerts.filter(a => a.severity === AlertSeverity.HIGH).length > 0) threatLevel = 'high';
    else if (activeAlerts.length > 5) threatLevel = 'medium';
    
    // System health
    const latestMetrics = this.metrics[this.metrics.length - 1];
    let systemHealth: SecurityDashboard['systemHealth'] = 'healthy';
    if (latestMetrics) {
      if (latestMetrics.cpu > 90 || latestMetrics.memory > 90 || latestMetrics.errorRate > 10) {
        systemHealth = 'critical';
      } else if (latestMetrics.cpu > 70 || latestMetrics.memory > 70 || latestMetrics.errorRate > 5) {
        systemHealth = 'warning';
      }
    }
    
    // Top threats
    const threatCounts = new Map<string, { count: number; severity: AlertSeverity }>();
    activeAlerts.forEach(alert => {
      const key = alert.ruleName;
      const existing = threatCounts.get(key);
      if (existing) {
        existing.count++;
        if (alert.severity === AlertSeverity.CRITICAL) existing.severity = AlertSeverity.CRITICAL;
        else if (alert.severity === AlertSeverity.HIGH && existing.severity !== AlertSeverity.CRITICAL) {
          existing.severity = AlertSeverity.HIGH;
        }
      } else {
        threatCounts.set(key, { count: 1, severity: alert.severity });
      }
    });
    
    const topThreats = Array.from(threatCounts.entries())
      .map(([threat, data]) => ({ threat, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      resolvedAlertsToday: resolvedToday.length,
      securityScore,
      threatLevel,
      recentIncidents: 0, // Would count from incident system
      systemHealth,
      metrics: latestMetrics || {
        timestamp: Date.now(),
        cpu: 0, memory: 0, storage: 0, networkIn: 0, networkOut: 0,
        activeUsers: 0, failedLogins: 0, successfulLogins: 0,
        apiRequests: 0, errorRate: 0, responseTime: 0
      },
      topThreats,
    };
  }
  
  // Add monitoring rule
  addRule(rule: MonitoringRule): void {
    this.rules.set(rule.id, rule);
    this.saveRules();
  }
  
  // Update monitoring rule
  updateRule(ruleId: string, updates: Partial<MonitoringRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    
    Object.assign(rule, updates);
    rule.updatedAt = Date.now();
    
    this.saveRules();
    return true;
  }
  
  // Delete monitoring rule
  deleteRule(ruleId: string): boolean {
    const result = this.rules.delete(ruleId);
    if (result) this.saveRules();
    return result;
  }
  
  // Get all rules
  getAllRules(): MonitoringRule[] {
    return Array.from(this.rules.values());
  }
  
  // Get system metrics
  getSystemMetrics(limit?: number): SystemMetrics[] {
    return limit ? this.metrics.slice(-limit) : this.metrics;
  }
  
  // Save methods
  private saveRules(): void {
    const rulesObject = Object.fromEntries(this.rules.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}rules`, rulesObject);
  }
  
  private saveAlerts(): void {
    const alertsObject = Object.fromEntries(this.alerts.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}alerts`, alertsObject);
  }
  
  private saveMetrics(): void {
    secureLocalStorage.setItem(`${this.storagePrefix}metrics`, this.metrics);
  }
}

// Export singleton
export const securityMonitoringSystem = SecurityMonitoringSystem.getInstance();