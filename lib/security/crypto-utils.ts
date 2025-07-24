import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// Cryptographic configuration
export const CRYPTO_CONFIG = {
  AES_KEY_SIZE: 256,
  PBKDF2_ITERATIONS: 100000,
  SALT_SIZE: 128,
  IV_SIZE: 128,
  HMAC_KEY_SIZE: 256,
  RSA_KEY_SIZE: 2048,
};

// Encryption result interface
export interface EncryptionResult {
  data: string;
  salt?: string;
  iv: string;
  hmac?: string;
}

// Key derivation result
export interface DerivedKey {
  key: CryptoJS.lib.WordArray;
  salt: string;
}

// Secure random number generation
export class SecureRandom {
  private static instance: SecureRandom;
  
  private constructor() {}
  
  static getInstance(): SecureRandom {
    if (!SecureRandom.instance) {
      SecureRandom.instance = new SecureRandom();
    }
    return SecureRandom.instance;
  }
  
  // Generate cryptographically secure random bytes
  generateBytes(size: number): Uint8Array {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Use Web Crypto API
      const array = new Uint8Array(size);
      window.crypto.getRandomValues(array);
      return array;
    } else {
      // Fallback to CryptoJS (less secure but functional)
      const wordArray = CryptoJS.lib.WordArray.random(size);
      return new Uint8Array(wordArray.words.flatMap(word => [
        (word >> 24) & 0xff,
        (word >> 16) & 0xff,
        (word >> 8) & 0xff,
        word & 0xff
      ]).slice(0, size));
    }
  }
  
  // Generate secure random string
  generateString(length: number): string {
    const bytes = this.generateBytes(Math.ceil(length * 3 / 4));
    return CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.create(Array.from(bytes)))
      .replace(/[+/]/g, c => c === '+' ? '-' : '_')
      .replace(/=/g, '')
      .slice(0, length);
  }
  
  // Generate UUID v4
  generateUUID(): string {
    return uuidv4();
  }
  
  // Generate secure random number
  generateNumber(min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
    const range = max - min;
    const bytes = this.generateBytes(8);
    const value = bytes.reduce((acc, byte, i) => acc + byte * Math.pow(256, i), 0);
    return min + (value % range);
  }
}

// Advanced encryption service
export class AdvancedEncryption {
  private secureRandom = SecureRandom.getInstance();
  
  // Derive key from password using PBKDF2
  deriveKey(password: string, salt?: string): DerivedKey {
    const saltStr = salt || CryptoJS.lib.WordArray.random(CRYPTO_CONFIG.SALT_SIZE / 8).toString();
    const key = CryptoJS.PBKDF2(password, saltStr, {
      keySize: CRYPTO_CONFIG.AES_KEY_SIZE / 32,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
    });
    
    return { key, salt: saltStr };
  }
  
  // Encrypt data with AES-256-GCM equivalent (using CBC + HMAC)
  encryptData(
    data: string,
    password: string,
    options: { includeSalt?: boolean; includeHMAC?: boolean } = {}
  ): EncryptionResult {
    const { includeSalt = true, includeHMAC = true } = options;
    
    // Derive encryption key
    const derived = this.deriveKey(password, includeSalt ? undefined : 'fixed-salt');
    
    // Generate IV
    const iv = CryptoJS.lib.WordArray.random(CRYPTO_CONFIG.IV_SIZE / 8);
    
    // Encrypt data
    const encrypted = CryptoJS.AES.encrypt(data, derived.key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    let result: EncryptionResult = {
      data: encrypted.toString(),
      iv: iv.toString(),
    };
    
    if (includeSalt) {
      result.salt = derived.salt;
    }
    
    // Add HMAC for integrity
    if (includeHMAC) {
      const hmacKey = CryptoJS.PBKDF2(password + 'hmac', derived.salt, {
        keySize: CRYPTO_CONFIG.HMAC_KEY_SIZE / 32,
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      });
      
      const hmac = CryptoJS.HmacSHA256(result.data + result.iv, hmacKey);
      result.hmac = hmac.toString();
    }
    
    return result;
  }
  
  // Decrypt data
  decryptData(
    encryptionResult: EncryptionResult,
    password: string
  ): string {
    // Derive key
    const derived = this.deriveKey(password, encryptionResult.salt);
    
    // Verify HMAC if present
    if (encryptionResult.hmac) {
      const hmacKey = CryptoJS.PBKDF2(password + 'hmac', encryptionResult.salt || 'fixed-salt', {
        keySize: CRYPTO_CONFIG.HMAC_KEY_SIZE / 32,
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      });
      
      const expectedHmac = CryptoJS.HmacSHA256(
        encryptionResult.data + encryptionResult.iv,
        hmacKey
      ).toString();
      
      if (expectedHmac !== encryptionResult.hmac) {
        throw new Error('HMAC verification failed - data may be corrupted or tampered');
      }
    }
    
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptionResult.data, derived.key, {
      iv: CryptoJS.enc.Hex.parse(encryptionResult.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
  
  // Encrypt JSON data
  encryptJSON(obj: any, password: string): EncryptionResult {
    const jsonString = JSON.stringify(obj);
    return this.encryptData(jsonString, password);
  }
  
  // Decrypt JSON data
  decryptJSON<T = any>(encryptionResult: EncryptionResult, password: string): T {
    const jsonString = this.decryptData(encryptionResult, password);
    return JSON.parse(jsonString);
  }
}

// Message integrity verification
export class MessageIntegrity {
  // Create HMAC signature
  createSignature(message: string, key: string): string {
    return CryptoJS.HmacSHA256(message, key).toString();
  }
  
  // Verify HMAC signature
  verifySignature(message: string, signature: string, key: string): boolean {
    const expectedSignature = this.createSignature(message, key);
    return this.constantTimeCompare(signature, expectedSignature);
  }
  
  // Constant-time string comparison to prevent timing attacks
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
  
  // Create message with embedded signature
  signMessage(message: string, key: string): string {
    const signature = this.createSignature(message, key);
    return JSON.stringify({ message, signature, timestamp: Date.now() });
  }
  
  // Verify and extract message
  verifyMessage(signedMessage: string, key: string, maxAge?: number): string | null {
    try {
      const parsed = JSON.parse(signedMessage);
      
      // Check age if specified
      if (maxAge && (Date.now() - parsed.timestamp) > maxAge) {
        return null;
      }
      
      // Verify signature
      if (!this.verifySignature(parsed.message, parsed.signature, key)) {
        return null;
      }
      
      return parsed.message;
    } catch {
      return null;
    }
  }
}

// Digital signature verification (using ECDSA simulation)
export class DigitalSignature {
  // Generate key pair (simulation using deterministic generation)
  generateKeyPair(seed?: string): { privateKey: string; publicKey: string } {
    const seedValue = seed || SecureRandom.getInstance().generateString(64);
    
    // Generate private key from seed
    const privateKey = CryptoJS.SHA256(seedValue + 'private').toString();
    
    // Generate public key from private key (simplified)
    const publicKey = CryptoJS.SHA256(privateKey + 'public').toString();
    
    return { privateKey, publicKey };
  }
  
  // Sign message with private key
  signMessage(message: string, privateKey: string): string {
    const hash = CryptoJS.SHA256(message).toString();
    
    // Simulate ECDSA signature
    const r = CryptoJS.HmacSHA256(hash + 'r', privateKey).toString().slice(0, 64);
    const s = CryptoJS.HmacSHA256(hash + 's', privateKey).toString().slice(0, 64);
    
    return r + s;
  }
  
  // Verify signature with public key
  verifySignature(message: string, signature: string, publicKey: string): boolean {
    if (signature.length !== 128) return false;
    
    const hash = CryptoJS.SHA256(message).toString();
    const r = signature.slice(0, 64);
    const s = signature.slice(64, 128);
    
    // Derive private key from public key (for verification simulation)
    const derivedPrivateKey = CryptoJS.SHA256(publicKey.replace('public', 'private')).toString();
    
    // Verify signature components
    const expectedR = CryptoJS.HmacSHA256(hash + 'r', derivedPrivateKey).toString().slice(0, 64);
    const expectedS = CryptoJS.HmacSHA256(hash + 's', derivedPrivateKey).toString().slice(0, 64);
    
    return r === expectedR && s === expectedS;
  }
}

// Client-side sensitive data encryption
export class SensitiveDataCrypto {
  private encryption = new AdvancedEncryption();
  private secureRandom = SecureRandom.getInstance();
  
  // Encrypt personal information
  encryptPersonalInfo(data: {
    ssn?: string;
    taxId?: string;
    bankAccount?: string;
    creditCard?: string;
    [key: string]: any;
  }, masterPassword: string): Record<string, EncryptionResult> {
    const encrypted: Record<string, EncryptionResult> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'string') {
        // Use key-specific password derivation
        const keySpecificPassword = CryptoJS.SHA256(masterPassword + key).toString();
        encrypted[key] = this.encryption.encryptData(value, keySpecificPassword);
      }
    }
    
    return encrypted;
  }
  
  // Decrypt personal information
  decryptPersonalInfo(
    encryptedData: Record<string, EncryptionResult>,
    masterPassword: string
  ): Record<string, string> {
    const decrypted: Record<string, string> = {};
    
    for (const [key, encryptionResult] of Object.entries(encryptedData)) {
      try {
        const keySpecificPassword = CryptoJS.SHA256(masterPassword + key).toString();
        decrypted[key] = this.encryption.decryptData(encryptionResult, keySpecificPassword);
      } catch (error) {
        console.error(`Failed to decrypt ${key}:`, error);
      }
    }
    
    return decrypted;
  }
  
  // Encrypt financial data
  encryptFinancialData(data: {
    amount?: number;
    accountNumber?: string;
    routingNumber?: string;
    [key: string]: any;
  }, password: string): EncryptionResult {
    return this.encryption.encryptJSON(data, password);
  }
  
  // Generate secure backup codes
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = this.secureRandom.generateString(8).toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }
  
  // Encrypt backup codes
  encryptBackupCodes(codes: string[], password: string): EncryptionResult {
    return this.encryption.encryptJSON(codes, password);
  }
}

// Export singletons
export const secureRandom = SecureRandom.getInstance();
export const advancedEncryption = new AdvancedEncryption();
export const messageIntegrity = new MessageIntegrity();
export const digitalSignature = new DigitalSignature();
export const sensitiveDataCrypto = new SensitiveDataCrypto();