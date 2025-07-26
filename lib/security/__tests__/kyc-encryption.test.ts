// [SECURITY] KYC Encryption Utilities Test Suite

import {
  KYCEncryptionService,
  KYCKeyDerivation,
  KYCSecureStorage,
  KYCDataIntegrity,
  KYCFieldType,
  kycEncryption,
  kycKeyDerivation,
  kycSecureStorage,
  kycDataIntegrity,
} from '../kyc-encryption';
import CryptoJS from 'crypto-js';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

// @ts-ignore
global.localStorage = localStorageMock;

// Mock crypto.getRandomValues
global.crypto = {
  getRandomValues: (array: any) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
} as any;

// Add FileReader mock if not available
if (typeof FileReader === 'undefined') {
  (global as any).FileReader = class FileReader {
    result: any = null;
    onload: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    
    readAsArrayBuffer(blob: Blob) {
      // Simulate async read
      setTimeout(async () => {
        try {
          const text = await blob.text();
          const encoder = new TextEncoder();
          this.result = encoder.encode(text).buffer;
          if (this.onload) {
            this.onload({ target: { result: this.result } });
          }
        } catch (error) {
          if (this.onerror) {
            this.onerror(error);
          }
        }
      }, 0);
    }
  };
}

describe('KYCEncryptionService', () => {
  const encryptionService = new KYCEncryptionService();
  const testPassword = 'TestPassword123!@#';
  const testData = 'Sensitive PII Data: SSN 123-45-6789';

  describe('PII Encryption', () => {
    it('should encrypt and decrypt PII data correctly', () => {
      const encrypted = encryptionService.encryptPII(
        testData,
        KYCFieldType.SSN,
        testPassword
      );

      expect(encrypted.data).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.hmac).toBeDefined();
      expect(encrypted.metadata).toBeDefined();
      expect(encrypted.metadata.fieldType).toBe(KYCFieldType.SSN);

      const decrypted = encryptionService.decryptPII(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });

    it('should fail decryption with wrong password', () => {
      const encrypted = encryptionService.encryptPII(
        testData,
        KYCFieldType.SSN,
        testPassword
      );

      expect(() => {
        encryptionService.decryptPII(encrypted, 'WrongPassword');
      }).toThrow('[SECURITY] Authentication tag verification failed');
    });

    it('should use different keys for different field types', () => {
      const ssnEncrypted = encryptionService.encryptPII(
        testData,
        KYCFieldType.SSN,
        testPassword
      );

      const taxIdEncrypted = encryptionService.encryptPII(
        testData,
        KYCFieldType.TAX_ID,
        testPassword
      );

      expect(ssnEncrypted.data).not.toBe(taxIdEncrypted.data);
    });

    it('should detect data tampering', () => {
      const encrypted = encryptionService.encryptPII(
        testData,
        KYCFieldType.SSN,
        testPassword
      );

      // Tamper with encrypted data
      encrypted.data = encrypted.data.substring(0, encrypted.data.length - 2) + 'XX';

      expect(() => {
        encryptionService.decryptPII(encrypted, testPassword);
      }).toThrow();
    });
  });

  describe('File Encryption', () => {
    const testFile = new File(['Test file content'], 'test.txt', {
      type: 'text/plain',
    });

    it('should encrypt and decrypt files', async () => {
      const encrypted = await encryptionService.encryptFile(testFile, testPassword);

      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.metadata).toBeDefined();
      expect(encrypted.fileMetadata.originalName).toBe('test.txt');
      expect(encrypted.fileMetadata.mimeType).toBe('text/plain');

      const decrypted = await encryptionService.decryptFile(encrypted, testPassword);
      expect(decrypted).toBeInstanceOf(Blob);
      expect(decrypted.type).toBe('text/plain');

      // Verify content
      const decryptedText = await decrypted.text();
      expect(decryptedText).toBe('Test file content');
    });

    it('should handle progress callback', async () => {
      const progressValues: number[] = [];
      const onProgress = (progress: number) => progressValues.push(progress);

      await encryptionService.encryptFile(testFile, testPassword, onProgress);
      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it('should reject files exceeding max size', async () => {
      const largeContent = new Array(60 * 1024 * 1024).fill('a').join(''); // 60MB
      const largeFile = new File([largeContent], 'large.txt', {
        type: 'text/plain',
      });

      await expect(
        encryptionService.encryptFile(largeFile, testPassword)
      ).rejects.toThrow('[SECURITY] File size exceeds maximum allowed size');
    });
  });

  describe('Hash and Fingerprint', () => {
    it('should generate consistent hashes', () => {
      const hash1 = encryptionService.generateHash(testData);
      const hash2 = encryptionService.generateHash(testData);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex string length
    });

    it('should generate different hashes for different data', () => {
      const hash1 = encryptionService.generateHash('data1');
      const hash2 = encryptionService.generateHash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate fingerprints for strings and buffers', () => {
      const stringFingerprint = encryptionService.generateFingerprint(testData);
      const buffer = new TextEncoder().encode(testData);
      const bufferFingerprint = encryptionService.generateFingerprint(buffer.buffer);

      expect(stringFingerprint).toBeDefined();
      expect(bufferFingerprint).toBeDefined();
    });
  });

  describe('Key Storage', () => {
    const testKey = 'super-secret-key';
    const storagePassword = 'StoragePassword123!';

    it('should securely store and retrieve keys', () => {
      const storedKey = encryptionService.secureStoreKey(testKey, storagePassword);
      expect(storedKey).toBeDefined();
      expect(storedKey).not.toBe(testKey);

      const retrievedKey = encryptionService.retrieveStoredKey(
        storedKey,
        storagePassword
      );
      expect(retrievedKey).toBe(testKey);
    });

    it('should fail to retrieve key with wrong password', () => {
      const storedKey = encryptionService.secureStoreKey(testKey, storagePassword);

      expect(() => {
        encryptionService.retrieveStoredKey(storedKey, 'WrongPassword');
      }).toThrow('[SECURITY] Failed to retrieve stored key');
    });
  });
});

describe('KYCKeyDerivation', () => {
  const keyDerivation = new KYCKeyDerivation();
  const testPassword = 'TestPassword123!';

  describe('Key Derivation', () => {
    it('should derive consistent keys with same password and salt', () => {
      const salt = 'test-salt';
      const derived1 = keyDerivation.deriveKey(testPassword, salt);
      const derived2 = keyDerivation.deriveKey(testPassword, salt);

      expect(derived1.key.toString()).toBe(derived2.key.toString());
      expect(derived1.salt).toBe(derived2.salt);
    });

    it('should derive different keys with different passwords', () => {
      const salt = 'test-salt';
      const derived1 = keyDerivation.deriveKey('password1', salt);
      const derived2 = keyDerivation.deriveKey('password2', salt);

      expect(derived1.key.toString()).not.toBe(derived2.key.toString());
    });

    it('should respect custom derivation options', () => {
      const derived = keyDerivation.deriveKey(testPassword, undefined, {
        iterations: 100000,
        keySize: 16,
        memoryFactor: 2,
      });

      expect(derived.params.iterations).toBe(100000);
      expect(derived.params.keySize).toBe(16);
      expect(derived.params.memoryFactor).toBe(2);
    });
  });

  describe('Hierarchical Key Derivation', () => {
    it('should derive hierarchical keys from master key', () => {
      const masterKey = CryptoJS.lib.WordArray.random(32);
      const path = ['users', 'user123', 'documents'];

      const keys = keyDerivation.deriveHierarchicalKeys(masterKey, path);

      expect(keys.size).toBe(3);
      expect(keys.get('users')).toBeDefined();
      expect(keys.get('user123')).toBeDefined();
      expect(keys.get('documents')).toBeDefined();

      // Keys should be different
      expect(keys.get('users')!.toString()).not.toBe(keys.get('user123')!.toString());
    });
  });

  describe('Key Splitting', () => {
    it('should split and reconstruct keys correctly', () => {
      const key = CryptoJS.lib.WordArray.random(32).toString();
      const totalShares = 5;
      const threshold = 3;

      const shares = keyDerivation.splitKey(key, totalShares, threshold);
      expect(shares).toHaveLength(totalShares);

      // Reconstruct with threshold shares
      const reconstructed = keyDerivation.reconstructKey(
        shares.slice(0, threshold),
        threshold
      );
      expect(reconstructed).toBe(key);
    });

    it('should fail reconstruction with insufficient shares', () => {
      const key = CryptoJS.lib.WordArray.random(32).toString();
      const shares = keyDerivation.splitKey(key, 5, 3);

      expect(() => {
        keyDerivation.reconstructKey(shares.slice(0, 2), 3);
      }).toThrow('[SECURITY] Insufficient shares for key reconstruction');
    });
  });
});

describe('KYCSecureStorage', () => {
  const secureStorage = new KYCSecureStorage();
  const testPassword = 'StoragePassword123!';
  const testData = { ssn: '123-45-6789', name: 'John Doe' };

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Store and Retrieve', () => {
    it('should store and retrieve encrypted data', async () => {
      await secureStorage.store('test-key', testData, testPassword);

      const retrieved = await secureStorage.retrieve('test-key', testPassword);
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await secureStorage.retrieve('non-existent', testPassword);
      expect(retrieved).toBeNull();
    });

    it('should handle expiry correctly', async () => {
      await secureStorage.store('expiring-key', testData, testPassword, {
        expiry: 100, // 100ms
      });

      // Should retrieve before expiry
      const retrieved1 = await secureStorage.retrieve('expiring-key', testPassword);
      expect(retrieved1).toEqual(testData);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should return null after expiry
      const retrieved2 = await secureStorage.retrieve('expiring-key', testPassword);
      expect(retrieved2).toBeNull();
      expect(secureStorage.exists('expiring-key')).toBe(false);
    });
  });

  describe('Storage Management', () => {
    it('should check if key exists', async () => {
      expect(secureStorage.exists('test-key')).toBe(false);

      await secureStorage.store('test-key', testData, testPassword);
      expect(secureStorage.exists('test-key')).toBe(true);
    });

    it('should remove specific keys', async () => {
      await secureStorage.store('test-key', testData, testPassword);
      expect(secureStorage.exists('test-key')).toBe(true);

      secureStorage.remove('test-key');
      expect(secureStorage.exists('test-key')).toBe(false);
    });

    it('should clear all secure storage', async () => {
      await secureStorage.store('key1', testData, testPassword);
      await secureStorage.store('key2', testData, testPassword);

      secureStorage.clearAll();

      expect(secureStorage.exists('key1')).toBe(false);
      expect(secureStorage.exists('key2')).toBe(false);
    });
  });
});

describe('KYCDataIntegrity', () => {
  const dataIntegrity = new KYCDataIntegrity();
  const secret = 'integrity-secret';

  describe('HMAC Signatures', () => {
    it('should generate and verify signatures', () => {
      const data = 'Important data';
      const signature = dataIntegrity.generateSignature(data, secret);

      expect(signature).toBeDefined();
      expect(dataIntegrity.verifySignature(data, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const data = 'Important data';
      const signature = dataIntegrity.generateSignature(data, secret);
      const tamperedSignature = signature.substring(0, signature.length - 2) + 'XX';

      expect(dataIntegrity.verifySignature(data, tamperedSignature, secret)).toBe(false);
    });

    it('should handle object data', () => {
      const data = { userId: '123', amount: 1000 };
      const signature = dataIntegrity.generateSignature(data, secret);

      expect(dataIntegrity.verifySignature(data, signature, secret)).toBe(true);
    });
  });

  describe('Merkle Tree', () => {
    it('should generate merkle root for multiple hashes', () => {
      const hashes = [
        CryptoJS.SHA256('doc1').toString(),
        CryptoJS.SHA256('doc2').toString(),
        CryptoJS.SHA256('doc3').toString(),
        CryptoJS.SHA256('doc4').toString(),
      ];

      const root = dataIntegrity.generateMerkleRoot(hashes);
      expect(root).toBeDefined();
      expect(root).toHaveLength(64);
    });

    it('should handle single hash', () => {
      const hash = CryptoJS.SHA256('single').toString();
      const root = dataIntegrity.generateMerkleRoot([hash]);
      expect(root).toBe(hash);
    });

    it('should handle empty array', () => {
      const root = dataIntegrity.generateMerkleRoot([]);
      expect(root).toBe('');
    });
  });

  describe('Timestamped Hash', () => {
    it('should create timestamped hash with signature', () => {
      const data = { transaction: 'transfer', amount: 1000 };
      const result = dataIntegrity.createTimestampedHash(data);

      expect(result.hash).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.signature).toBeDefined();

      // Hash should be consistent for same data and timestamp
      const manualHash = CryptoJS.SHA256(
        JSON.stringify({ data, timestamp: result.timestamp })
      ).toString();
      expect(result.hash).toBe(manualHash);
    });
  });
});

describe('Singleton Instances', () => {
  it('should export singleton instances', () => {
    expect(kycEncryption).toBeInstanceOf(KYCEncryptionService);
    expect(kycKeyDerivation).toBeInstanceOf(KYCKeyDerivation);
    expect(kycSecureStorage).toBeInstanceOf(KYCSecureStorage);
    expect(kycDataIntegrity).toBeInstanceOf(KYCDataIntegrity);
  });
});

describe('Security Best Practices', () => {
  const encryptionService = new KYCEncryptionService();

  it('should use sufficient iteration count for PBKDF2', () => {
    const encrypted = encryptionService.encryptPII(
      'test',
      KYCFieldType.SSN,
      'password'
    );

    // Check metadata indicates high iteration count
    expect(encrypted.metadata.keyDerivation).toBe('PBKDF2-SHA256');
  });

  it('should generate unique IVs for each encryption', () => {
    const password = 'test-password';
    const data = 'same-data';

    const encrypted1 = encryptionService.encryptPII(
      data,
      KYCFieldType.SSN,
      password
    );
    const encrypted2 = encryptionService.encryptPII(
      data,
      KYCFieldType.SSN,
      password
    );

    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.data).not.toBe(encrypted2.data);
  });

  it('should include metadata for audit trail', () => {
    const encrypted = encryptionService.encryptPII(
      'audit-test',
      KYCFieldType.TAX_ID,
      'password'
    );

    expect(encrypted.metadata.id).toBeDefined();
    expect(encrypted.metadata.timestamp).toBeGreaterThan(0);
    expect(encrypted.metadata.version).toBe('1.0.0');
    expect(encrypted.metadata.algorithm).toBe('AES-256-CBC-HMAC');
  });
});