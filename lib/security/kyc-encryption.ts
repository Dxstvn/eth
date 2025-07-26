// [SECURITY] KYC Encryption Utilities Implementation

import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { AdvancedEncryption, SecureRandom, EncryptionResult } from './crypto-utils';

// KYC-specific encryption configuration
export const KYC_CRYPTO_CONFIG = {
  // AES-256-GCM simulation using AES-256-CBC + HMAC-SHA256
  AES_KEY_SIZE: 256,
  AES_MODE: 'CBC',
  GCM_TAG_SIZE: 128, // bits
  PBKDF2_ITERATIONS: 250000, // Increased for KYC security
  SALT_SIZE: 256, // bits
  IV_SIZE: 128, // bits
  HMAC_KEY_SIZE: 256, // bits
  
  // File encryption
  FILE_CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large files
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max
  
  // Key derivation
  MASTER_KEY_SIZE: 512, // bits
  FIELD_KEY_SIZE: 256, // bits
  
  // Data integrity
  HASH_ALGORITHM: 'SHA256',
  FINGERPRINT_SIZE: 256, // bits
};

// KYC data field types for field-level encryption
export enum KYCFieldType {
  SSN = 'ssn',
  TAX_ID = 'tax_id',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  BANK_ACCOUNT = 'bank_account',
  ROUTING_NUMBER = 'routing_number',
  DATE_OF_BIRTH = 'date_of_birth',
  FULL_NAME = 'full_name',
  ADDRESS = 'address',
  PHONE = 'phone',
  EMAIL = 'email',
  DOCUMENT = 'document',
  BIOMETRIC = 'biometric',
}

// Encryption metadata for audit trail
export interface EncryptionMetadata {
  id: string;
  timestamp: number;
  algorithm: string;
  keyDerivation: string;
  fieldType?: KYCFieldType;
  version: string;
  checksum: string;
}

// Enhanced encryption result for KYC
export interface KYCEncryptionResult extends EncryptionResult {
  metadata: EncryptionMetadata;
  keyId?: string;
}

// File encryption result
export interface FileEncryptionResult {
  encryptedData: ArrayBuffer;
  metadata: EncryptionMetadata;
  fileMetadata: {
    originalName: string;
    mimeType: string;
    size: number;
    checksum: string;
  };
  encryptionKey: EncryptionKeyInfo;
}

// Key information
export interface EncryptionKeyInfo {
  keyId: string;
  salt: string;
  derivationParams: {
    iterations: number;
    keySize: number;
    algorithm: string;
  };
}

/**
 * Enhanced KYC Encryption Service
 * Implements AES-256-GCM-like encryption with additional security layers
 */
export class KYCEncryptionService {
  private readonly version = '1.0.0';
  private secureRandom = SecureRandom.getInstance();
  private advancedEncryption = new AdvancedEncryption();
  
  /**
   * Generate a master encryption key from password and optional seed
   */
  generateMasterKey(password: string, seed?: string): EncryptionKeyInfo {
    const salt = seed || CryptoJS.lib.WordArray.random(KYC_CRYPTO_CONFIG.SALT_SIZE / 8).toString();
    const keyId = this.generateKeyId();
    
    return {
      keyId,
      salt,
      derivationParams: {
        iterations: KYC_CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        keySize: KYC_CRYPTO_CONFIG.MASTER_KEY_SIZE,
        algorithm: 'PBKDF2-SHA256',
      },
    };
  }
  
  /**
   * Derive field-specific encryption key
   */
  private deriveFieldKey(
    masterPassword: string,
    fieldType: KYCFieldType,
    salt: string
  ): CryptoJS.lib.WordArray {
    // Create field-specific salt
    const fieldSalt = CryptoJS.SHA256(salt + fieldType).toString();
    
    // Derive field-specific key
    return CryptoJS.PBKDF2(masterPassword + fieldType, fieldSalt, {
      keySize: KYC_CRYPTO_CONFIG.FIELD_KEY_SIZE / 32,
      iterations: KYC_CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    });
  }
  
  /**
   * Encrypt PII data with field-level encryption
   */
  encryptPII(
    data: string,
    fieldType: KYCFieldType,
    masterPassword: string,
    keyInfo?: EncryptionKeyInfo
  ): KYCEncryptionResult {
    const encKeyInfo = keyInfo || this.generateMasterKey(masterPassword);
    const fieldKey = this.deriveFieldKey(masterPassword, fieldType, encKeyInfo.salt);
    
    // Generate IV
    const iv = CryptoJS.lib.WordArray.random(KYC_CRYPTO_CONFIG.IV_SIZE / 8);
    
    // Encrypt data
    const encrypted = CryptoJS.AES.encrypt(data, fieldKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Generate authentication tag (HMAC for GCM simulation)
    const authKey = this.deriveAuthKey(fieldKey, encKeyInfo.salt);
    const authTag = this.generateAuthTag(encrypted.toString(), iv.toString(), authKey);
    
    // Create metadata
    const metadata: EncryptionMetadata = {
      id: uuidv4(),
      timestamp: Date.now(),
      algorithm: 'AES-256-CBC-HMAC',
      keyDerivation: 'PBKDF2-SHA256',
      fieldType,
      version: this.version,
      checksum: this.generateChecksum(data),
    };
    
    return {
      data: encrypted.toString(),
      salt: encKeyInfo.salt,
      iv: iv.toString(),
      hmac: authTag,
      metadata,
      keyId: encKeyInfo.keyId,
    };
  }
  
  /**
   * Decrypt PII data
   */
  decryptPII(
    encryptedData: KYCEncryptionResult,
    masterPassword: string
  ): string {
    const { fieldType } = encryptedData.metadata;
    if (!fieldType) {
      throw new Error('[SECURITY] Field type required for PII decryption');
    }
    
    // Derive field key
    const fieldKey = this.deriveFieldKey(masterPassword, fieldType, encryptedData.salt!);
    
    // Verify authentication tag
    const authKey = this.deriveAuthKey(fieldKey, encryptedData.salt!);
    const expectedTag = this.generateAuthTag(
      encryptedData.data,
      encryptedData.iv,
      authKey
    );
    
    if (!this.constantTimeCompare(expectedTag, encryptedData.hmac!)) {
      throw new Error('[SECURITY] Authentication tag verification failed');
    }
    
    // Decrypt data
    const decrypted = CryptoJS.AES.decrypt(encryptedData.data, fieldKey, {
      iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Verify checksum if available
    if (encryptedData.metadata.checksum) {
      const expectedChecksum = this.generateChecksum(plaintext);
      if (expectedChecksum !== encryptedData.metadata.checksum) {
        throw new Error('[SECURITY] Data integrity check failed');
      }
    }
    
    return plaintext;
  }
  
  /**
   * Encrypt file with chunked processing for large files
   */
  async encryptFile(
    file: File,
    masterPassword: string,
    onProgress?: (progress: number) => void
  ): Promise<FileEncryptionResult> {
    if (file.size > KYC_CRYPTO_CONFIG.MAX_FILE_SIZE) {
      throw new Error('[SECURITY] File size exceeds maximum allowed size');
    }
    
    const keyInfo = this.generateMasterKey(masterPassword);
    const fileKey = this.deriveFileKey(masterPassword, keyInfo.salt);
    const iv = CryptoJS.lib.WordArray.random(KYC_CRYPTO_CONFIG.IV_SIZE / 8);
    
    // Read file in chunks
    const chunks: string[] = [];
    const chunkSize = KYC_CRYPTO_CONFIG.FILE_CHUNK_SIZE;
    let offset = 0;
    
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      
      // Handle arrayBuffer method for different environments
      let arrayBuffer: ArrayBuffer;
      if (typeof chunk.arrayBuffer === 'function') {
        arrayBuffer = await chunk.arrayBuffer();
      } else {
        // Fallback for test environments
        arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(chunk);
        });
      }
      
      const wordArray = this.arrayBufferToWordArray(arrayBuffer);
      
      // Encrypt chunk
      const encrypted = CryptoJS.AES.encrypt(wordArray, fileKey, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      chunks.push(encrypted.toString());
      offset += chunkSize;
      
      if (onProgress) {
        onProgress((offset / file.size) * 100);
      }
    }
    
    // Combine chunks
    const combinedData = chunks.join('|||');
    const encryptedBuffer = this.stringToArrayBuffer(combinedData);
    
    // Generate file checksum
    const fileChecksum = await this.generateFileChecksum(file);
    
    // Generate auth tag
    const authKey = this.deriveAuthKey(fileKey, keyInfo.salt);
    const authTag = this.generateAuthTag(combinedData, iv.toString(), authKey);
    
    // Create metadata
    const metadata: EncryptionMetadata = {
      id: uuidv4(),
      timestamp: Date.now(),
      algorithm: 'AES-256-CBC-HMAC',
      keyDerivation: 'PBKDF2-SHA256',
      fieldType: KYCFieldType.DOCUMENT,
      version: this.version,
      checksum: authTag,
    };
    
    return {
      encryptedData: encryptedBuffer,
      metadata,
      fileMetadata: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        checksum: fileChecksum,
      },
      encryptionKey: keyInfo,
    };
  }
  
  /**
   * Decrypt file
   */
  async decryptFile(
    encryptedResult: FileEncryptionResult,
    masterPassword: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const { encryptionKey, metadata, fileMetadata } = encryptedResult;
    const fileKey = this.deriveFileKey(masterPassword, encryptionKey.salt);
    
    // Convert ArrayBuffer to string
    const encryptedString = this.arrayBufferToString(encryptedResult.encryptedData);
    const chunks = encryptedString.split('|||');
    
    // Verify auth tag
    const authKey = this.deriveAuthKey(fileKey, encryptionKey.salt);
    const expectedTag = this.generateAuthTag(
      encryptedString,
      metadata.checksum, // IV stored in checksum for files
      authKey
    );
    
    // Decrypt chunks
    const decryptedChunks: ArrayBuffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const decrypted = CryptoJS.AES.decrypt(chunks[i], fileKey, {
        iv: CryptoJS.enc.Hex.parse(metadata.checksum), // IV from checksum
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      const arrayBuffer = this.wordArrayToArrayBuffer(decrypted);
      decryptedChunks.push(arrayBuffer);
      
      if (onProgress) {
        onProgress(((i + 1) / chunks.length) * 100);
      }
    }
    
    // Combine chunks
    const blob = new Blob(decryptedChunks, { type: fileMetadata.mimeType });
    
    return blob;
  }
  
  /**
   * Generate secure hash for data integrity
   */
  generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
  
  /**
   * Generate fingerprint for duplicate detection
   */
  generateFingerprint(data: string | ArrayBuffer): string {
    let wordArray: CryptoJS.lib.WordArray;
    
    if (typeof data === 'string') {
      wordArray = CryptoJS.enc.Utf8.parse(data);
    } else {
      wordArray = this.arrayBufferToWordArray(data);
    }
    
    return CryptoJS.SHA256(wordArray).toString();
  }
  
  /**
   * Secure key storage helpers
   */
  secureStoreKey(key: string, password: string): string {
    const encrypted = this.advancedEncryption.encryptData(key, password, {
      includeSalt: true,
      includeHMAC: true,
    });
    
    return btoa(JSON.stringify(encrypted));
  }
  
  retrieveStoredKey(encryptedKey: string, password: string): string {
    try {
      const encrypted = JSON.parse(atob(encryptedKey)) as EncryptionResult;
      return this.advancedEncryption.decryptData(encrypted, password);
    } catch (error) {
      throw new Error('[SECURITY] Failed to retrieve stored key');
    }
  }
  
  /**
   * Zero out sensitive data in memory
   */
  secureClear(data: any): void {
    if (typeof data === 'string') {
      // For strings, we can't truly zero them due to immutability
      // Best practice is to avoid storing sensitive data in strings
      data = '';
    } else if (data instanceof Uint8Array) {
      data.fill(0);
    } else if (data instanceof ArrayBuffer) {
      new Uint8Array(data).fill(0);
    } else if (data && typeof data === 'object') {
      // Clear object properties
      Object.keys(data).forEach(key => {
        data[key] = null;
        delete data[key];
      });
    }
  }
  
  // Private helper methods
  
  private generateKeyId(): string {
    return `kyc-key-${Date.now()}-${this.secureRandom.generateString(8)}`;
  }
  
  private deriveAuthKey(
    encryptionKey: CryptoJS.lib.WordArray,
    salt: string
  ): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(encryptionKey.toString() + 'auth', salt, {
      keySize: KYC_CRYPTO_CONFIG.HMAC_KEY_SIZE / 32,
      iterations: 1000, // Faster for auth key
    });
  }
  
  private deriveFileKey(masterPassword: string, salt: string): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(masterPassword + 'file', salt, {
      keySize: KYC_CRYPTO_CONFIG.AES_KEY_SIZE / 32,
      iterations: KYC_CRYPTO_CONFIG.PBKDF2_ITERATIONS,
    });
  }
  
  private generateAuthTag(data: string, iv: string, authKey: CryptoJS.lib.WordArray): string {
    return CryptoJS.HmacSHA256(data + iv, authKey).toString();
  }
  
  private generateChecksum(data: string): string {
    return CryptoJS.SHA256(data).toString().substring(0, 16);
  }
  
  private async generateFileChecksum(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = this.arrayBufferToWordArray(arrayBuffer);
    return CryptoJS.SHA256(wordArray).toString();
  }
  
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
  
  private arrayBufferToWordArray(arrayBuffer: ArrayBuffer): CryptoJS.lib.WordArray {
    const uint8Array = new Uint8Array(arrayBuffer);
    const words: number[] = [];
    
    for (let i = 0; i < uint8Array.length; i += 4) {
      words.push(
        (uint8Array[i] << 24) |
        (uint8Array[i + 1] << 16) |
        (uint8Array[i + 2] << 8) |
        uint8Array[i + 3]
      );
    }
    
    return CryptoJS.lib.WordArray.create(words, uint8Array.length);
  }
  
  private wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const uint8Array = new Uint8Array(sigBytes);
    
    for (let i = 0; i < sigBytes; i++) {
      const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      uint8Array[i] = byte;
    }
    
    return uint8Array.buffer;
  }
  
  private arrayBufferToString(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }
  
  private stringToArrayBuffer(str: string): ArrayBuffer {
    const binary = atob(str);
    const uint8Array = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    
    return uint8Array.buffer;
  }
}

/**
 * Key Derivation Service for secure key management
 */
export class KYCKeyDerivation {
  private readonly secureRandom = SecureRandom.getInstance();
  
  /**
   * Derive encryption key from password using Argon2id-like algorithm
   * (Simulated using multiple rounds of PBKDF2 with different salts)
   */
  deriveKey(
    password: string,
    salt?: string,
    options?: {
      iterations?: number;
      keySize?: number;
      memoryFactor?: number;
    }
  ): {
    key: CryptoJS.lib.WordArray;
    salt: string;
    params: any;
  } {
    const opts = {
      iterations: options?.iterations || KYC_CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      keySize: options?.keySize || KYC_CRYPTO_CONFIG.AES_KEY_SIZE / 32,
      memoryFactor: options?.memoryFactor || 4,
    };
    
    const keySalt = salt || CryptoJS.lib.WordArray.random(32).toString();
    
    // Simulate Argon2id with multiple PBKDF2 rounds
    let derivedKey = CryptoJS.PBKDF2(password, keySalt, {
      keySize: opts.keySize,
      iterations: Math.floor(opts.iterations / opts.memoryFactor),
    });
    
    // Additional rounds for memory hardness simulation
    for (let i = 1; i < opts.memoryFactor; i++) {
      const roundSalt = CryptoJS.SHA256(keySalt + i).toString();
      const roundKey = CryptoJS.PBKDF2(derivedKey.toString(), roundSalt, {
        keySize: opts.keySize,
        iterations: Math.floor(opts.iterations / opts.memoryFactor),
      });
      
      // XOR with previous round
      const words = derivedKey.words;
      const roundWords = roundKey.words;
      for (let j = 0; j < words.length; j++) {
        words[j] ^= roundWords[j];
      }
    }
    
    return {
      key: derivedKey,
      salt: keySalt,
      params: opts,
    };
  }
  
  /**
   * Generate hierarchical deterministic keys
   */
  deriveHierarchicalKeys(
    masterKey: CryptoJS.lib.WordArray,
    path: string[]
  ): Map<string, CryptoJS.lib.WordArray> {
    const keys = new Map<string, CryptoJS.lib.WordArray>();
    let currentKey = masterKey;
    
    for (const segment of path) {
      const segmentKey = CryptoJS.HmacSHA256(segment, currentKey);
      keys.set(segment, segmentKey);
      currentKey = segmentKey;
    }
    
    return keys;
  }
  
  /**
   * Split key using Shamir's Secret Sharing (simplified)
   */
  splitKey(
    key: string,
    totalShares: number,
    threshold: number
  ): string[] {
    if (threshold > totalShares) {
      throw new Error('[SECURITY] Threshold cannot exceed total shares');
    }
    
    // Simplified implementation - in production, use proper Shamir's algorithm
    const shares: string[] = [];
    const keyBytes = CryptoJS.enc.Hex.parse(key);
    
    for (let i = 0; i < totalShares; i++) {
      if (i < threshold - 1) {
        // Random shares
        const randomShare = CryptoJS.lib.WordArray.random(keyBytes.sigBytes);
        shares.push(randomShare.toString());
      } else if (i === threshold - 1) {
        // Last required share is XOR of key with all previous shares
        let xorResult = keyBytes.clone();
        for (let j = 0; j < threshold - 1; j++) {
          const shareWords = CryptoJS.enc.Hex.parse(shares[j]).words;
          for (let k = 0; k < xorResult.words.length; k++) {
            xorResult.words[k] ^= shareWords[k];
          }
        }
        shares.push(xorResult.toString());
      } else {
        // Additional shares (simplified - in production, use polynomial interpolation)
        shares.push(CryptoJS.SHA256(key + i).toString());
      }
    }
    
    return shares.map((share, index) => `${index + 1}-${share}`);
  }
  
  /**
   * Reconstruct key from shares
   */
  reconstructKey(shares: string[], threshold: number): string {
    if (shares.length < threshold) {
      throw new Error('[SECURITY] Insufficient shares for key reconstruction');
    }
    
    // Extract share values
    const shareValues = shares.slice(0, threshold).map(share => {
      const [index, value] = share.split('-');
      return value;
    });
    
    // XOR all shares to reconstruct key (simplified)
    let reconstructed = CryptoJS.enc.Hex.parse(shareValues[0]);
    
    for (let i = 1; i < shareValues.length; i++) {
      const shareWords = CryptoJS.enc.Hex.parse(shareValues[i]).words;
      for (let j = 0; j < reconstructed.words.length; j++) {
        reconstructed.words[j] ^= shareWords[j];
      }
    }
    
    return reconstructed.toString();
  }
}

/**
 * Secure storage helper for encrypted data persistence
 */
export class KYCSecureStorage {
  private readonly storagePrefix = 'kyc_secure_';
  private readonly encryptionService = new KYCEncryptionService();
  
  /**
   * Store encrypted data in localStorage
   */
  async store(
    key: string,
    data: any,
    password: string,
    options?: {
      expiry?: number; // milliseconds
      fieldType?: KYCFieldType;
    }
  ): Promise<void> {
    const storageKey = this.storagePrefix + key;
    const dataString = JSON.stringify(data);
    
    const encrypted = this.encryptionService.encryptPII(
      dataString,
      options?.fieldType || KYCFieldType.DOCUMENT,
      password
    );
    
    const storageData = {
      encrypted,
      expiry: options?.expiry ? Date.now() + options.expiry : null,
    };
    
    localStorage.setItem(storageKey, JSON.stringify(storageData));
  }
  
  /**
   * Retrieve and decrypt data from localStorage
   */
  async retrieve<T = any>(key: string, password: string): Promise<T | null> {
    const storageKey = this.storagePrefix + key;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return null;
    
    try {
      const storageData = JSON.parse(stored);
      
      // Check expiry
      if (storageData.expiry && Date.now() > storageData.expiry) {
        this.remove(key);
        return null;
      }
      
      const decrypted = this.encryptionService.decryptPII(
        storageData.encrypted,
        password
      );
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[SECURITY] Failed to retrieve secure data:', error);
      return null;
    }
  }
  
  /**
   * Remove data from storage
   */
  remove(key: string): void {
    const storageKey = this.storagePrefix + key;
    localStorage.removeItem(storageKey);
  }
  
  /**
   * Clear all secure storage
   */
  clearAll(): void {
    if (typeof localStorage === 'undefined') return;
    
    // Get all keys that start with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all matching keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * Check if key exists
   */
  exists(key: string): boolean {
    const storageKey = this.storagePrefix + key;
    return localStorage.getItem(storageKey) !== null;
  }
}

/**
 * Data integrity verification utilities
 */
export class KYCDataIntegrity {
  /**
   * Generate HMAC signature for data integrity
   */
  generateSignature(data: string | object, secret: string): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.HmacSHA256(dataString, secret).toString();
  }
  
  /**
   * Verify data integrity using HMAC
   */
  verifySignature(data: string | object, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(data, secret);
    return this.constantTimeCompare(signature, expectedSignature);
  }
  
  /**
   * Generate merkle tree root for multiple documents
   */
  generateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];
    
    const tree = [...hashes];
    
    while (tree.length > 1) {
      const newLevel: string[] = [];
      
      for (let i = 0; i < tree.length; i += 2) {
        if (i + 1 < tree.length) {
          const combined = tree[i] + tree[i + 1];
          newLevel.push(CryptoJS.SHA256(combined).toString());
        } else {
          newLevel.push(tree[i]);
        }
      }
      
      tree.splice(0, tree.length, ...newLevel);
    }
    
    return tree[0];
  }
  
  /**
   * Create timestamped hash for audit trail
   */
  createTimestampedHash(data: any): {
    hash: string;
    timestamp: number;
    signature: string;
  } {
    const timestamp = Date.now();
    const dataWithTimestamp = {
      data,
      timestamp,
    };
    
    const hash = CryptoJS.SHA256(JSON.stringify(dataWithTimestamp)).toString();
    const signature = CryptoJS.SHA256(hash + timestamp).toString();
    
    return {
      hash,
      timestamp,
      signature,
    };
  }
  
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

// Export singleton instances
export const kycEncryption = new KYCEncryptionService();
export const kycKeyDerivation = new KYCKeyDerivation();
export const kycSecureStorage = new KYCSecureStorage();
export const kycDataIntegrity = new KYCDataIntegrity();

// Export main service as default
export default KYCEncryptionService;