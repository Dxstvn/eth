import CryptoJS from 'crypto-js'
import { 
  KYCEncryption,
  KYCFieldType,
  KYC_CRYPTO_CONFIG,
  EncryptionMetadata
} from '../kyc-encryption'
import { AdvancedEncryption } from '../crypto-utils'

// Mock crypto-utils
jest.mock('../crypto-utils', () => ({
  AdvancedEncryption: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    verifyIntegrity: jest.fn()
  },
  SecureRandom: {
    generateBytes: jest.fn().mockImplementation((size) => {
      return CryptoJS.lib.WordArray.random(size / 8).toString(CryptoJS.enc.Hex)
    })
  }
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234')
}))

describe('KYCEncryption', () => {
  const testPassword = 'test-password-123'
  const testUserId = 'user-456'
  let kycEncryption: KYCEncryption

  beforeEach(() => {
    jest.clearAllMocks()
    kycEncryption = new KYCEncryption()
    
    // Mock successful encryption/decryption
    ;(AdvancedEncryption.encrypt as jest.Mock).mockReturnValue({
      encrypted: 'mock-encrypted-data',
      salt: 'mock-salt',
      iv: 'mock-iv',
      authTag: 'mock-auth-tag',
      metadata: {
        algorithm: 'AES-256-CBC',
        iterations: KYC_CRYPTO_CONFIG.PBKDF2_ITERATIONS
      }
    })
    
    ;(AdvancedEncryption.decrypt as jest.Mock).mockReturnValue('decrypted-data')
    ;(AdvancedEncryption.verifyIntegrity as jest.Mock).mockReturnValue(true)
  })

  describe('Initialization', () => {
    it('initializes with master key', async () => {
      const result = await kycEncryption.initialize(testPassword, testUserId)
      
      expect(result).toBe(true)
      expect(kycEncryption.isInitialized()).toBe(true)
    })

    it('generates consistent keys for same inputs', async () => {
      await kycEncryption.initialize(testPassword, testUserId)
      const masterKey1 = (kycEncryption as any).masterKey
      
      const kycEncryption2 = new KYCEncryption()
      await kycEncryption2.initialize(testPassword, testUserId)
      const masterKey2 = (kycEncryption2 as any).masterKey
      
      expect(masterKey1).toBe(masterKey2)
    })

    it('generates different keys for different passwords', async () => {
      await kycEncryption.initialize(testPassword, testUserId)
      const masterKey1 = (kycEncryption as any).masterKey
      
      const kycEncryption2 = new KYCEncryption()
      await kycEncryption2.initialize('different-password', testUserId)
      const masterKey2 = (kycEncryption2 as any).masterKey
      
      expect(masterKey1).not.toBe(masterKey2)
    })

    it('prevents operations when not initialized', async () => {
      await expect(kycEncryption.encryptField('test', KYCFieldType.SSN))
        .rejects.toThrow('KYC encryption not initialized')
    })
  })

  describe('Field Encryption', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('encrypts field data with metadata', async () => {
      const data = '123-45-6789'
      const result = await kycEncryption.encryptField(data, KYCFieldType.SSN)
      
      expect(result).toHaveProperty('encrypted')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toMatchObject({
        fieldType: KYCFieldType.SSN,
        encryptedAt: expect.any(String),
        version: '1.0'
      })
    })

    it('handles different field types', async () => {
      const fieldTypes = [
        { type: KYCFieldType.SSN, data: '123-45-6789' },
        { type: KYCFieldType.EMAIL, data: 'test@example.com' },
        { type: KYCFieldType.PHONE, data: '+1234567890' },
        { type: KYCFieldType.DATE_OF_BIRTH, data: '1990-01-01' }
      ]
      
      for (const { type, data } of fieldTypes) {
        const result = await kycEncryption.encryptField(data, type)
        expect(result.metadata.fieldType).toBe(type)
        expect(AdvancedEncryption.encrypt).toHaveBeenCalled()
      }
    })

    it('masks sensitive data appropriately', async () => {
      const ssnResult = await kycEncryption.encryptField('123-45-6789', KYCFieldType.SSN)
      expect(ssnResult.metadata.maskedValue).toBe('***-**-6789')
      
      const emailResult = await kycEncryption.encryptField('test@example.com', KYCFieldType.EMAIL)
      expect(emailResult.metadata.maskedValue).toBe('t***@example.com')
      
      const phoneResult = await kycEncryption.encryptField('+1234567890', KYCFieldType.PHONE)
      expect(phoneResult.metadata.maskedValue).toBe('+1*******90')
    })

    it('generates unique field keys for each field type', async () => {
      const encryptMock = AdvancedEncryption.encrypt as jest.Mock
      
      await kycEncryption.encryptField('data1', KYCFieldType.SSN)
      const key1 = encryptMock.mock.calls[0][1]
      
      await kycEncryption.encryptField('data2', KYCFieldType.EMAIL)
      const key2 = encryptMock.mock.calls[1][1]
      
      expect(key1).not.toBe(key2)
    })
  })

  describe('Field Decryption', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('decrypts encrypted field data', async () => {
      const originalData = 'test@example.com'
      ;(AdvancedEncryption.decrypt as jest.Mock).mockReturnValue(originalData)
      
      const encrypted = await kycEncryption.encryptField(originalData, KYCFieldType.EMAIL)
      const decrypted = await kycEncryption.decryptField(encrypted)
      
      expect(decrypted).toBe(originalData)
    })

    it('verifies data integrity before decryption', async () => {
      const encrypted = await kycEncryption.encryptField('test-data', KYCFieldType.SSN)
      
      ;(AdvancedEncryption.verifyIntegrity as jest.Mock).mockReturnValue(false)
      
      await expect(kycEncryption.decryptField(encrypted))
        .rejects.toThrow('Data integrity verification failed')
    })

    it('handles version compatibility', async () => {
      const encrypted = await kycEncryption.encryptField('test-data', KYCFieldType.SSN)
      encrypted.metadata.version = '2.0' // Future version
      
      await expect(kycEncryption.decryptField(encrypted))
        .rejects.toThrow('Unsupported encryption version')
    })
  })

  describe('File Encryption', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('encrypts file data', async () => {
      const fileData = new ArrayBuffer(1024)
      const file = new File([fileData], 'test.pdf', { type: 'application/pdf' })
      
      const result = await kycEncryption.encryptFile(file, KYCFieldType.DOCUMENT)
      
      expect(result).toHaveProperty('encryptedData')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toMatchObject({
        fieldType: KYCFieldType.DOCUMENT,
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      })
    })

    it('rejects files exceeding size limit', async () => {
      const largeData = new ArrayBuffer(KYC_CRYPTO_CONFIG.MAX_FILE_SIZE + 1)
      const file = new File([largeData], 'large.pdf', { type: 'application/pdf' })
      
      await expect(kycEncryption.encryptFile(file, KYCFieldType.DOCUMENT))
        .rejects.toThrow('File size exceeds maximum allowed')
    })

    it('chunks large files for encryption', async () => {
      const fileSize = KYC_CRYPTO_CONFIG.FILE_CHUNK_SIZE * 2.5
      const fileData = new ArrayBuffer(fileSize)
      const file = new File([fileData], 'medium.pdf', { type: 'application/pdf' })
      
      const result = await kycEncryption.encryptFile(file, KYCFieldType.DOCUMENT)
      
      expect(result.metadata.chunks).toBe(3)
      expect(result.metadata.chunkSize).toBe(KYC_CRYPTO_CONFIG.FILE_CHUNK_SIZE)
    })

    it('includes file hash for integrity', async () => {
      const fileData = new ArrayBuffer(1024)
      const file = new File([fileData], 'test.pdf', { type: 'application/pdf' })
      
      const result = await kycEncryption.encryptFile(file, KYCFieldType.DOCUMENT)
      
      expect(result.metadata.fileHash).toBeDefined()
      expect(result.metadata.fileHash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hash
    })
  })

  describe('File Decryption', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('decrypts encrypted file data', async () => {
      const originalData = new ArrayBuffer(1024)
      const file = new File([originalData], 'test.pdf', { type: 'application/pdf' })
      
      // Mock file read
      jest.spyOn(File.prototype, 'arrayBuffer').mockResolvedValue(originalData)
      ;(AdvancedEncryption.decrypt as jest.Mock).mockReturnValue(originalData)
      
      const encrypted = await kycEncryption.encryptFile(file, KYCFieldType.DOCUMENT)
      const decrypted = await kycEncryption.decryptFile(encrypted)
      
      expect(decrypted).toBeInstanceOf(File)
      expect(decrypted.name).toBe('test.pdf')
      expect(decrypted.type).toBe('application/pdf')
    })

    it('verifies file integrity after decryption', async () => {
      const fileData = new ArrayBuffer(1024)
      const file = new File([fileData], 'test.pdf', { type: 'application/pdf' })
      
      jest.spyOn(File.prototype, 'arrayBuffer').mockResolvedValue(fileData)
      
      const encrypted = await kycEncryption.encryptFile(file, KYCFieldType.DOCUMENT)
      
      // Tamper with file hash
      encrypted.metadata.fileHash = 'tampered-hash'
      
      await expect(kycEncryption.decryptFile(encrypted))
        .rejects.toThrow('File integrity verification failed')
    })
  })

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('encrypts multiple fields in batch', async () => {
      const fields = [
        { data: '123-45-6789', type: KYCFieldType.SSN },
        { data: 'test@example.com', type: KYCFieldType.EMAIL },
        { data: '+1234567890', type: KYCFieldType.PHONE }
      ]
      
      const results = await kycEncryption.encryptBatch(fields)
      
      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.metadata.fieldType).toBe(fields[index].type)
      })
    })

    it('decrypts multiple fields in batch', async () => {
      const fields = [
        { data: '123-45-6789', type: KYCFieldType.SSN },
        { data: 'test@example.com', type: KYCFieldType.EMAIL }
      ]
      
      const encrypted = await kycEncryption.encryptBatch(fields)
      
      ;(AdvancedEncryption.decrypt as jest.Mock)
        .mockReturnValueOnce(fields[0].data)
        .mockReturnValueOnce(fields[1].data)
      
      const decrypted = await kycEncryption.decryptBatch(encrypted)
      
      expect(decrypted).toEqual(['123-45-6789', 'test@example.com'])
    })
  })

  describe('Key Rotation', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('supports key rotation', async () => {
      const data = 'sensitive-data'
      const encrypted = await kycEncryption.encryptField(data, KYCFieldType.SSN)
      
      // Rotate keys
      const newPassword = 'new-password-456'
      const rotated = await kycEncryption.rotateKeys(newPassword, [encrypted])
      
      // Re-initialize with new password
      const newKycEncryption = new KYCEncryption()
      await newKycEncryption.initialize(newPassword, testUserId)
      
      ;(AdvancedEncryption.decrypt as jest.Mock).mockReturnValue(data)
      
      const decrypted = await newKycEncryption.decryptField(rotated[0])
      expect(decrypted).toBe(data)
    })

    it('maintains audit trail during rotation', async () => {
      const encrypted = await kycEncryption.encryptField('test', KYCFieldType.SSN)
      const originalMetadata = { ...encrypted.metadata }
      
      const rotated = await kycEncryption.rotateKeys('new-password', [encrypted])
      
      expect(rotated[0].metadata).toMatchObject({
        ...originalMetadata,
        rotatedAt: expect.any(String),
        previousVersion: originalMetadata.version
      })
    })
  })

  describe('Security Features', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('prevents timing attacks with constant-time comparison', async () => {
      const encrypted = await kycEncryption.encryptField('test', KYCFieldType.SSN)
      
      // Mock to simulate timing attack
      const startTime = Date.now()
      await kycEncryption.verifyFingerprint(encrypted, 'wrong-fingerprint')
      const wrongTime = Date.now() - startTime
      
      const correctTime = Date.now()
      await kycEncryption.verifyFingerprint(encrypted, encrypted.metadata.fingerprint!)
      const rightTime = Date.now() - correctTime
      
      // Times should be similar (constant-time comparison)
      expect(Math.abs(wrongTime - rightTime)).toBeLessThan(5)
    })

    it('implements secure key derivation', async () => {
      const key = await (kycEncryption as any).deriveFieldKey(KYCFieldType.SSN)
      
      // Key should be properly derived
      expect(key).toBeDefined()
      expect(key.sigBytes * 8).toBe(KYC_CRYPTO_CONFIG.FIELD_KEY_SIZE)
    })

    it('clears sensitive data from memory', async () => {
      const encrypted = await kycEncryption.encryptField('sensitive', KYCFieldType.SSN)
      
      await kycEncryption.destroy()
      
      expect((kycEncryption as any).masterKey).toBeNull()
      expect((kycEncryption as any).fieldKeys.size).toBe(0)
      expect(kycEncryption.isInitialized()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('handles encryption failures gracefully', async () => {
      ;(AdvancedEncryption.encrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed')
      })
      
      await expect(kycEncryption.encryptField('test', KYCFieldType.SSN))
        .rejects.toThrow('Failed to encrypt field')
    })

    it('handles decryption failures gracefully', async () => {
      const encrypted = await kycEncryption.encryptField('test', KYCFieldType.SSN)
      
      ;(AdvancedEncryption.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed')
      })
      
      await expect(kycEncryption.decryptField(encrypted))
        .rejects.toThrow('Failed to decrypt field')
    })

    it('validates input data', async () => {
      await expect(kycEncryption.encryptField('', KYCFieldType.SSN))
        .rejects.toThrow('Data cannot be empty')
      
      await expect(kycEncryption.encryptField(null as any, KYCFieldType.SSN))
        .rejects.toThrow('Invalid data provided')
    })
  })

  describe('Compliance Features', () => {
    beforeEach(async () => {
      await kycEncryption.initialize(testPassword, testUserId)
    })

    it('supports data retention policies', async () => {
      const encrypted = await kycEncryption.encryptField('test', KYCFieldType.SSN)
      
      // Set retention period
      encrypted.metadata.retentionUntil = new Date(Date.now() - 1000).toISOString()
      
      await expect(kycEncryption.decryptField(encrypted))
        .rejects.toThrow('Data retention period expired')
    })

    it('implements access control', async () => {
      const encrypted = await kycEncryption.encryptField('test', KYCFieldType.SSN, {
        allowedUsers: ['user-789']
      })
      
      // Try to decrypt with different user
      await expect(kycEncryption.decryptField(encrypted))
        .rejects.toThrow('Access denied')
    })

    it('maintains audit log', async () => {
      const auditLog: any[] = []
      kycEncryption.onAuditEvent((event) => auditLog.push(event))
      
      await kycEncryption.encryptField('test', KYCFieldType.SSN)
      
      expect(auditLog).toContainEqual(
        expect.objectContaining({
          action: 'encrypt',
          fieldType: KYCFieldType.SSN,
          timestamp: expect.any(String),
          userId: testUserId
        })
      )
    })
  })
})