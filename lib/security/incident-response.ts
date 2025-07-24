import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';
import { secureLocalStorage } from './secure-storage';

// Security incident types
export enum IncidentType {
  DATA_BREACH = 'DATA_BREACH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  MALWARE_DETECTED = 'MALWARE_DETECTED',
  PHISHING_ATTEMPT = 'PHISHING_ATTEMPT',
  BRUTE_FORCE_ATTACK = 'BRUTE_FORCE_ATTACK',
  SQL_INJECTION = 'SQL_INJECTION',
  XSS_ATTACK = 'XSS_ATTACK',
  CSRF_ATTACK = 'CSRF_ATTACK',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DENIAL_OF_SERVICE = 'DENIAL_OF_SERVICE',
  INSIDER_THREAT = 'INSIDER_THREAT',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SYSTEM_COMPROMISE = 'SYSTEM_COMPROMISE',
  OTHER = 'OTHER',
}

// Incident severity levels
export enum IncidentSeverity {
  CRITICAL = 'CRITICAL',   // System compromised, data breach
  HIGH = 'HIGH',          // Security controls bypassed
  MEDIUM = 'MEDIUM',      // Potential security issue
  LOW = 'LOW',           // Minor security event
  INFO = 'INFO',         // Informational
}

// Incident status
export enum IncidentStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  ERADICATED = 'ERADICATED',
  RECOVERED = 'RECOVERED',
  CLOSED = 'CLOSED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

// Security incident
export interface SecurityIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detectedAt: number;
  detectedBy: string; // User ID or system component
  affectedSystems: string[];
  affectedUsers: string[];
  indicators: Array<{
    type: string;
    value: string;
    source: string;
  }>;
  timeline: Array<{
    timestamp: number;
    action: string;
    actor: string;
    details: string;
  }>;
  containmentActions: string[];
  remediation: string[];
  lessonsLearned: string[];
  estimatedImpact: {
    usersAffected: number;
    dataExposed: string[];
    financialImpact?: number;
    reputationalImpact?: string;
  };
  assignedTo?: string;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

// Incident response playbook
export interface IncidentResponsePlaybook {
  id: string;
  name: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  steps: Array<{
    order: number;
    title: string;
    description: string;
    automated: boolean;
    estimatedTime: number; // minutes
    responsibleRole: string;
    actions: string[];
    checkpoints: string[];
  }>;
  escalationCriteria: string[];
  stakeholders: Array<{
    role: string;
    name: string;
    contact: string;
    escalationLevel: number;
  }>;
}

// Incident response system
export class IncidentResponseSystem {
  private static instance: IncidentResponseSystem;
  private incidents: Map<string, SecurityIncident> = new Map();
  private playbooks: Map<string, IncidentResponsePlaybook> = new Map();
  private storageKey = 'security_incidents';
  private notificationCallbacks: Array<(incident: SecurityIncident) => void> = [];
  
  private constructor() {
    this.initializeDefaultPlaybooks();
    this.loadIncidents();
  }
  
  static getInstance(): IncidentResponseSystem {
    if (!IncidentResponseSystem.instance) {
      IncidentResponseSystem.instance = new IncidentResponseSystem();
    }
    return IncidentResponseSystem.instance;
  }
  
  // Initialize default response playbooks
  private initializeDefaultPlaybooks(): void {
    const defaultPlaybooks: IncidentResponsePlaybook[] = [
      {
        id: 'data-breach-playbook',
        name: 'Data Breach Response',
        incidentType: IncidentType.DATA_BREACH,
        severity: IncidentSeverity.CRITICAL,
        steps: [
          {
            order: 1,
            title: 'Initial Assessment',
            description: 'Assess the scope and impact of the data breach',
            automated: false,
            estimatedTime: 30,
            responsibleRole: 'Security Team',
            actions: [
              'Identify what data was accessed',
              'Determine the attack vector',
              'Assess the number of affected users',
            ],
            checkpoints: [
              'Data types identified',
              'Attack vector documented',
              'Impact assessment completed',
            ],
          },
          {
            order: 2,
            title: 'Containment',
            description: 'Contain the breach to prevent further data loss',
            automated: true,
            estimatedTime: 15,
            responsibleRole: 'Security Team',
            actions: [
              'Isolate affected systems',
              'Revoke compromised credentials',
              'Block malicious IP addresses',
            ],
            checkpoints: [
              'Systems isolated',
              'Credentials revoked',
              'Access blocked',
            ],
          },
          {
            order: 3,
            title: 'Notification',
            description: 'Notify stakeholders and authorities',
            automated: false,
            estimatedTime: 60,
            responsibleRole: 'Legal Team',
            actions: [
              'Notify affected users',
              'Report to authorities (GDPR, etc.)',
              'Inform executives',
            ],
            checkpoints: [
              'Users notified',
              'Authorities contacted',
              'Executive briefing completed',
            ],
          },
          {
            order: 4,
            title: 'Recovery',
            description: 'Restore systems and services',
            automated: false,
            estimatedTime: 120,
            responsibleRole: 'DevOps Team',
            actions: [
              'Restore from clean backups',
              'Apply security patches',
              'Verify system integrity',
            ],
            checkpoints: [
              'Systems restored',
              'Patches applied',
              'Integrity verified',
            ],
          },
        ],
        escalationCriteria: [
          'More than 1000 users affected',
          'Financial data exposed',
          'Media attention received',
        ],
        stakeholders: [
          {
            role: 'CISO',
            name: 'Chief Information Security Officer',
            contact: 'ciso@clearhold.app',
            escalationLevel: 1,
          },
          {
            role: 'Legal',
            name: 'Legal Team Lead',
            contact: 'legal@clearhold.app',
            escalationLevel: 2,
          },
          {
            role: 'CEO',
            name: 'Chief Executive Officer',
            contact: 'ceo@clearhold.app',
            escalationLevel: 3,
          },
        ],
      },
      {
        id: 'brute-force-playbook',
        name: 'Brute Force Attack Response',
        incidentType: IncidentType.BRUTE_FORCE_ATTACK,
        severity: IncidentSeverity.MEDIUM,
        steps: [
          {
            order: 1,
            title: 'Detection Confirmation',
            description: 'Confirm brute force attack pattern',
            automated: true,
            estimatedTime: 5,
            responsibleRole: 'Security System',
            actions: [
              'Analyze login attempt patterns',
              'Identify source IP addresses',
              'Check for successful logins',
            ],
            checkpoints: [
              'Attack pattern confirmed',
              'Source IPs identified',
              'Account status checked',
            ],
          },
          {
            order: 2,
            title: 'Immediate Response',
            description: 'Block attack and protect accounts',
            automated: true,
            estimatedTime: 2,
            responsibleRole: 'Security System',
            actions: [
              'Block source IP addresses',
              'Lock targeted accounts',
              'Increase monitoring',
            ],
            checkpoints: [
              'IPs blocked',
              'Accounts secured',
              'Monitoring enhanced',
            ],
          },
          {
            order: 3,
            title: 'User Notification',
            description: 'Notify affected users',
            automated: true,
            estimatedTime: 10,
            responsibleRole: 'Security System',
            actions: [
              'Send security alert emails',
              'Recommend password changes',
              'Enable additional security measures',
            ],
            checkpoints: [
              'Users notified',
              'Recommendations sent',
              'Security enhanced',
            ],
          },
        ],
        escalationCriteria: [
          'Successful account compromise detected',
          'Attack persists despite countermeasures',
        ],
        stakeholders: [
          {
            role: 'Security Team',
            name: 'Security Operations',
            contact: 'security@clearhold.app',
            escalationLevel: 1,
          },
        ],
      },
    ];
    
    defaultPlaybooks.forEach(playbook => this.playbooks.set(playbook.id, playbook));
  }
  
  // Load incidents from storage
  private loadIncidents(): void {
    const storedIncidents = secureLocalStorage.getItem<Record<string, SecurityIncident>>(this.storageKey);
    if (storedIncidents) {
      Object.entries(storedIncidents).forEach(([id, incident]) => {
        this.incidents.set(id, incident);
      });
    }
  }
  
  // Save incidents to storage
  private saveIncidents(): void {
    const incidentsObject = Object.fromEntries(this.incidents.entries());
    secureLocalStorage.setItem(this.storageKey, incidentsObject);
  }
  
  // Create new security incident
  createIncident(
    type: IncidentType,
    severity: IncidentSeverity,
    title: string,
    description: string,
    detectedBy: string,
    metadata: Record<string, any> = {}
  ): SecurityIncident {
    const incidentId = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: SecurityIncident = {
      id: incidentId,
      type,
      severity,
      status: IncidentStatus.DETECTED,
      title,
      description,
      detectedAt: Date.now(),
      detectedBy,
      affectedSystems: [],
      affectedUsers: [],
      indicators: [],
      timeline: [{
        timestamp: Date.now(),
        action: 'Incident created',
        actor: detectedBy,
        details: 'Initial incident detection and creation',
      }],
      containmentActions: [],
      remediation: [],
      lessonsLearned: [],
      estimatedImpact: {
        usersAffected: 0,
        dataExposed: [],
      },
      metadata,
    };
    
    // Store incident
    this.incidents.set(incidentId, incident);
    this.saveIncidents();
    
    // Log security event
    securityLogger.log(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity === IncidentSeverity.CRITICAL ? SecurityEventSeverity.CRITICAL :
      severity === IncidentSeverity.HIGH ? SecurityEventSeverity.HIGH :
      SecurityEventSeverity.MEDIUM,
      {
        action: 'Security incident created',
        incidentId,
        type,
        severity,
        title,
      }
    );
    
    // Audit trail
    auditTrail.log(
      AuditActionType.SECURITY_VIOLATION,
      'security',
      { action: 'Security incident created', type, severity, title },
      { resourceId: incidentId }
    );
    
    // Notify stakeholders
    this.notifyStakeholders(incident);
    
    // Auto-execute playbook if available
    this.executePlaybook(incident);
    
    return incident;
  }
  
  // Update incident
  updateIncident(
    incidentId: string,
    updates: Partial<SecurityIncident>,
    actor: string
  ): SecurityIncident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;
    
    // Update incident
    Object.assign(incident, updates);
    
    // Add timeline entry
    incident.timeline.push({
      timestamp: Date.now(),
      action: 'Incident updated',
      actor,
      details: `Updated fields: ${Object.keys(updates).join(', ')}`,
    });
    
    // Save changes
    this.incidents.set(incidentId, incident);
    this.saveIncidents();
    
    return incident;
  }
  
  // Change incident status
  changeIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    actor: string,
    notes?: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    const oldStatus = incident.status;
    incident.status = status;
    
    // Add timeline entry
    incident.timeline.push({
      timestamp: Date.now(),
      action: `Status changed from ${oldStatus} to ${status}`,
      actor,
      details: notes || '',
    });
    
    // Set resolved timestamp for closed incidents
    if (status === IncidentStatus.CLOSED) {
      incident.resolvedAt = Date.now();
    }
    
    this.saveIncidents();
    
    securityLogger.log(
      SecurityEventType.AUDIT_LOG_ACCESS,
      SecurityEventSeverity.LOW,
      {
        action: 'Incident status changed',
        incidentId,
        oldStatus,
        newStatus: status,
        actor,
      }
    );
    
    return true;
  }
  
  // Add containment action
  addContainmentAction(
    incidentId: string,
    action: string,
    actor: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    incident.containmentActions.push(action);
    incident.timeline.push({
      timestamp: Date.now(),
      action: 'Containment action added',
      actor,
      details: action,
    });
    
    this.saveIncidents();
    return true;
  }
  
  // Execute incident response playbook
  private executePlaybook(incident: SecurityIncident): void {
    const playbookKey = `${incident.type.toLowerCase()}-playbook`;
    const playbook = this.playbooks.get(playbookKey);
    
    if (playbook && playbook.severity === incident.severity) {
      incident.timeline.push({
        timestamp: Date.now(),
        action: 'Playbook execution started',
        actor: 'System',
        details: `Executing ${playbook.name} playbook`,
      });
      
      // Execute automated steps
      playbook.steps
        .filter(step => step.automated)
        .forEach(step => {
          this.executeAutomatedStep(incident, step);
        });
    }
  }
  
  // Execute automated response step
  private executeAutomatedStep(
    incident: SecurityIncident,
    step: IncidentResponsePlaybook['steps'][0]
  ): void {
    try {
      // Simulate automated actions based on step type
      switch (incident.type) {
        case IncidentType.BRUTE_FORCE_ATTACK:
          if (step.title === 'Immediate Response') {
            // Simulate blocking IP and locking accounts
            incident.containmentActions.push('Automated IP blocking activated');
            incident.containmentActions.push('Affected accounts temporarily locked');
          }
          break;
          
        case IncidentType.XSS_ATTACK:
          if (step.title === 'Input Sanitization') {
            incident.containmentActions.push('Enhanced input validation activated');
          }
          break;
          
        default:
          break;
      }
      
      incident.timeline.push({
        timestamp: Date.now(),
        action: `Automated step executed: ${step.title}`,
        actor: 'System',
        details: step.description,
      });
      
    } catch (error) {
      incident.timeline.push({
        timestamp: Date.now(),
        action: `Automated step failed: ${step.title}`,
        actor: 'System',
        details: (error as Error).message,
      });
    }
  }
  
  // Notify stakeholders
  private notifyStakeholders(incident: SecurityIncident): void {
    // Notify registered callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(incident);
      } catch (error) {
        console.error('Error in incident notification callback:', error);
      }
    });
    
    // High severity incidents trigger immediate notifications
    if (incident.severity === IncidentSeverity.CRITICAL || 
        incident.severity === IncidentSeverity.HIGH) {
      console.warn(`[SECURITY INCIDENT] ${incident.severity}: ${incident.title}`);
    }
  }
  
  // Register notification callback
  onIncident(callback: (incident: SecurityIncident) => void): void {
    this.notificationCallbacks.push(callback);
  }
  
  // Get incident by ID
  getIncident(incidentId: string): SecurityIncident | null {
    return this.incidents.get(incidentId) || null;
  }
  
  // Get all incidents
  getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .sort((a, b) => b.detectedAt - a.detectedAt);
  }
  
  // Get incidents by status
  getIncidentsByStatus(status: IncidentStatus): SecurityIncident[] {
    return this.getAllIncidents().filter(incident => incident.status === status);
  }
  
  // Get incidents by severity
  getIncidentsBySeverity(severity: IncidentSeverity): SecurityIncident[] {
    return this.getAllIncidents().filter(incident => incident.severity === severity);
  }
  
  // Get incidents by type
  getIncidentsByType(type: IncidentType): SecurityIncident[] {
    return this.getAllIncidents().filter(incident => incident.type === type);
  }
  
  // Get open incidents
  getOpenIncidents(): SecurityIncident[] {
    return this.getAllIncidents().filter(incident => 
      incident.status !== IncidentStatus.CLOSED && 
      incident.status !== IncidentStatus.FALSE_POSITIVE
    );
  }
  
  // Generate incident report
  generateIncidentReport(timeRange?: { from: number; to: number }): {
    summary: {
      totalIncidents: number;
      openIncidents: number;
      closedIncidents: number;
      criticalIncidents: number;
      avgResolutionTime: number;
    };
    incidents: SecurityIncident[];
    trends: Array<{
      type: IncidentType;
      count: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  } {
    let incidents = this.getAllIncidents();
    
    if (timeRange) {
      incidents = incidents.filter(incident => 
        incident.detectedAt >= timeRange.from && 
        incident.detectedAt <= timeRange.to
      );
    }
    
    const openIncidents = incidents.filter(i => 
      i.status !== IncidentStatus.CLOSED && 
      i.status !== IncidentStatus.FALSE_POSITIVE
    );
    
    const closedIncidents = incidents.filter(i => i.status === IncidentStatus.CLOSED);
    
    const criticalIncidents = incidents.filter(i => i.severity === IncidentSeverity.CRITICAL);
    
    // Calculate average resolution time
    const resolvedIncidents = closedIncidents.filter(i => i.resolvedAt);
    const avgResolutionTime = resolvedIncidents.length > 0 
      ? resolvedIncidents.reduce((sum, i) => sum + (i.resolvedAt! - i.detectedAt), 0) / resolvedIncidents.length
      : 0;
    
    // Calculate trends (simplified)
    const typeCounts = new Map<IncidentType, number>();
    incidents.forEach(incident => {
      typeCounts.set(incident.type, (typeCounts.get(incident.type) || 0) + 1);
    });
    
    const trends = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      count,
      trend: 'stable' as const, // Would need historical data for real trend analysis
    }));
    
    return {
      summary: {
        totalIncidents: incidents.length,
        openIncidents: openIncidents.length,
        closedIncidents: closedIncidents.length,
        criticalIncidents: criticalIncidents.length,
        avgResolutionTime: Math.round(avgResolutionTime),
      },
      incidents,
      trends,
    };
  }
  
  // Get playbooks
  getAllPlaybooks(): IncidentResponsePlaybook[] {
    return Array.from(this.playbooks.values());
  }
  
  // Add custom playbook
  addPlaybook(playbook: IncidentResponsePlaybook): void {
    this.playbooks.set(playbook.id, playbook);
  }
}

// Export singleton
export const incidentResponseSystem = IncidentResponseSystem.getInstance();