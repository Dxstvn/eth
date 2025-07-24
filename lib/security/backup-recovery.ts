import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';
import { secureLocalStorage, sensitiveDataStorage } from './secure-storage';
import { advancedEncryption, EncryptionResult } from './crypto-utils';

// Backup types
export enum BackupType {
  FULL = 'FULL',           // Complete system backup
  INCREMENTAL = 'INCREMENTAL', // Changes since last backup
  DIFFERENTIAL = 'DIFFERENTIAL', // Changes since last full backup
  SNAPSHOT = 'SNAPSHOT',   // Point-in-time snapshot
}

// Backup status
export enum BackupStatus {
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Recovery point objective
export interface RecoveryObjective {
  rpo: number;  // Recovery Point Objective (max data loss in minutes)
  rto: number;  // Recovery Time Objective (max downtime in minutes)
}

// Backup configuration
export interface BackupConfiguration {
  id: string;
  name: string;
  type: BackupType;
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format for daily/weekly/monthly
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  retention: {
    count: number; // Number of backups to keep
    days: number;  // Days to keep backups
  };
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256' | 'AES-128';
    keyRotation: boolean;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'bzip2' | 'lz4';
  };
  verification: {
    enabled: boolean;
    checksumAlgorithm: 'SHA-256' | 'MD5';
  };
  destination: {
    type: 'local' | 'cloud' | 's3' | 'azure' | 'gcp';
    path: string;
    credentials?: Record<string, string>;
  };
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// Backup record
export interface BackupRecord {
  id: string;
  configurationId: string;
  type: BackupType;
  status: BackupStatus;
  startedAt: number;
  completedAt?: number;
  duration?: number;
  size: number; // bytes
  checksum: string;
  location: string;
  metadata: {
    dataTypes: string[];
    recordCount: number;
    version: string;
    encryptionKeyId?: string;
  };
  error?: string;
  recoveryPoint: number; // timestamp
}

// Recovery request
export interface RecoveryRequest {
  id: string;
  requestedBy: string;
  backupId: string;
  recoveryType: 'full' | 'partial' | 'point-in-time';
  targetTime?: number; // for point-in-time recovery
  dataTypes?: string[]; // for partial recovery
  destination: string;
  status: 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'cancelled';
  approvedBy?: string;
  approvedAt?: number;
  startedAt?: number;
  completedAt?: number;
  progress?: number; // 0-100
  error?: string;
  metadata: Record<string, any>;
}

// Backup and Recovery System
export class BackupRecoverySystem {
  private static instance: BackupRecoverySystem;
  private configurations: Map<string, BackupConfiguration> = new Map();
  private backupRecords: Map<string, BackupRecord> = new Map();
  private recoveryRequests: Map<string, RecoveryRequest> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private storagePrefix = 'backup_';
  
  private constructor() {
    this.loadStoredData();
    this.initializeDefaultConfigurations();
    this.startScheduler();
  }
  
  static getInstance(): BackupRecoverySystem {
    if (!BackupRecoverySystem.instance) {
      BackupRecoverySystem.instance = new BackupRecoverySystem();
    }
    return BackupRecoverySystem.instance;
  }
  
  // Load stored data
  private loadStoredData(): void {
    const configs = secureLocalStorage.getItem<Record<string, BackupConfiguration>>(`${this.storagePrefix}configs`);
    if (configs) {
      Object.entries(configs).forEach(([id, config]) => {
        this.configurations.set(id, config);
      });
    }
    
    const records = secureLocalStorage.getItem<Record<string, BackupRecord>>(`${this.storagePrefix}records`);
    if (records) {
      Object.entries(records).forEach(([id, record]) => {
        this.backupRecords.set(id, record);
      });
    }
    
    const requests = secureLocalStorage.getItem<Record<string, RecoveryRequest>>(`${this.storagePrefix}requests`);
    if (requests) {
      Object.entries(requests).forEach(([id, request]) => {
        this.recoveryRequests.set(id, request);
      });
    }
  }
  
  // Initialize default backup configurations
  private initializeDefaultConfigurations(): void {
    const defaultConfigs: BackupConfiguration[] = [
      {
        id: 'user-data-daily',
        name: 'Daily User Data Backup',
        type: BackupType.INCREMENTAL,
        schedule: {
          frequency: 'daily',
          time: '02:00',
        },
        retention: {
          count: 30,
          days: 30,
        },
        encryption: {
          enabled: true,
          algorithm: 'AES-256',
          keyRotation: true,
        },
        compression: {
          enabled: true,
          algorithm: 'gzip',
        },
        verification: {
          enabled: true,
          checksumAlgorithm: 'SHA-256',
        },
        destination: {
          type: 'local',
          path: '/backups/user-data',
        },
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'security-logs-hourly',
        name: 'Hourly Security Logs Backup',
        type: BackupType.INCREMENTAL,
        schedule: {
          frequency: 'hourly',
        },
        retention: {
          count: 24,
          days: 7,
        },
        encryption: {
          enabled: true,
          algorithm: 'AES-256',
          keyRotation: false,
        },
        compression: {
          enabled: true,
          algorithm: 'lz4',
        },
        verification: {
          enabled: true,
          checksumAlgorithm: 'SHA-256',
        },
        destination: {
          type: 'local',
          path: '/backups/security-logs',
        },
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'full-system-weekly',
        name: 'Weekly Full System Backup',
        type: BackupType.FULL,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 0, // Sunday
          time: '01:00',
        },
        retention: {
          count: 4,
          days: 90,
        },
        encryption: {
          enabled: true,
          algorithm: 'AES-256',
          keyRotation: true,
        },
        compression: {
          enabled: true,
          algorithm: 'gzip',
        },
        verification: {
          enabled: true,
          checksumAlgorithm: 'SHA-256',
        },
        destination: {
          type: 'local',
          path: '/backups/full-system',
        },
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    
    defaultConfigs.forEach(config => {
      this.configurations.set(config.id, config);
    });
    
    this.saveConfigurations();
  }
  
  // Start backup scheduler
  private startScheduler(): void {
    this.configurations.forEach(config => {
      if (config.enabled) {
        this.scheduleBackup(config);
      }
    });
  }
  
  // Schedule backup job
  private scheduleBackup(config: BackupConfiguration): void {
    // Clear existing schedule
    const existingJob = this.scheduledJobs.get(config.id);
    if (existingJob) {
      clearTimeout(existingJob);
    }
    
    const nextRun = this.calculateNextRun(config);
    const delay = nextRun - Date.now();
    
    if (delay > 0) {
      const job = setTimeout(() => {
        this.executeBackup(config.id);
        // Reschedule for next run
        this.scheduleBackup(config);
      }, delay);
      
      this.scheduledJobs.set(config.id, job);
    }
  }
  
  // Calculate next backup run time
  private calculateNextRun(config: BackupConfiguration): number {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (config.schedule.frequency) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
        break;
        
      case 'daily':
        if (config.schedule.time) {
          const [hours, minutes] = config.schedule.time.split(':').map(Number);
          nextRun.setHours(hours, minutes, 0, 0);
          
          // If time has passed today, schedule for tomorrow
          if (nextRun.getTime() <= now.getTime()) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        }
        break;
        
      case 'weekly':
        if (config.schedule.dayOfWeek !== undefined && config.schedule.time) {
          const [hours, minutes] = config.schedule.time.split(':').map(Number);
          const targetDay = config.schedule.dayOfWeek;
          const currentDay = nextRun.getDay();
          
          let daysUntilTarget = targetDay - currentDay;
          if (daysUntilTarget <= 0) {
            daysUntilTarget += 7;
          }
          
          nextRun.setDate(nextRun.getDate() + daysUntilTarget);
          nextRun.setHours(hours, minutes, 0, 0);
        }
        break;
        
      case 'monthly':
        if (config.schedule.dayOfMonth && config.schedule.time) {
          const [hours, minutes] = config.schedule.time.split(':').map(Number);
          nextRun.setDate(config.schedule.dayOfMonth);
          nextRun.setHours(hours, minutes, 0, 0);
          
          // If date has passed this month, schedule for next month
          if (nextRun.getTime() <= now.getTime()) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;
    }
    
    return nextRun.getTime();
  }
  
  // Execute backup
  async executeBackup(configId: string): Promise<BackupRecord | null> {
    const config = this.configurations.get(configId);
    if (!config || !config.enabled) {
      return null;
    }
    
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Create backup record
    const record: BackupRecord = {
      id: backupId,
      configurationId: configId,
      type: config.type,
      status: BackupStatus.RUNNING,
      startedAt: startTime,
      size: 0,
      checksum: '',
      location: '',
      metadata: {
        dataTypes: [],
        recordCount: 0,
        version: '1.0',
      },
      recoveryPoint: startTime,
    };
    
    this.backupRecords.set(backupId, record);
    this.saveBackupRecords();
    
    // Log backup start
    securityLogger.log(
      SecurityEventType.AUDIT_LOG_ACCESS,
      SecurityEventSeverity.LOW,
      {
        action: 'Backup started',
        backupId,
        configId,
        type: config.type,
      }
    );
    
    try {
      // Collect data to backup
      const backupData = await this.collectBackupData(config);
      
      // Compress if enabled
      let processedData = backupData;
      if (config.compression.enabled) {
        processedData = await this.compressData(backupData, config.compression.algorithm);
      }
      
      // Encrypt if enabled
      let finalData = processedData;
      if (config.encryption.enabled) {
        const encrypted = await this.encryptBackupData(processedData, config.encryption.algorithm);
        finalData = JSON.stringify(encrypted);
        record.metadata.encryptionKeyId = 'key-' + Date.now();
      }
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(finalData, config.verification.checksumAlgorithm);
      
      // Store backup
      const location = await this.storeBackup(finalData, config.destination, backupId);
      
      // Update record
      record.status = BackupStatus.COMPLETED;
      record.completedAt = Date.now();
      record.duration = record.completedAt - record.startedAt;
      record.size = finalData.length;
      record.checksum = checksum;
      record.location = location;
      record.metadata.recordCount = this.countRecords(backupData);
      record.metadata.dataTypes = this.extractDataTypes(backupData);
      
      this.backupRecords.set(backupId, record);
      this.saveBackupRecords();
      
      // Clean up old backups
      await this.cleanupOldBackups(config);
      
      // Log success
      securityLogger.log(
        SecurityEventType.AUDIT_LOG_ACCESS,
        SecurityEventSeverity.LOW,
        {
          action: 'Backup completed',
          backupId,
          duration: record.duration,
          size: record.size,
        }
      );
      
      auditTrail.log(
        AuditActionType.BULK_OPERATION,
        'backup',
        {
          action: 'Backup completed',
          type: config.type,
          size: record.size,
          recordCount: record.metadata.recordCount,
        },
        { resourceId: backupId }
      );
      
      return record;
      
    } catch (error) {
      // Handle backup failure
      record.status = BackupStatus.FAILED;
      record.completedAt = Date.now();
      record.duration = record.completedAt - record.startedAt;
      record.error = (error as Error).message;
      
      this.backupRecords.set(backupId, record);
      this.saveBackupRecords();
      
      securityLogger.log(
        SecurityEventType.ERROR,
        SecurityEventSeverity.MEDIUM,
        {
          action: 'Backup failed',
          backupId,
          error: record.error,
        }
      );
      
      return record;
    }
  }
  
  // Collect data for backup
  private async collectBackupData(config: BackupConfiguration): Promise<any> {
    const backupData: any = {};
    
    // Collect user data
    if (config.name.includes('User Data')) {
      backupData.users = this.collectUserData();
    }
    
    // Collect security logs
    if (config.name.includes('Security Logs')) {
      backupData.securityLogs = this.collectSecurityLogs();
    }
    
    // Collect system data for full backup
    if (config.type === BackupType.FULL) {
      backupData.configurations = this.collectSystemConfigurations();
      backupData.auditTrail = this.collectAuditTrail();
    }
    
    return backupData;
  }
  
  // Collect user data
  private collectUserData(): any {
    const userData: any = {};
    
    // Collect from various storage locations
    try {
      // This would collect actual user data in a real implementation
      userData.profiles = {}; // User profiles
      userData.transactions = {}; // Transaction data
      userData.wallets = {}; // Wallet information
      userData.documents = {}; // Document metadata
    } catch (error) {
      console.warn('Failed to collect user data:', error);
    }
    
    return userData;
  }
  
  // Collect security logs
  private collectSecurityLogs(): any {
    // This would collect actual security logs
    return {
      events: [], // Security events
      violations: [], // Security violations
      incidents: [], // Security incidents
    };
  }
  
  // Collect system configurations
  private collectSystemConfigurations(): any {
    return {
      backupConfigs: Object.fromEntries(this.configurations.entries()),
      // Other system configurations
    };
  }
  
  // Collect audit trail
  private collectAuditTrail(): any {
    return {
      // Audit trail data would be collected here
    };
  }
  
  // Compress data
  private async compressData(data: any, algorithm: string): Promise<string> {
    // Simplified compression simulation
    const dataString = JSON.stringify(data);
    
    switch (algorithm) {
      case 'gzip':
        // Would use actual gzip compression
        return dataString;
      case 'bzip2':
        // Would use actual bzip2 compression
        return dataString;
      case 'lz4':
        // Would use actual lz4 compression
        return dataString;
      default:
        return dataString;
    }
  }
  
  // Encrypt backup data
  private async encryptBackupData(data: string, algorithm: string): Promise<EncryptionResult> {
    const password = this.generateBackupEncryptionKey();
    return advancedEncryption.encryptData(data, password);
  }
  
  // Generate encryption key for backups
  private generateBackupEncryptionKey(): string {
    // In production, this would use proper key management
    return 'backup-encryption-key-' + Date.now();
  }
  
  // Calculate checksum
  private async calculateChecksum(data: string, algorithm: string): Promise<string> {
    // Would use actual checksum calculation
    switch (algorithm) {
      case 'SHA-256':
        // Calculate SHA-256 hash
        return 'sha256-' + data.length;
      case 'MD5':
        // Calculate MD5 hash
        return 'md5-' + data.length;
      default:
        return 'unknown-' + data.length;
    }
  }
  
  // Store backup
  private async storeBackup(data: string, destination: BackupConfiguration['destination'], backupId: string): Promise<string> {
    const fileName = `${backupId}.backup`;
    const fullPath = `${destination.path}/${fileName}`;
    
    switch (destination.type) {
      case 'local':
        // Store locally (simulated)
        secureLocalStorage.setItem(`backup_data_${backupId}`, data);
        return fullPath;
        
      case 'cloud':
      case 's3':
      case 'azure':
      case 'gcp':
        // Would upload to cloud storage
        return `${destination.type}://${destination.path}/${fileName}`;
        
      default:
        throw new Error(`Unsupported destination type: ${destination.type}`);
    }
  }
  
  // Clean up old backups
  private async cleanupOldBackups(config: BackupConfiguration): Promise<void> {
    const configBackups = Array.from(this.backupRecords.values())
      .filter(record => record.configurationId === config.id && record.status === BackupStatus.COMPLETED)
      .sort((a, b) => b.completedAt! - a.completedAt!);
    
    // Remove by count
    if (configBackups.length > config.retention.count) {
      const toRemove = configBackups.slice(config.retention.count);
      for (const backup of toRemove) {
        await this.deleteBackup(backup.id);
      }
    }
    
    // Remove by age
    const cutoffTime = Date.now() - (config.retention.days * 24 * 60 * 60 * 1000);
    const expiredBackups = configBackups.filter(record => record.completedAt! < cutoffTime);
    
    for (const backup of expiredBackups) {
      await this.deleteBackup(backup.id);
    }
  }
  
  // Delete backup
  private async deleteBackup(backupId: string): Promise<boolean> {
    const record = this.backupRecords.get(backupId);
    if (!record) return false;
    
    try {
      // Delete backup file
      secureLocalStorage.removeItem(`backup_data_${backupId}`);
      
      // Remove record
      this.backupRecords.delete(backupId);
      this.saveBackupRecords();
      
      securityLogger.log(
        SecurityEventType.AUDIT_LOG_ACCESS,
        SecurityEventSeverity.LOW,
        { action: 'Backup deleted', backupId }
      );
      
      return true;
    } catch (error) {
      securityLogger.log(
        SecurityEventType.ERROR,
        SecurityEventSeverity.LOW,
        { action: 'Backup deletion failed', backupId, error: (error as Error).message }
      );
      return false;
    }
  }
  
  // Request data recovery
  requestRecovery(
    requestedBy: string,
    backupId: string,
    recoveryType: RecoveryRequest['recoveryType'],
    options: {
      targetTime?: number;
      dataTypes?: string[];
      destination: string;
    }
  ): RecoveryRequest {
    const requestId = `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const request: RecoveryRequest = {
      id: requestId,
      requestedBy,
      backupId,
      recoveryType,
      targetTime: options.targetTime,
      dataTypes: options.dataTypes,
      destination: options.destination,
      status: 'pending',
      metadata: {},
    };
    
    this.recoveryRequests.set(requestId, request);
    this.saveRecoveryRequests();
    
    securityLogger.log(
      SecurityEventType.DATA_EXPORT,
      SecurityEventSeverity.MEDIUM,
      {
        action: 'Recovery requested',
        requestId,
        backupId,
        recoveryType,
        requestedBy,
      }
    );
    
    auditTrail.log(
      AuditActionType.DATA_EXPORT,
      'recovery',
      {
        action: 'Recovery requested',
        backupId,
        recoveryType,
      },
      { resourceId: requestId }
    );
    
    return request;
  }
  
  // Approve recovery request
  approveRecovery(requestId: string, approvedBy: string): boolean {
    const request = this.recoveryRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = Date.now();
    
    this.recoveryRequests.set(requestId, request);
    this.saveRecoveryRequests();
    
    // Start recovery process
    this.executeRecovery(requestId);
    
    return true;
  }
  
  // Execute recovery
  private async executeRecovery(requestId: string): Promise<void> {
    const request = this.recoveryRequests.get(requestId);
    if (!request || request.status !== 'approved') return;
    
    request.status = 'running';
    request.startedAt = Date.now();
    request.progress = 0;
    
    this.recoveryRequests.set(requestId, request);
    this.saveRecoveryRequests();
    
    try {
      // Get backup record
      const backupRecord = this.backupRecords.get(request.backupId);
      if (!backupRecord) {
        throw new Error('Backup record not found');
      }
      
      // Retrieve backup data
      const backupData = await this.retrieveBackupData(backupRecord);
      request.progress = 25;
      
      // Decrypt if needed
      let processedData = backupData;
      if (backupRecord.metadata.encryptionKeyId) {
        processedData = await this.decryptBackupData(backupData, backupRecord.metadata.encryptionKeyId);
      }
      request.progress = 50;
      
      // Decompress if needed
      const config = this.configurations.get(backupRecord.configurationId);
      if (config?.compression.enabled) {
        processedData = await this.decompressData(processedData);
      }
      request.progress = 75;
      
      // Apply recovery based on type
      await this.applyRecovery(request, processedData);
      request.progress = 100;
      
      // Complete recovery
      request.status = 'completed';
      request.completedAt = Date.now();
      
      this.recoveryRequests.set(requestId, request);
      this.saveRecoveryRequests();
      
      securityLogger.log(
        SecurityEventType.DATA_EXPORT,
        SecurityEventSeverity.HIGH,
        {
          action: 'Recovery completed',
          requestId,
          backupId: request.backupId,
          duration: request.completedAt - (request.startedAt || 0),
        }
      );
      
    } catch (error) {
      request.status = 'failed';
      request.completedAt = Date.now();
      request.error = (error as Error).message;
      
      this.recoveryRequests.set(requestId, request);
      this.saveRecoveryRequests();
      
      securityLogger.log(
        SecurityEventType.ERROR,
        SecurityEventSeverity.HIGH,
        {
          action: 'Recovery failed',
          requestId,
          error: request.error,
        }
      );
    }
  }
  
  // Retrieve backup data
  private async retrieveBackupData(record: BackupRecord): Promise<any> {
    return secureLocalStorage.getItem(`backup_data_${record.id}`);
  }
  
  // Decrypt backup data
  private async decryptBackupData(encryptedData: string, keyId: string): Promise<any> {
    const password = this.getBackupDecryptionKey(keyId);
    const encrypted = JSON.parse(encryptedData);
    return advancedEncryption.decryptData(encrypted, password);
  }
  
  // Get decryption key
  private getBackupDecryptionKey(keyId: string): string {
    // In production, this would retrieve from secure key management
    return 'backup-encryption-key-' + keyId.split('-')[1];
  }
  
  // Decompress data
  private async decompressData(data: string): Promise<any> {
    // Would decompress based on algorithm
    return JSON.parse(data);
  }
  
  // Apply recovery
  private async applyRecovery(request: RecoveryRequest, data: any): Promise<void> {
    switch (request.recoveryType) {
      case 'full':
        await this.performFullRecovery(data, request.destination);
        break;
      case 'partial':
        await this.performPartialRecovery(data, request.dataTypes || [], request.destination);
        break;
      case 'point-in-time':
        await this.performPointInTimeRecovery(data, request.targetTime || 0, request.destination);
        break;
    }
  }
  
  // Perform full recovery
  private async performFullRecovery(data: any, destination: string): Promise<void> {
    // Restore all data to the destination
    console.log('Performing full recovery to:', destination);
  }
  
  // Perform partial recovery
  private async performPartialRecovery(data: any, dataTypes: string[], destination: string): Promise<void> {
    // Restore only specified data types
    console.log('Performing partial recovery for:', dataTypes);
  }
  
  // Perform point-in-time recovery
  private async performPointInTimeRecovery(data: any, targetTime: number, destination: string): Promise<void> {
    // Restore data to specific point in time
    console.log('Performing point-in-time recovery to:', new Date(targetTime));
  }
  
  // Utility methods
  private countRecords(data: any): number {
    // Count total records in backup data
    return Object.keys(data).length;
  }
  
  private extractDataTypes(data: any): string[] {
    // Extract data types from backup
    return Object.keys(data);
  }
  
  // Save methods
  private saveConfigurations(): void {
    const configsObject = Object.fromEntries(this.configurations.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}configs`, configsObject);
  }
  
  private saveBackupRecords(): void {
    const recordsObject = Object.fromEntries(this.backupRecords.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}records`, recordsObject);
  }
  
  private saveRecoveryRequests(): void {
    const requestsObject = Object.fromEntries(this.recoveryRequests.entries());
    secureLocalStorage.setItem(`${this.storagePrefix}requests`, requestsObject);
  }
  
  // Get methods
  getAllConfigurations(): BackupConfiguration[] {
    return Array.from(this.configurations.values());
  }
  
  getAllBackupRecords(): BackupRecord[] {
    return Array.from(this.backupRecords.values())
      .sort((a, b) => b.startedAt - a.startedAt);
  }
  
  getAllRecoveryRequests(): RecoveryRequest[] {
    return Array.from(this.recoveryRequests.values())
      .sort((a, b) => (b.approvedAt || b.startedAt || 0) - (a.approvedAt || a.startedAt || 0));
  }
  
  // Generate backup report
  generateBackupReport(): {
    summary: {
      totalBackups: number;
      successfulBackups: number;
      failedBackups: number;
      totalSize: number;
      averageSize: number;
      lastBackupTime: number;
    };
    configurations: BackupConfiguration[];
    recentBackups: BackupRecord[];
    recoveryRequests: RecoveryRequest[];
  } {
    const records = this.getAllBackupRecords();
    const successful = records.filter(r => r.status === BackupStatus.COMPLETED);
    const failed = records.filter(r => r.status === BackupStatus.FAILED);
    const totalSize = successful.reduce((sum, r) => sum + r.size, 0);
    
    return {
      summary: {
        totalBackups: records.length,
        successfulBackups: successful.length,
        failedBackups: failed.length,
        totalSize,
        averageSize: successful.length > 0 ? totalSize / successful.length : 0,
        lastBackupTime: records.length > 0 ? records[0].startedAt : 0,
      },
      configurations: this.getAllConfigurations(),
      recentBackups: records.slice(0, 10),
      recoveryRequests: this.getAllRecoveryRequests(),
    };
  }
}

// Export singleton
export const backupRecoverySystem = BackupRecoverySystem.getInstance();