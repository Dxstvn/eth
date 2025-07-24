import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  generateKey,
  encryptFile,
  decryptFile,
  exportKey,
  importKey,
  createMockCryptoUtils
} from '../crypto-utils'

// Mock crypto.subtle for testing
const mockSubtle = {
  generateKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  exportKey: vi.fn(),
  importKey: vi.fn(),
}

const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: vi.fn((arr: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i % 256
    }
    return arr
  }),
}

// Replace global crypto and window.crypto
Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true,
})

Object.defineProperty(window, 'crypto', {
  value: mockCrypto,
  writable: true,
})

describe('crypto-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateKey', () => {
    it('should generate AES-GCM key', async () => {
      const mockKey = { type: 'secret', algorithm: { name: 'AES-GCM' } }
      mockSubtle.generateKey.mockResolvedValue(mockKey)

      const result = await generateKey()
      
      expect(mockSubtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      )
      expect(result).toEqual(mockKey)
    })

    it('should handle key generation failure', async () => {
      mockSubtle.generateKey.mockRejectedValue(new Error('Key generation failed'))

      await expect(generateKey()).rejects.toThrow('Key generation failed')
    })
  })

  describe('exportKey', () => {
    it('should export key to hex string', async () => {
      const mockKey = { type: 'secret' } as CryptoKey
      const mockRawKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      
      mockSubtle.exportKey.mockResolvedValue(mockRawKey.buffer)

      const result = await exportKey(mockKey)

      expect(mockSubtle.exportKey).toHaveBeenCalledWith('raw', mockKey)
      expect(result).toBe('0102030405060708')
    })

    it('should handle export failure', async () => {
      const mockKey = { type: 'secret' } as CryptoKey
      mockSubtle.exportKey.mockRejectedValue(new Error('Export failed'))

      await expect(exportKey(mockKey)).rejects.toThrow('Export failed')
    })
  })

  describe('importKey', () => {
    it('should import key from hex string', async () => {
      const hexKey = '0102030405060708'
      const mockKey = { type: 'secret', algorithm: { name: 'AES-GCM' } }
      
      mockSubtle.importKey.mockResolvedValue(mockKey)

      const result = await importKey(hexKey)

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt', 'decrypt']
      )
      expect(result).toEqual(mockKey)
    })

    it('should handle import failure', async () => {
      mockSubtle.importKey.mockRejectedValue(new Error('Import failed'))

      await expect(importKey('0102030405060708')).rejects.toThrow('Import failed')
    })

    it('should handle invalid hex string', async () => {
      const invalidHex = 'invalid-hex'
      mockSubtle.importKey.mockResolvedValue({ type: 'secret' })

      const result = await importKey(invalidHex)

      // For invalid hex, it should still try to import with parsed bytes
      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt', 'decrypt']
      )
    })
  })

  describe('encryptFile', () => {
    it('should encrypt file successfully', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const mockKey = { type: 'secret' }
      const mockEncryptedBuffer = new Uint8Array([10, 11, 12, 13, 14, 15])
      const mockRawKey = new Uint8Array([1, 2, 3, 4])

      mockSubtle.generateKey.mockResolvedValue(mockKey)
      mockSubtle.encrypt.mockResolvedValue(mockEncryptedBuffer.buffer)
      mockSubtle.exportKey.mockResolvedValue(mockRawKey.buffer)

      // Mock File.arrayBuffer() by adding it to the File prototype
      Object.defineProperty(testFile, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer)
      })

      const result = await encryptFile(testFile)

      expect(mockSubtle.generateKey).toHaveBeenCalled()
      expect(mockSubtle.encrypt).toHaveBeenCalled()
      expect(mockSubtle.exportKey).toHaveBeenCalledWith('raw', mockKey)
      
      expect(result).toHaveProperty('encryptedBlob')
      expect(result).toHaveProperty('encryptionKey')
      expect(result.encryptedBlob).toBeInstanceOf(Blob)
      expect(result.encryptionKey).toBe('01020304')
    })

    it('should handle encryption failure', async () => {
      const testFile = new File(['test'], 'test.txt')
      mockSubtle.generateKey.mockRejectedValue(new Error('Encryption failed'))

      await expect(encryptFile(testFile)).rejects.toThrow('Encryption failed')
    })

    it('should handle file reading failure', async () => {
      const testFile = new File(['test'], 'test.txt')
      mockSubtle.generateKey.mockResolvedValue({ type: 'secret' })
      
      // Mock File.arrayBuffer() to throw error
      Object.defineProperty(testFile, 'arrayBuffer', {
        value: vi.fn().mockRejectedValue(new Error('File read failed'))
      })

      await expect(encryptFile(testFile)).rejects.toThrow('Encryption failed: File read failed')
    })
  })

  describe('decryptFile', () => {
    it('should decrypt file successfully', async () => {
      const encryptionKey = '01020304'
      const mockKey = { type: 'secret' }
      const mockDecryptedBuffer = new TextEncoder().encode('decrypted content').buffer
      
      // Create mock encrypted blob with IV + encrypted data
      const iv = new Uint8Array(12) // 12 bytes IV
      const encryptedData = new Uint8Array([10, 11, 12, 13])
      const combinedData = new Uint8Array(iv.length + encryptedData.length)
      combinedData.set(iv, 0)
      combinedData.set(encryptedData, iv.length)
      
      const encryptedBlob = new Blob([combinedData])
      
      // Mock Blob.arrayBuffer()
      Object.defineProperty(encryptedBlob, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(combinedData.buffer)
      })

      mockSubtle.importKey.mockResolvedValue(mockKey)
      mockSubtle.decrypt.mockResolvedValue(mockDecryptedBuffer)

      const result = await decryptFile(encryptedBlob, encryptionKey)

      expect(mockSubtle.importKey).toHaveBeenCalled()
      expect(mockSubtle.decrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: expect.any(Uint8Array),
        },
        mockKey,
        expect.any(Uint8Array)
      )
      expect(result).toBeInstanceOf(Blob)
    })

    it('should handle decryption failure', async () => {
      const encryptedBlob = new Blob([new Uint8Array(20)]) // Mock blob with enough data
      const encryptionKey = '01020304'
      
      mockSubtle.importKey.mockRejectedValue(new Error('Decryption failed'))

      await expect(decryptFile(encryptedBlob, encryptionKey)).rejects.toThrow('Decryption failed')
    })

    it('should handle invalid encrypted blob', async () => {
      const encryptedBlob = new Blob([new Uint8Array(5)]) // Too small blob
      const encryptionKey = '01020304'
      const mockKey = { type: 'secret' }
      
      mockSubtle.importKey.mockResolvedValue(mockKey)
      mockSubtle.decrypt.mockRejectedValue(new Error('Invalid encrypted data'))

      await expect(decryptFile(encryptedBlob, encryptionKey)).rejects.toThrow('Decryption failed')
    })
  })

  describe('createMockCryptoUtils', () => {
    it('should create mock crypto utilities', () => {
      const mockUtils = createMockCryptoUtils()

      expect(mockUtils).toHaveProperty('generateKey')
      expect(mockUtils).toHaveProperty('encryptFile')
      expect(mockUtils).toHaveProperty('decryptFile')
      expect(typeof mockUtils.generateKey).toBe('function')
      expect(typeof mockUtils.encryptFile).toBe('function')
      expect(typeof mockUtils.decryptFile).toBe('function')
    })

    it('should generate mock key', async () => {
      const mockUtils = createMockCryptoUtils()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await mockUtils.generateKey()

      expect(consoleSpy).toHaveBeenCalledWith('Using mock crypto implementation')
      expect(result).toBe('mock-key')
      
      consoleSpy.mockRestore()
    })

    it('should encrypt file with mock implementation', async () => {
      const mockUtils = createMockCryptoUtils()
      const testFile = new File(['test'], 'test.txt')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await mockUtils.encryptFile(testFile)

      expect(consoleSpy).toHaveBeenCalledWith('Using mock encryption')
      expect(result.encryptedBlob).toBe(testFile)
      expect(result.encryptionKey).toBe('mock-encryption-key')
      
      consoleSpy.mockRestore()
    })

    it('should decrypt file with mock implementation', async () => {
      const mockUtils = createMockCryptoUtils()
      const testBlob = new Blob(['encrypted'])
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await mockUtils.decryptFile(testBlob)

      expect(consoleSpy).toHaveBeenCalledWith('Using mock decryption')
      expect(result).toBe(testBlob)
      
      consoleSpy.mockRestore()
    })
  })

  describe('edge cases', () => {
    it('should handle empty file encryption', async () => {
      const emptyFile = new File([''], 'empty.txt')
      const mockKey = { type: 'secret' }
      const mockEncryptedBuffer = new Uint8Array([])
      const mockRawKey = new Uint8Array([1, 2, 3, 4])

      mockSubtle.generateKey.mockResolvedValue(mockKey)
      mockSubtle.encrypt.mockResolvedValue(mockEncryptedBuffer.buffer)
      mockSubtle.exportKey.mockResolvedValue(mockRawKey.buffer)

      Object.defineProperty(emptyFile, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      })

      const result = await encryptFile(emptyFile)

      expect(result.encryptedBlob).toBeInstanceOf(Blob)
      expect(result.encryptionKey).toBe('01020304')
    })

    it('should handle zero-length encryption key', async () => {
      const encryptionKey = ''
      const testData = new Uint8Array(20)
      const encryptedBlob = new Blob([testData])
      
      Object.defineProperty(encryptedBlob, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(testData.buffer)
      })
      
      mockSubtle.importKey.mockResolvedValue({ type: 'secret' })
      mockSubtle.decrypt.mockResolvedValue(new ArrayBuffer(0))

      const result = await decryptFile(encryptedBlob, encryptionKey)

      expect(result).toBeInstanceOf(Blob)
    })

    it('should handle crypto API unavailable', () => {
      // Test that the mock crypto utils provide a fallback
      const mockCryptoUtils = createMockCryptoUtils()
      
      expect(() => mockCryptoUtils).not.toThrow()
      expect(mockCryptoUtils.generateKey).toBeDefined()
      expect(mockCryptoUtils.encryptFile).toBeDefined()
      expect(mockCryptoUtils.decryptFile).toBeDefined()
    })
  })
})