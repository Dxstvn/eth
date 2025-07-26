// [SECURITY] KYC Encryption Helpers for UI Integration

import {
  kycEncryption,
  kycSecureStorage,
  kycDataIntegrity,
  KYCFieldType,
  type KYCEncryptionResult,
} from '@/lib/security/kyc-encryption';

/**
 * Helper class for integrating KYC encryption in the UI
 */
export class KYCEncryptionHelper {
  private static instance: KYCEncryptionHelper;
  private userPassword: string | null = null;
  
  private constructor() {}
  
  static getInstance(): KYCEncryptionHelper {
    if (!KYCEncryptionHelper.instance) {
      KYCEncryptionHelper.instance = new KYCEncryptionHelper();
    }
    return KYCEncryptionHelper.instance;
  }
  
  /**
   * Initialize encryption with user password
   * Should be called after user authentication
   */
  async initialize(password: string): Promise<void> {
    this.userPassword = password;
    
    // Store encrypted session key
    const sessionKey = kycEncryption.generateHash(password + Date.now());
    await kycSecureStorage.store(
      'session_key',
      { key: sessionKey, timestamp: Date.now() },
      password,
      { expiry: 4 * 60 * 60 * 1000 } // 4 hours
    );
  }
  
  /**
   * Encrypt form data before submission
   */
  async encryptFormData(formData: {
    fullName?: string;
    dateOfBirth?: string;
    ssn?: string;
    taxId?: string;
    address?: string;
    phone?: string;
    email?: string;
  }): Promise<Record<string, KYCEncryptionResult>> {
    if (!this.userPassword) {
      throw new Error('[SECURITY] Encryption not initialized');
    }
    
    const encryptedData: Record<string, KYCEncryptionResult> = {};
    
    // Map form fields to encryption field types
    const fieldMapping: Record<string, KYCFieldType> = {
      fullName: KYCFieldType.FULL_NAME,
      dateOfBirth: KYCFieldType.DATE_OF_BIRTH,
      ssn: KYCFieldType.SSN,
      taxId: KYCFieldType.TAX_ID,
      address: KYCFieldType.ADDRESS,
      phone: KYCFieldType.PHONE,
      email: KYCFieldType.EMAIL,
    };
    
    // Encrypt each field
    for (const [field, value] of Object.entries(formData)) {
      if (value && fieldMapping[field]) {
        encryptedData[field] = kycEncryption.encryptPII(
          value,
          fieldMapping[field],
          this.userPassword
        );
      }
    }
    
    return encryptedData;
  }
  
  /**
   * Decrypt data for display
   */
  async decryptFormData(
    encryptedData: Record<string, KYCEncryptionResult>
  ): Promise<Record<string, string>> {
    if (!this.userPassword) {
      throw new Error('[SECURITY] Encryption not initialized');
    }
    
    const decryptedData: Record<string, string> = {};
    
    for (const [field, encrypted] of Object.entries(encryptedData)) {
      try {
        decryptedData[field] = kycEncryption.decryptPII(
          encrypted,
          this.userPassword
        );
      } catch (error) {
        console.error(`[SECURITY] Failed to decrypt ${field}:`, error);
      }
    }
    
    return decryptedData;
  }
  
  /**
   * Encrypt KYC document before upload
   */
  async encryptDocument(
    file: File,
    documentType: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    encryptedBlob: Blob;
    metadata: any;
  }> {
    if (!this.userPassword) {
      throw new Error('[SECURITY] Encryption not initialized');
    }
    
    console.log(`[SECURITY] Encrypting ${documentType} document: ${file.name}`);
    
    const encrypted = await kycEncryption.encryptFile(
      file,
      this.userPassword,
      onProgress
    );
    
    // Create encrypted blob
    const encryptedBlob = new Blob(
      [encrypted.encryptedData],
      { type: 'application/octet-stream' }
    );
    
    // Create metadata for storage
    const metadata = {
      ...encrypted.metadata,
      documentType,
      originalName: encrypted.fileMetadata.originalName,
      originalSize: encrypted.fileMetadata.size,
      uploadedAt: Date.now(),
      checksum: encrypted.fileMetadata.checksum,
    };
    
    return { encryptedBlob, metadata };
  }
  
  /**
   * Generate integrity proof for KYC submission
   */
  generateSubmissionProof(data: any): {
    hash: string;
    signature: string;
    timestamp: number;
  } {
    const proof = kycDataIntegrity.createTimestampedHash(data);
    const signature = kycDataIntegrity.generateSignature(
      JSON.stringify(data),
      this.userPassword || 'default-secret'
    );
    
    return {
      hash: proof.hash,
      signature,
      timestamp: proof.timestamp,
    };
  }
  
  /**
   * Store KYC status securely
   */
  async storeKYCStatus(status: {
    level: number;
    verified: boolean;
    documents: string[];
    expiresAt?: Date;
  }): Promise<void> {
    if (!this.userPassword) {
      throw new Error('[SECURITY] Encryption not initialized');
    }
    
    await kycSecureStorage.store(
      'kyc_status',
      status,
      this.userPassword,
      {
        expiry: status.expiresAt ? status.expiresAt.getTime() - Date.now() : undefined,
        fieldType: KYCFieldType.DOCUMENT,
      }
    );
  }
  
  /**
   * Retrieve KYC status
   */
  async getKYCStatus(): Promise<any | null> {
    if (!this.userPassword) {
      return null;
    }
    
    return await kycSecureStorage.retrieve('kyc_status', this.userPassword);
  }
  
  /**
   * Clear all secure data (on logout)
   */
  async clearSecureData(): Promise<void> {
    kycSecureStorage.clearAll();
    this.userPassword = null;
  }
  
  /**
   * Check if encryption is initialized
   */
  isInitialized(): boolean {
    return this.userPassword !== null;
  }
}

// Export singleton instance
export const kycEncryptionHelper = KYCEncryptionHelper.getInstance();

/**
 * React Hook for KYC Encryption
 */
export function useKYCEncryption() {
  const helper = KYCEncryptionHelper.getInstance();
  
  return {
    initialize: helper.initialize.bind(helper),
    encryptFormData: helper.encryptFormData.bind(helper),
    decryptFormData: helper.decryptFormData.bind(helper),
    encryptDocument: helper.encryptDocument.bind(helper),
    generateSubmissionProof: helper.generateSubmissionProof.bind(helper),
    storeKYCStatus: helper.storeKYCStatus.bind(helper),
    getKYCStatus: helper.getKYCStatus.bind(helper),
    clearSecureData: helper.clearSecureData.bind(helper),
    isInitialized: helper.isInitialized.bind(helper),
  };
}

/**
 * Utility functions for common KYC encryption tasks
 */
export const KYCEncryptionUtils = {
  /**
   * Mask sensitive data for display
   */
  maskSensitiveData(value: string, type: KYCFieldType): string {
    if (!value) return '';
    
    switch (type) {
      case KYCFieldType.SSN:
        return value.replace(/^(\d{3})(\d{2})(\d{4})$/, '***-**-$3');
      case KYCFieldType.TAX_ID:
        return value.replace(/^(\d{2})(\d+)$/, '**-*****$2'.slice(-4));
      case KYCFieldType.BANK_ACCOUNT:
        return '*'.repeat(value.length - 4) + value.slice(-4);
      case KYCFieldType.EMAIL:
        const [local, domain] = value.split('@');
        return local.charAt(0) + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
      case KYCFieldType.PHONE:
        return value.replace(/^(\+?\d{1,3})?(\d{3})(\d{3})(\d{4})$/, '$1-***-***-$4');
      default:
        return value.charAt(0) + '*'.repeat(Math.max(0, value.length - 2)) + value.slice(-1);
    }
  },
  
  /**
   * Validate field format before encryption
   */
  validateField(value: string, type: KYCFieldType): boolean {
    switch (type) {
      case KYCFieldType.SSN:
        return /^\d{3}-?\d{2}-?\d{4}$/.test(value);
      case KYCFieldType.EMAIL:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case KYCFieldType.PHONE:
        return /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, ''));
      default:
        return value.length > 0;
    }
  },
  
  /**
   * Generate secure filename for encrypted documents
   */
  generateSecureFilename(originalName: string, documentType: string): string {
    const timestamp = Date.now();
    const hash = kycEncryption.generateHash(originalName + timestamp).substring(0, 8);
    return `kyc_${documentType}_${timestamp}_${hash}.enc`;
  },
};

export default KYCEncryptionHelper;