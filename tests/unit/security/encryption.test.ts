import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

/**
 * Security Unit Tests - Encryption Functions
 * Tests cryptographic operations without requiring backend
 */

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private saltLength = 32;

  /**
   * Derive encryption key from password using PBKDF2
   */
  deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  encrypt(data: string, password: string): {
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  } {
    const salt = crypto.randomBytes(this.saltLength);
    const key = this.deriveKey(password, salt);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decrypt(encryptedData: {
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  }, password: string): string {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = this.deriveKey(password, salt);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

describe('Security: Encryption Functions', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('AES-256-GCM Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'Sensitive user data: SSN 123-45-6789';
      const password = 'strong-password-123!@#';
      
      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
      expect(encrypted.encrypted).not.toBe(plaintext);
    });

    it('should generate unique encryption for same data', () => {
      const plaintext = 'Test data';
      const password = 'password123';
      
      const encrypted1 = encryptionService.encrypt(plaintext, password);
      const encrypted2 = encryptionService.encrypt(plaintext, password);
      
      // Different IVs should produce different ciphertexts
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1, password)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2, password)).toBe(plaintext);
    });

    it('should fail decryption with wrong password', () => {
      const plaintext = 'Secret data';
      const rightPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      const encrypted = encryptionService.encrypt(plaintext, rightPassword);
      
      expect(() => {
        encryptionService.decrypt(encrypted, wrongPassword);
      }).toThrow();
    });

    it('should detect tampering via authentication tag', () => {
      const plaintext = 'Important data';
      const password = 'password123';
      
      const encrypted = encryptionService.encrypt(plaintext, password);
      
      // Tamper with encrypted data
      const tampered = {
        ...encrypted,
        encrypted: encrypted.encrypted.slice(0, -2) + 'ff'
      };
      
      expect(() => {
        encryptionService.decrypt(tampered, password);
      }).toThrow();
    });

    it('should handle large data encryption', () => {
      const largeData = 'x'.repeat(10000);
      const password = 'test-password';
      
      const encrypted = encryptionService.encrypt(largeData, password);
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(largeData);
    });
  });

  describe('Key Derivation (PBKDF2)', () => {
    it('should derive consistent keys from same password and salt', () => {
      const password = 'user-password';
      const salt = Buffer.from('fixed-salt-value');
      
      const key1 = encryptionService.deriveKey(password, salt);
      const key2 = encryptionService.deriveKey(password, salt);
      
      expect(key1.toString('hex')).toBe(key2.toString('hex'));
    });

    it('should derive different keys with different salts', () => {
      const password = 'user-password';
      const salt1 = crypto.randomBytes(32);
      const salt2 = crypto.randomBytes(32);
      
      const key1 = encryptionService.deriveKey(password, salt1);
      const key2 = encryptionService.deriveKey(password, salt2);
      
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });

    it('should derive different keys for different passwords', () => {
      const salt = Buffer.from('fixed-salt');
      const password1 = 'password1';
      const password2 = 'password2';
      
      const key1 = encryptionService.deriveKey(password1, salt);
      const key2 = encryptionService.deriveKey(password2, salt);
      
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });
  });

  describe('Hashing (SHA-256)', () => {
    it('should produce consistent hashes', () => {
      const data = 'test-data';
      
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different data', () => {
      const data1 = 'data1';
      const data2 = 'data2';
      
      const hash1 = encryptionService.hash(data1);
      const hash2 = encryptionService.hash(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty input', () => {
      const hash = encryptionService.hash('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  describe('Token Generation', () => {
    it('should generate tokens of specified length', () => {
      const token16 = encryptionService.generateToken(16);
      const token32 = encryptionService.generateToken(32);
      const token64 = encryptionService.generateToken(64);
      
      expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token32.length).toBe(64); // 32 bytes = 64 hex chars
      expect(token64.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(encryptionService.generateToken());
      }
      
      expect(tokens.size).toBe(100);
    });

    it('should only use hex characters', () => {
      const token = encryptionService.generateToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('Timing-Safe Comparison', () => {
    it('should correctly compare equal strings', () => {
      const str1 = 'secret-token-123';
      const str2 = 'secret-token-123';
      
      expect(encryptionService.secureCompare(str1, str2)).toBe(true);
    });

    it('should correctly identify different strings', () => {
      const str1 = 'token-123';
      const str2 = 'token-456';
      
      expect(encryptionService.secureCompare(str1, str2)).toBe(false);
    });

    it('should handle different lengths', () => {
      const str1 = 'short';
      const str2 = 'longer-string';
      
      expect(encryptionService.secureCompare(str1, str2)).toBe(false);
    });
  });

  describe('Security Validations', () => {
    it('should validate encryption output format', () => {
      const plaintext = 'test';
      const password = 'password';
      
      const encrypted = encryptionService.encrypt(plaintext, password);
      
      // Validate hex format
      expect(encrypted.encrypted).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.salt).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.iv).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.tag).toMatch(/^[0-9a-f]+$/);
      
      // Validate lengths
      expect(encrypted.salt.length).toBe(64); // 32 bytes
      expect(encrypted.iv.length).toBe(32); // 16 bytes
      expect(encrypted.tag.length).toBe(32); // 16 bytes
    });

    it('should handle special characters in plaintext', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~\n\t\r';
      const password = 'test-password';
      
      const encrypted = encryptionService.encrypt(specialChars, password);
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界 🌍 مرحبا بالعالم';
      const password = 'test-password';
      
      const encrypted = encryptionService.encrypt(unicode, password);
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(unicode);
    });
  });
});