import { authenticator, totp, hotp } from 'otplib';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { secureRandom, advancedEncryption, EncryptionResult } from './crypto-utils';
import { secureLocalStorage } from './secure-storage';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';

// MFA method types
export enum MFAMethodType {
  TOTP = 'TOTP',           // Time-based One-Time Password (Google Authenticator, Authy)
  SMS = 'SMS',             // SMS-based verification
  EMAIL = 'EMAIL',         // Email-based verification
  BACKUP_CODES = 'BACKUP_CODES', // Recovery codes
  PUSH = 'PUSH',           // Push notifications
  HOTP = 'HOTP',           // HMAC-based One-Time Password
}

// MFA setup data
export interface MFASetupData {
  method: MFAMethodType;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  email?: string;
  enabled: boolean;
  createdAt: number;
  lastUsed?: number;
}

// MFA verification result
export interface MFAVerificationResult {
  isValid: boolean;
  method: MFAMethodType;
  remainingAttempts?: number;
  cooldownUntil?: number;
  error?: string;
}

// MFA configuration
export interface MFAConfig {
  issuer: string;
  serviceName: string;
  window: number; // TOTP time window tolerance
  digits: number;
  period: number; // TOTP period in seconds
  backupCodesCount: number;
  maxAttempts: number;
  cooldownPeriod: number; // seconds
}

const DEFAULT_MFA_CONFIG: MFAConfig = {
  issuer: 'ClearHold',
  serviceName: 'ClearHold Escrow',
  window: 1, // Allow 1 step before/after current time
  digits: 6,
  period: 30,
  backupCodesCount: 10,
  maxAttempts: 3,
  cooldownPeriod: 300, // 5 minutes
};

// MFA manager
export class MFAManager {
  private static instance: MFAManager;
  private config: MFAConfig;
  private storageKey = 'mfa_methods';
  private attemptsKey = 'mfa_attempts';
  
  private constructor(config: MFAConfig = DEFAULT_MFA_CONFIG) {
    this.config = config;
    
    // Configure OTP library
    authenticator.options = {
      window: config.window,
      digits: config.digits,
      period: config.period,
    };
  }
  
  static getInstance(config?: MFAConfig): MFAManager {
    if (!MFAManager.instance) {
      MFAManager.instance = new MFAManager(config);
    }
    return MFAManager.instance;
  }
  
  // Setup TOTP authentication
  async setupTOTP(userId: string, userEmail: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Generate OTPAUTH URL
    const otpauth = authenticator.keyuri(
      userEmail,
      this.config.serviceName,
      secret
    );
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauth);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Store MFA setup (not activated until verified)
    const setupData: MFASetupData = {
      method: MFAMethodType.TOTP,
      secret,
      qrCode,
      backupCodes,
      enabled: false,
      createdAt: Date.now(),
    };
    
    this.storeMFAMethod(userId, MFAMethodType.TOTP, setupData);
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      { action: 'TOTP setup initiated', userId }
    );
    
    return { secret, qrCode, backupCodes };
  }
  
  // Verify TOTP and activate
  async verifyAndActivateTOTP(
    userId: string, 
    token: string
  ): Promise<MFAVerificationResult> {
    const method = this.getMFAMethod(userId, MFAMethodType.TOTP);
    
    if (!method || !method.secret) {
      return {
        isValid: false,
        method: MFAMethodType.TOTP,
        error: 'TOTP not set up',
      };
    }
    
    // Check rate limiting
    const rateLimit = this.checkRateLimit(userId, MFAMethodType.TOTP);
    if (!rateLimit.allowed) {
      return {
        isValid: false,
        method: MFAMethodType.TOTP,
        remainingAttempts: rateLimit.remainingAttempts,
        cooldownUntil: rateLimit.cooldownUntil,
        error: 'Too many attempts',
      };
    }
    
    // Verify token
    const isValid = authenticator.verify({
      token,
      secret: method.secret,
    });
    
    if (isValid) {
      // Activate TOTP
      method.enabled = true;
      method.lastUsed = Date.now();
      this.storeMFAMethod(userId, MFAMethodType.TOTP, method);
      
      // Reset rate limit
      this.resetRateLimit(userId, MFAMethodType.TOTP);
      
      securityLogger.log(
        SecurityEventType.SECURITY_CONFIG_CHANGED,
        SecurityEventSeverity.HIGH,
        { action: 'TOTP activated', userId }
      );
      
      auditTrail.log(
        AuditActionType.PROFILE_UPDATED,
        'user',
        { action: 'TOTP activated' },
        { resourceId: userId }
      );
      
      return { isValid: true, method: MFAMethodType.TOTP };
    } else {
      // Record failed attempt
      this.recordFailedAttempt(userId, MFAMethodType.TOTP);
      
      return {
        isValid: false,
        method: MFAMethodType.TOTP,
        remainingAttempts: this.getRemainingAttempts(userId, MFAMethodType.TOTP),
        error: 'Invalid token',
      };
    }
  }
  
  // Setup SMS MFA
  async setupSMS(userId: string, phoneNumber: string): Promise<MFASetupData> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }
    
    const setupData: MFASetupData = {
      method: MFAMethodType.SMS,
      phoneNumber,
      enabled: false,
      createdAt: Date.now(),
    };
    
    this.storeMFAMethod(userId, MFAMethodType.SMS, setupData);
    
    // Send verification SMS
    await this.sendVerificationSMS(phoneNumber);
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      { action: 'SMS MFA setup initiated', userId, phoneNumber: this.maskPhoneNumber(phoneNumber) }
    );
    
    return setupData;
  }
  
  // Setup Email MFA
  async setupEmail(userId: string, email: string): Promise<MFASetupData> {
    const setupData: MFASetupData = {
      method: MFAMethodType.EMAIL,
      email,
      enabled: false,
      createdAt: Date.now(),
    };
    
    this.storeMFAMethod(userId, MFAMethodType.EMAIL, setupData);
    
    // Send verification email
    await this.sendVerificationEmail(email);
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      { action: 'Email MFA setup initiated', userId, email: this.maskEmail(email) }
    );
    
    return setupData;
  }
  
  // Verify MFA token
  async verifyMFA(
    userId: string,
    method: MFAMethodType,
    token: string
  ): Promise<MFAVerificationResult> {
    const mfaMethod = this.getMFAMethod(userId, method);
    
    if (!mfaMethod || !mfaMethod.enabled) {
      return {
        isValid: false,
        method,
        error: 'MFA method not enabled',
      };
    }
    
    // Check rate limiting
    const rateLimit = this.checkRateLimit(userId, method);
    if (!rateLimit.allowed) {
      return {
        isValid: false,
        method,
        remainingAttempts: rateLimit.remainingAttempts,
        cooldownUntil: rateLimit.cooldownUntil,
        error: 'Too many attempts',
      };
    }
    
    let isValid = false;
    
    switch (method) {
      case MFAMethodType.TOTP:
        isValid = mfaMethod.secret ? authenticator.verify({
          token,
          secret: mfaMethod.secret,
        }) : false;
        break;
        
      case MFAMethodType.BACKUP_CODES:
        isValid = this.verifyBackupCode(userId, token);
        break;
        
      case MFAMethodType.SMS:
      case MFAMethodType.EMAIL:
        // In real implementation, these would verify against stored temporary codes
        isValid = await this.verifyTemporaryCode(userId, method, token);
        break;
        
      default:
        return {
          isValid: false,
          method,
          error: 'Unsupported MFA method',
        };
    }
    
    if (isValid) {
      // Update last used
      mfaMethod.lastUsed = Date.now();
      this.storeMFAMethod(userId, method, mfaMethod);
      
      // Reset rate limit
      this.resetRateLimit(userId, method);
      
      securityLogger.log(
        SecurityEventType.LOGIN_SUCCESS,
        SecurityEventSeverity.LOW,
        { action: 'MFA verification successful', userId, method }
      );
      
      return { isValid: true, method };
    } else {
      // Record failed attempt
      this.recordFailedAttempt(userId, method);
      
      securityLogger.log(
        SecurityEventType.LOGIN_FAILED,
        SecurityEventSeverity.MEDIUM,
        { action: 'MFA verification failed', userId, method }
      );
      
      return {
        isValid: false,
        method,
        remainingAttempts: this.getRemainingAttempts(userId, method),
        error: 'Invalid token',
      };
    }
  }
  
  // Generate backup codes
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.config.backupCodesCount; i++) {
      // Generate 8-character alphanumeric code
      const code = secureRandom.generateString(8).replace(/[^A-Za-z0-9]/g, '0').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }
  
  // Verify backup code
  private verifyBackupCode(userId: string, code: string): boolean {
    const method = this.getMFAMethod(userId, MFAMethodType.BACKUP_CODES);
    
    if (!method || !method.backupCodes) {
      return false;
    }
    
    const codeIndex = method.backupCodes.indexOf(code.toUpperCase());
    
    if (codeIndex !== -1) {
      // Remove used backup code
      method.backupCodes.splice(codeIndex, 1);
      this.storeMFAMethod(userId, MFAMethodType.BACKUP_CODES, method);
      
      securityLogger.log(
        SecurityEventType.LOGIN_SUCCESS,
        SecurityEventSeverity.MEDIUM,
        { action: 'Backup code used', userId, remainingCodes: method.backupCodes.length }
      );
      
      return true;
    }
    
    return false;
  }
  
  // Send verification SMS (placeholder)
  private async sendVerificationSMS(phoneNumber: string): Promise<void> {
    // In real implementation, integrate with SMS provider (Twilio, AWS SNS, etc.)
    const code = secureRandom.generateNumber(100000, 999999).toString();
    
    // Store temporary code (encrypted)
    const encryptedCode = advancedEncryption.encryptData(code, phoneNumber);
    secureLocalStorage.setItemWithExpiry(
      `sms_code_${phoneNumber}`,
      encryptedCode,
      5 * 60 * 1000 // 5 minutes
    );
    
    console.log(`[MFA] SMS code for ${this.maskPhoneNumber(phoneNumber)}: ${code}`);
  }
  
  // Send verification email (placeholder)
  private async sendVerificationEmail(email: string): Promise<void> {
    // In real implementation, integrate with email provider
    const code = secureRandom.generateNumber(100000, 999999).toString();
    
    // Store temporary code (encrypted)
    const encryptedCode = advancedEncryption.encryptData(code, email);
    secureLocalStorage.setItemWithExpiry(
      `email_code_${email}`,
      encryptedCode,
      5 * 60 * 1000 // 5 minutes
    );
    
    console.log(`[MFA] Email code for ${this.maskEmail(email)}: ${code}`);
  }
  
  // Verify temporary code
  private async verifyTemporaryCode(
    userId: string,
    method: MFAMethodType,
    token: string
  ): Promise<boolean> {
    const mfaMethod = this.getMFAMethod(userId, method);
    if (!mfaMethod) return false;
    
    const identifier = method === MFAMethodType.SMS 
      ? mfaMethod.phoneNumber 
      : mfaMethod.email;
      
    if (!identifier) return false;
    
    const storageKey = method === MFAMethodType.SMS 
      ? `sms_code_${identifier}`
      : `email_code_${identifier}`;
    
    const encryptedCode = secureLocalStorage.getItemWithExpiry<EncryptionResult>(storageKey);
    
    if (!encryptedCode) return false;
    
    try {
      const storedCode = advancedEncryption.decryptData(encryptedCode, identifier);
      const isValid = storedCode === token;
      
      if (isValid) {
        // Remove used code
        secureLocalStorage.removeItem(storageKey);
      }
      
      return isValid;
    } catch {
      return false;
    }
  }
  
  // Rate limiting
  private checkRateLimit(userId: string, method: MFAMethodType): {
    allowed: boolean;
    remainingAttempts: number;
    cooldownUntil?: number;
  } {
    const key = `${userId}_${method}`;
    const attempts = secureLocalStorage.getItem<{
      count: number;
      lastAttempt: number;
      cooldownUntil?: number;
    }>(this.attemptsKey + key) || { count: 0, lastAttempt: 0 };
    
    const now = Date.now();
    
    // Check if in cooldown
    if (attempts.cooldownUntil && now < attempts.cooldownUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        cooldownUntil: attempts.cooldownUntil,
      };
    }
    
    // Reset if cooldown period has passed
    if (attempts.cooldownUntil && now >= attempts.cooldownUntil) {
      attempts.count = 0;
      attempts.cooldownUntil = undefined;
    }
    
    const remainingAttempts = Math.max(0, this.config.maxAttempts - attempts.count);
    
    return {
      allowed: remainingAttempts > 0,
      remainingAttempts,
    };
  }
  
  // Record failed attempt
  private recordFailedAttempt(userId: string, method: MFAMethodType): void {
    const key = `${userId}_${method}`;
    const attempts = secureLocalStorage.getItem<{
      count: number;
      lastAttempt: number;
      cooldownUntil?: number;
    }>(this.attemptsKey + key) || { count: 0, lastAttempt: 0 };
    
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    // Set cooldown if max attempts reached
    if (attempts.count >= this.config.maxAttempts) {
      attempts.cooldownUntil = Date.now() + (this.config.cooldownPeriod * 1000);
    }
    
    secureLocalStorage.setItem(this.attemptsKey + key, attempts);
  }
  
  // Reset rate limit
  private resetRateLimit(userId: string, method: MFAMethodType): void {
    const key = `${userId}_${method}`;
    secureLocalStorage.removeItem(this.attemptsKey + key);
  }
  
  // Get remaining attempts
  private getRemainingAttempts(userId: string, method: MFAMethodType): number {
    const rateLimit = this.checkRateLimit(userId, method);
    return rateLimit.remainingAttempts;
  }
  
  // Store MFA method
  private storeMFAMethod(userId: string, method: MFAMethodType, data: MFASetupData): void {
    const methods = secureLocalStorage.getItem<Record<string, MFASetupData>>(
      this.storageKey + '_' + userId
    ) || {};
    
    methods[method] = data;
    secureLocalStorage.setItem(this.storageKey + '_' + userId, methods);
  }
  
  // Get MFA method
  getMFAMethod(userId: string, method: MFAMethodType): MFASetupData | null {
    const methods = secureLocalStorage.getItem<Record<string, MFASetupData>>(
      this.storageKey + '_' + userId
    ) || {};
    
    return methods[method] || null;
  }
  
  // Get all MFA methods for user
  getAllMFAMethods(userId: string): Record<MFAMethodType, MFASetupData> {
    return secureLocalStorage.getItem<Record<MFAMethodType, MFASetupData>>(
      this.storageKey + '_' + userId
    ) || {} as Record<MFAMethodType, MFASetupData>;
  }
  
  // Disable MFA method
  disableMFAMethod(userId: string, method: MFAMethodType): void {
    const mfaMethod = this.getMFAMethod(userId, method);
    if (mfaMethod) {
      mfaMethod.enabled = false;
      this.storeMFAMethod(userId, method, mfaMethod);
      
      securityLogger.log(
        SecurityEventType.SECURITY_CONFIG_CHANGED,
        SecurityEventSeverity.HIGH,
        { action: 'MFA method disabled', userId, method }
      );
    }
  }
  
  // Utility methods
  private isValidPhoneNumber(phone: string): boolean {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  }
  
  private maskPhoneNumber(phone: string): string {
    return phone.replace(/(\+\d{1,3})(\d{3,4})(\d+)(\d{4})/, '$1***$4');
  }
  
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
}

// React hook for MFA
export function useMFA() {
  const manager = MFAManager.getInstance();
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const [setupMethod, setSetupMethod] = React.useState<MFAMethodType | null>(null);
  
  const setupTOTP = React.useCallback(async (userId: string, userEmail: string) => {
    return await manager.setupTOTP(userId, userEmail);
  }, [manager]);
  
  const verifyMFA = React.useCallback(async (
    userId: string,
    method: MFAMethodType,
    token: string
  ) => {
    return await manager.verifyMFA(userId, method, token);
  }, [manager]);
  
  const getMethods = React.useCallback((userId: string) => {
    return manager.getAllMFAMethods(userId);
  }, [manager]);
  
  return {
    setupTOTP,
    verifyMFA,
    getMethods,
    isSetupOpen,
    setIsSetupOpen,
    setupMethod,
    setSetupMethod,
  };
}

// Export singleton
export const mfaManager = MFAManager.getInstance();

import React from 'react';