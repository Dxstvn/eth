import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';
import { secureLocalStorage } from './secure-storage';
import { dataLossPreventionSystem, DataClassification, FinancialDataType } from './data-loss-prevention';

// Privacy regulation compliance
export enum PrivacyRegulation {
  GDPR = 'GDPR',         // General Data Protection Regulation (EU)
  CCPA = 'CCPA',         // California Consumer Privacy Act (US)
  PIPEDA = 'PIPEDA',     // Personal Information Protection and Electronic Documents Act (Canada)
  LGPD = 'LGPD',         // Lei Geral de Proteção de Dados (Brazil)
  PDPA = 'PDPA',         // Personal Data Protection Act (Singapore)
}

// Personal data categories under GDPR
export enum PersonalDataCategory {
  BASIC_IDENTITY = 'BASIC_IDENTITY',         // Name, address, phone
  IDENTIFIERS = 'IDENTIFIERS',               // Email, username, IP address
  FINANCIAL = 'FINANCIAL',                   // Bank details, payment info
  BIOMETRIC = 'BIOMETRIC',                   // Fingerprints, facial recognition
  LOCATION = 'LOCATION',                     // GPS coordinates, addresses
  ONLINE_ACTIVITY = 'ONLINE_ACTIVITY',       // Cookies, browsing history
  SPECIAL_CATEGORY = 'SPECIAL_CATEGORY',     // Health, race, religion, etc.
  PROFESSIONAL = 'PROFESSIONAL',             // Employment, education
  BEHAVIORAL = 'BEHAVIORAL',                 // Preferences, patterns
}

// Legal basis for processing under GDPR
export enum LegalBasis {
  CONSENT = 'CONSENT',                       // Article 6(1)(a)
  CONTRACT = 'CONTRACT',                     // Article 6(1)(b)
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',     // Article 6(1)(c)
  VITAL_INTERESTS = 'VITAL_INTERESTS',       // Article 6(1)(d)
  PUBLIC_TASK = 'PUBLIC_TASK',               // Article 6(1)(e)
  LEGITIMATE_INTERESTS = 'LEGITIMATE_INTERESTS', // Article 6(1)(f)
}

// Data processing activity
export interface DataProcessingActivity {
  id: string;
  purpose: string;
  legalBasis: LegalBasis;
  dataCategories: PersonalDataCategory[];
  dataSubjects: string[];
  retention: {
    period: number; // days
    criteria: string;
  };
  recipients: string[];
  thirdCountryTransfers: boolean;
  safeguards: string[];
  createdAt: number;
  updatedAt: number;
}

// Consent record
export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  dataCategories: PersonalDataCategory[];
  givenAt: number;
  withdrawnAt?: number;
  method: 'explicit' | 'implicit' | 'opt-in' | 'pre-checked';
  ipAddress: string;
  userAgent: string;
  version: string; // Consent version
  active: boolean;
  metadata: Record<string, any>;
}

// Data subject rights under GDPR
export enum DataSubjectRight {
  ACCESS = 'ACCESS',                         // Article 15
  RECTIFICATION = 'RECTIFICATION',           // Article 16
  ERASURE = 'ERASURE',                       // Article 17 (Right to be forgotten)
  RESTRICT_PROCESSING = 'RESTRICT_PROCESSING', // Article 18
  DATA_PORTABILITY = 'DATA_PORTABILITY',     // Article 20
  OBJECT = 'OBJECT',                         // Article 21
  WITHDRAW_CONSENT = 'WITHDRAW_CONSENT',     // Article 7(3)
  COMPLAIN = 'COMPLAIN',                     // Article 77
}

// Data subject request
export interface DataSubjectRequest {
  id: string;
  userId: string;
  right: DataSubjectRight;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  description: string;
  submittedAt: number;
  processedAt?: number;
  responseData?: any;
  rejectionReason?: string;
  deadline: number; // 30 days from submission
  metadata: Record<string, any>;
}

// Privacy impact assessment
export interface PrivacyImpactAssessment {
  id: string;
  activity: string;
  description: string;
  dataCategories: PersonalDataCategory[];
  riskLevel: 'low' | 'medium' | 'high';
  risks: Array<{
    description: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  safeguards: string[];
  consultationRequired: boolean;
  assessedBy: string;
  assessedAt: number;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: number;
}

// Privacy Protection Manager
export class PrivacyProtectionManager {
  private static instance: PrivacyProtectionManager;
  private storagePrefix = 'privacy_';
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private processingActivities: Map<string, DataProcessingActivity> = new Map();
  private dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();
  private privacyAssessments: Map<string, PrivacyImpactAssessment> = new Map();
  
  private constructor() {
    this.loadStoredData();
    this.initializeDefaultProcessingActivities();
  }
  
  static getInstance(): PrivacyProtectionManager {
    if (!PrivacyProtectionManager.instance) {
      PrivacyProtectionManager.instance = new PrivacyProtectionManager();
    }
    return PrivacyProtectionManager.instance;
  }
  
  // Load stored privacy data
  private loadStoredData(): void {
    const consent = secureLocalStorage.getItem<Record<string, ConsentRecord[]>>(`${this.storagePrefix}consent`);
    if (consent) {
      Object.entries(consent).forEach(([userId, records]) => {
        this.consentRecords.set(userId, records);
      });
    }
    
    const activities = secureLocalStorage.getItem<Record<string, DataProcessingActivity>>(`${this.storagePrefix}activities`);
    if (activities) {
      Object.entries(activities).forEach(([id, activity]) => {
        this.processingActivities.set(id, activity);
      });
    }
    
    const requests = secureLocalStorage.getItem<Record<string, DataSubjectRequest>>(`${this.storagePrefix}requests`);
    if (requests) {
      Object.entries(requests).forEach(([id, request]) => {
        this.dataSubjectRequests.set(id, request);
      });
    }
  }
  
  // Initialize default processing activities
  private initializeDefaultProcessingActivities(): void {
    const defaultActivities: DataProcessingActivity[] = [
      {
        id: 'user-registration',
        purpose: 'User account creation and management',
        legalBasis: LegalBasis.CONTRACT,
        dataCategories: [
          PersonalDataCategory.BASIC_IDENTITY,
          PersonalDataCategory.IDENTIFIERS,
        ],
        dataSubjects: ['customers', 'users'],
        retention: {
          period: 2555, // 7 years
          criteria: 'Account closure + 7 years for legal compliance',
        },
        recipients: ['internal staff', 'hosting providers'],
        thirdCountryTransfers: false,
        safeguards: ['encryption', 'access controls', 'audit logs'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'transaction-processing',
        purpose: 'Processing escrow transactions and payments',
        legalBasis: LegalBasis.CONTRACT,
        dataCategories: [
          PersonalDataCategory.FINANCIAL,
          PersonalDataCategory.BASIC_IDENTITY,
          PersonalDataCategory.PROFESSIONAL,
        ],
        dataSubjects: ['customers', 'transaction parties'],
        retention: {
          period: 2555, // 7 years
          criteria: 'Transaction completion + 7 years for regulatory compliance',
        },
        recipients: ['payment processors', 'regulatory authorities', 'auditors'],
        thirdCountryTransfers: true,
        safeguards: ['encryption', 'pseudonymization', 'contractual clauses'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'kyc-verification',
        purpose: 'Know Your Customer and Anti-Money Laundering compliance',
        legalBasis: LegalBasis.LEGAL_OBLIGATION,
        dataCategories: [
          PersonalDataCategory.IDENTIFIERS,
          PersonalDataCategory.FINANCIAL,
          PersonalDataCategory.BIOMETRIC,
        ],
        dataSubjects: ['customers requiring verification'],
        retention: {
          period: 1825, // 5 years
          criteria: 'Verification completion + 5 years for AML compliance',
        },
        recipients: ['KYC providers', 'regulatory authorities'],
        thirdCountryTransfers: true,
        safeguards: ['encryption', 'access controls', 'audit logs', 'contractual clauses'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    
    defaultActivities.forEach(activity => {
      this.processingActivities.set(activity.id, activity);
    });
    
    this.saveProcessingActivities();
  }
  
  // Record user consent
  recordConsent(
    userId: string,
    purpose: string,
    dataCategories: PersonalDataCategory[],
    method: ConsentRecord['method'] = 'explicit',
    metadata: Record<string, any> = {}
  ): ConsentRecord {
    const consent: ConsentRecord = {
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      purpose,
      dataCategories,
      givenAt: Date.now(),
      method,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      version: '1.0',
      active: true,
      metadata,
    };
    
    const userConsents = this.consentRecords.get(userId) || [];
    
    // Deactivate previous consent for the same purpose
    userConsents.forEach(existing => {
      if (existing.purpose === purpose && existing.active) {
        existing.active = false;
      }
    });
    
    userConsents.push(consent);
    this.consentRecords.set(userId, userConsents);
    this.saveConsentRecords();
    
    // Log consent event
    securityLogger.log(
      SecurityEventType.SENSITIVE_DATA_ACCESS,
      SecurityEventSeverity.LOW,
      {
        action: 'Consent recorded',
        userId,
        purpose,
        method,
        dataCategories,
      }
    );
    
    auditTrail.log(
      AuditActionType.PROFILE_UPDATED,
      'privacy',
      { action: 'Consent given', purpose, method },
      { resourceId: consent.id }
    );
    
    return consent;
  }
  
  // Withdraw consent
  withdrawConsent(userId: string, consentId: string): boolean {
    const userConsents = this.consentRecords.get(userId);
    if (!userConsents) return false;
    
    const consent = userConsents.find(c => c.id === consentId);
    if (!consent || !consent.active) return false;
    
    consent.active = false;
    consent.withdrawnAt = Date.now();
    
    this.saveConsentRecords();
    
    // Log withdrawal
    securityLogger.log(
      SecurityEventType.SENSITIVE_DATA_ACCESS,
      SecurityEventSeverity.MEDIUM,
      {
        action: 'Consent withdrawn',
        userId,
        consentId,
        purpose: consent.purpose,
      }
    );
    
    auditTrail.log(
      AuditActionType.PROFILE_UPDATED,
      'privacy',
      { action: 'Consent withdrawn', purpose: consent.purpose },
      { resourceId: consentId }
    );
    
    return true;
  }
  
  // Check if user has valid consent for purpose
  hasValidConsent(userId: string, purpose: string): boolean {
    const userConsents = this.consentRecords.get(userId) || [];
    return userConsents.some(consent => 
      consent.purpose === purpose && 
      consent.active && 
      !consent.withdrawnAt
    );
  }
  
  // Get user consent records
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }
  
  // Submit data subject request
  submitDataSubjectRequest(
    userId: string,
    right: DataSubjectRight,
    description: string,
    metadata: Record<string, any> = {}
  ): DataSubjectRequest {
    const requestId = `dsr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const deadline = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    
    const request: DataSubjectRequest = {
      id: requestId,
      userId,
      right,
      status: 'pending',
      description,
      submittedAt: Date.now(),
      deadline,
      metadata,
    };
    
    this.dataSubjectRequests.set(requestId, request);
    this.saveDataSubjectRequests();
    
    // Log request
    securityLogger.log(
      SecurityEventType.DATA_EXPORT,
      SecurityEventSeverity.MEDIUM,
      {
        action: 'Data subject request submitted',
        userId,
        right,
        requestId,
      }
    );
    
    auditTrail.log(
      AuditActionType.DATA_EXPORT,
      'privacy',
      { action: 'Data subject request', right, description },
      { resourceId: requestId }
    );
    
    // Auto-process some requests
    this.autoProcessRequest(request);
    
    return request;
  }
  
  // Auto-process certain data subject requests
  private async autoProcessRequest(request: DataSubjectRequest): Promise<void> {
    switch (request.right) {
      case DataSubjectRight.ACCESS:
        await this.processAccessRequest(request);
        break;
      case DataSubjectRight.DATA_PORTABILITY:
        await this.processPortabilityRequest(request);
        break;
      case DataSubjectRight.WITHDRAW_CONSENT:
        await this.processConsentWithdrawal(request);
        break;
      default:
        // Manual processing required
        break;
    }
  }
  
  // Process access request (Article 15)
  private async processAccessRequest(request: DataSubjectRequest): Promise<void> {
    try {
      const userData = await this.extractUserData(request.userId);
      
      request.status = 'completed';
      request.processedAt = Date.now();
      request.responseData = {
        personalData: userData,
        processingActivities: this.getProcessingActivitiesForUser(request.userId),
        consents: this.getUserConsents(request.userId),
        retentionPeriods: this.getRetentionInfo(request.userId),
      };
      
      this.dataSubjectRequests.set(request.id, request);
      this.saveDataSubjectRequests();
      
    } catch (error) {
      request.status = 'rejected';
      request.processedAt = Date.now();
      request.rejectionReason = 'Failed to extract user data';
      this.dataSubjectRequests.set(request.id, request);
      this.saveDataSubjectRequests();
    }
  }
  
  // Process data portability request (Article 20)
  private async processPortabilityRequest(request: DataSubjectRequest): Promise<void> {
    try {
      const userData = await this.extractUserData(request.userId);
      const portableData = this.formatForPortability(userData);
      
      request.status = 'completed';
      request.processedAt = Date.now();
      request.responseData = {
        format: 'JSON',
        data: portableData,
        downloadUrl: this.generateSecureDownloadUrl(request.id, portableData),
      };
      
      this.dataSubjectRequests.set(request.id, request);
      this.saveDataSubjectRequests();
      
    } catch (error) {
      request.status = 'rejected';
      request.processedAt = Date.now();
      request.rejectionReason = 'Failed to prepare portable data';
      this.dataSubjectRequests.set(request.id, request);
      this.saveDataSubjectRequests();
    }
  }
  
  // Process consent withdrawal
  private async processConsentWithdrawal(request: DataSubjectRequest): Promise<void> {
    const userConsents = this.getUserConsents(request.userId);
    const activeConsents = userConsents.filter(c => c.active);
    
    // Withdraw all active consents
    activeConsents.forEach(consent => {
      this.withdrawConsent(request.userId, consent.id);
    });
    
    request.status = 'completed';
    request.processedAt = Date.now();
    request.responseData = {
      withdrawnConsents: activeConsents.length,
    };
    
    this.dataSubjectRequests.set(request.id, request);
    this.saveDataSubjectRequests();
  }
  
  // Extract user data for access/portability requests
  private async extractUserData(userId: string): Promise<any> {
    // In a real implementation, this would extract data from all systems
    const userData = {
      profile: {
        userId,
        // Extract from user profile storage
      },
      transactions: {
        // Extract transaction data
      },
      consents: this.getUserConsents(userId),
      // Add other data categories
    };
    
    return userData;
  }
  
  // Format data for portability
  private formatForPortability(userData: any): any {
    return {
      exportedAt: new Date().toISOString(),
      format: 'JSON',
      regulation: 'GDPR Article 20',
      data: userData,
    };
  }
  
  // Generate secure download URL
  private generateSecureDownloadUrl(requestId: string, data: any): string {
    // In a real implementation, this would create a secure, time-limited URL
    return `/api/privacy/download/${requestId}?token=${Math.random().toString(36)}`;
  }
  
  // Get processing activities for user
  private getProcessingActivitiesForUser(userId: string): DataProcessingActivity[] {
    // Return all activities that could involve this user
    return Array.from(this.processingActivities.values());
  }
  
  // Get retention information
  private getRetentionInfo(userId: string): Array<{
    purpose: string;
    retentionPeriod: string;
    deletionDate: string;
  }> {
    return Array.from(this.processingActivities.values()).map(activity => ({
      purpose: activity.purpose,
      retentionPeriod: `${activity.retention.period} days`,
      deletionDate: new Date(Date.now() + activity.retention.period * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }
  
  // Check data retention compliance
  checkRetentionCompliance(): Array<{
    activityId: string;
    purpose: string;
    overdueDeletions: Array<{
      userId: string;
      retentionExpiry: number;
      daysOverdue: number;
    }>;
  }> {
    const complianceIssues: Array<any> = [];
    
    // This would check actual user data against retention policies
    // For now, return empty array as placeholder
    
    return complianceIssues;
  }
  
  // Generate privacy impact assessment
  createPrivacyImpactAssessment(
    activity: string,
    description: string,
    dataCategories: PersonalDataCategory[],
    assessedBy: string
  ): PrivacyImpactAssessment {
    const riskLevel = this.assessRiskLevel(dataCategories);
    
    const pia: PrivacyImpactAssessment = {
      id: `pia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      activity,
      description,
      dataCategories,
      riskLevel,
      risks: this.generateRiskAssessment(dataCategories),
      safeguards: this.recommendSafeguards(dataCategories, riskLevel),
      consultationRequired: riskLevel === 'high',
      assessedBy,
      assessedAt: Date.now(),
      approved: riskLevel === 'low',
    };
    
    this.privacyAssessments.set(pia.id, pia);
    this.savePrivacyAssessments();
    
    return pia;
  }
  
  // Assess risk level based on data categories
  private assessRiskLevel(dataCategories: PersonalDataCategory[]): 'low' | 'medium' | 'high' {
    if (dataCategories.includes(PersonalDataCategory.SPECIAL_CATEGORY) ||
        dataCategories.includes(PersonalDataCategory.BIOMETRIC)) {
      return 'high';
    }
    
    if (dataCategories.includes(PersonalDataCategory.FINANCIAL) ||
        dataCategories.includes(PersonalDataCategory.LOCATION)) {
      return 'medium';
    }
    
    return 'low';
  }
  
  // Generate risk assessment
  private generateRiskAssessment(dataCategories: PersonalDataCategory[]): Array<any> {
    const risks = [];
    
    if (dataCategories.includes(PersonalDataCategory.FINANCIAL)) {
      risks.push({
        description: 'Financial fraud risk',
        likelihood: 'medium',
        impact: 'high',
        mitigation: 'Implement strong encryption and access controls',
      });
    }
    
    if (dataCategories.includes(PersonalDataCategory.BIOMETRIC)) {
      risks.push({
        description: 'Identity theft risk',
        likelihood: 'low',
        impact: 'high',
        mitigation: 'Use biometric templates instead of raw data',
      });
    }
    
    return risks;
  }
  
  // Recommend safeguards
  private recommendSafeguards(
    dataCategories: PersonalDataCategory[],
    riskLevel: 'low' | 'medium' | 'high'
  ): string[] {
    const safeguards = ['encryption at rest', 'encryption in transit', 'access controls'];
    
    if (riskLevel === 'high') {
      safeguards.push('pseudonymization', 'regular audits', 'staff training');
    }
    
    if (dataCategories.includes(PersonalDataCategory.FINANCIAL)) {
      safeguards.push('PCI DSS compliance', 'fraud monitoring');
    }
    
    return safeguards;
  }
  
  // Cookie consent management
  manageCookieConsent(
    userId: string,
    categories: Array<'necessary' | 'functional' | 'analytics' | 'marketing'>,
    granted: boolean
  ): void {
    const consentData = {
      categories,
      granted,
      timestamp: Date.now(),
    };
    
    secureLocalStorage.setItem(`cookie_consent_${userId}`, consentData);
    
    if (granted) {
      this.recordConsent(
        userId,
        'Cookie usage',
        [PersonalDataCategory.ONLINE_ACTIVITY, PersonalDataCategory.BEHAVIORAL],
        'explicit',
        { cookieCategories: categories }
      );
    }
  }
  
  // Utility methods
  private getClientIP(): string {
    // In a real implementation, this would get the actual client IP
    return '192.168.1.1';
  }
  
  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }
  
  // Save methods
  private saveConsentRecords(): void {
    const consentObject = Object.fromEntries(this.consentRecords.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}consent`, consentObject);
  }
  
  private saveProcessingActivities(): void {
    const activitiesObject = Object.fromEntries(this.processingActivities.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}activities`, activitiesObject);
  }
  
  private saveDataSubjectRequests(): void {
    const requestsObject = Object.fromEntries(this.dataSubjectRequests.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}requests`, requestsObject);
  }
  
  private savePrivacyAssessments(): void {
    const assessmentsObject = Object.fromEntries(this.privacyAssessments.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}assessments`, assessmentsObject);
  }
  
  // Get all data subject requests
  getAllDataSubjectRequests(): DataSubjectRequest[] {
    return Array.from(this.dataSubjectRequests.values())
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }
  
  // Get pending requests
  getPendingRequests(): DataSubjectRequest[] {
    return this.getAllDataSubjectRequests().filter(r => r.status === 'pending');
  }
  
  // Generate GDPR compliance report
  generateComplianceReport(): {
    consentMetrics: {
      totalConsents: number;
      activeConsents: number;
      withdrawnConsents: number;
    };
    requestMetrics: {
      totalRequests: number;
      pendingRequests: number;
      completedRequests: number;
      averageResponseTime: number;
    };
    retentionCompliance: any[];
    risksAndIssues: string[];
  } {
    const allConsents = Array.from(this.consentRecords.values()).flat();
    const allRequests = this.getAllDataSubjectRequests();
    
    const completedRequests = allRequests.filter(r => r.status === 'completed');
    const averageResponseTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => sum + ((r.processedAt || 0) - r.submittedAt), 0) / completedRequests.length
      : 0;
    
    return {
      consentMetrics: {
        totalConsents: allConsents.length,
        activeConsents: allConsents.filter(c => c.active).length,
        withdrawnConsents: allConsents.filter(c => !c.active).length,
      },
      requestMetrics: {
        totalRequests: allRequests.length,
        pendingRequests: allRequests.filter(r => r.status === 'pending').length,
        completedRequests: completedRequests.length,
        averageResponseTime: Math.round(averageResponseTime / (1000 * 60 * 60 * 24)), // days
      },
      retentionCompliance: this.checkRetentionCompliance(),
      risksAndIssues: [
        // Would analyze actual compliance issues
      ],
    };
  }
}

// Export singleton
export const privacyProtectionManager = PrivacyProtectionManager.getInstance();