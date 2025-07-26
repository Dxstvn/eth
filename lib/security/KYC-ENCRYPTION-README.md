# [SECURITY] KYC Encryption Utilities

Comprehensive encryption utilities for securing KYC (Know Your Customer) data in the ClearHold platform.

## Overview

This module provides industry-standard encryption utilities specifically designed for handling sensitive PII (Personally Identifiable Information) and KYC documents. It implements AES-256-CBC with HMAC-SHA256 for authenticated encryption, providing security equivalent to AES-256-GCM.

## Features

### 1. **Field-Level Encryption for PII**
- Separate encryption keys for different field types (SSN, Tax ID, Bank Account, etc.)
- Automatic key derivation based on field type
- Built-in data integrity verification
- Audit trail with metadata tracking

### 2. **File Encryption**
- Chunked processing for large files (up to 50MB)
- Progress tracking for user feedback
- Maintains original file metadata
- Secure file integrity verification

### 3. **Key Management**
- PBKDF2 key derivation with 250,000 iterations
- Hierarchical key derivation for organized key management
- Key splitting using simplified Shamir's Secret Sharing
- Secure key storage with encryption

### 4. **Data Integrity**
- HMAC-SHA256 signatures for tamper detection
- Merkle tree generation for document sets
- Timestamped hashing for audit trails
- Constant-time comparison to prevent timing attacks

### 5. **Secure Storage**
- Encrypted localStorage with expiration support
- Field-type specific encryption
- Automatic cleanup of expired data
- Batch operations support

## Security Specifications

- **Encryption Algorithm**: AES-256-CBC
- **Authentication**: HMAC-SHA256
- **Key Derivation**: PBKDF2-SHA256 (250,000 iterations)
- **Random Generation**: Web Crypto API (cryptographically secure)
- **IV Size**: 128 bits (unique per encryption)
- **Salt Size**: 256 bits
- **Hash Algorithm**: SHA-256

## Usage Examples

### Encrypting PII Data

```typescript
import { kycEncryption, KYCFieldType } from '@/lib/security/kyc-encryption';

// Encrypt SSN with field-specific key
const encryptedSSN = kycEncryption.encryptPII(
  '123-45-6789',
  KYCFieldType.SSN,
  userPassword
);

// Decrypt SSN
const ssn = kycEncryption.decryptPII(encryptedSSN, userPassword);
```

### Encrypting Files

```typescript
// Encrypt a KYC document
const encryptedFile = await kycEncryption.encryptFile(
  documentFile,
  userPassword,
  (progress) => console.log(`Progress: ${progress}%`)
);

// Decrypt the file
const decryptedBlob = await kycEncryption.decryptFile(
  encryptedFile,
  userPassword
);
```

### Secure Local Storage

```typescript
import { kycSecureStorage, KYCFieldType } from '@/lib/security/kyc-encryption';

// Store encrypted data with 24-hour expiry
await kycSecureStorage.store(
  'user-kyc-status',
  { verified: true, level: 2 },
  sessionPassword,
  { expiry: 24 * 60 * 60 * 1000 }
);

// Retrieve data
const kycStatus = await kycSecureStorage.retrieve(
  'user-kyc-status',
  sessionPassword
);
```

### Key Management

```typescript
import { kycKeyDerivation } from '@/lib/security/kyc-encryption';

// Derive a secure key
const keyInfo = kycKeyDerivation.deriveKey(masterPassword, undefined, {
  iterations: 500000,
  keySize: 64,
  memoryFactor: 8
});

// Split key for multi-party control
const keyShares = kycKeyDerivation.splitKey(
  keyInfo.key.toString(),
  5, // Total shares
  3  // Threshold to reconstruct
);
```

### Data Integrity

```typescript
import { kycDataIntegrity } from '@/lib/security/kyc-encryption';

// Create signature for data integrity
const signature = kycDataIntegrity.generateSignature(data, secret);

// Verify signature
const isValid = kycDataIntegrity.verifySignature(data, signature, secret);

// Create audit trail
const auditHash = kycDataIntegrity.createTimestampedHash(transaction);
```

## Security Best Practices

1. **Password Requirements**
   - Use strong passwords (minimum 12 characters)
   - Implement password strength validation
   - Never store passwords in plain text

2. **Key Management**
   - Rotate encryption keys regularly
   - Use different keys for different data types
   - Implement secure key recovery mechanisms

3. **Data Handling**
   - Clear sensitive data from memory after use
   - Implement automatic session timeouts
   - Use secure communication channels

4. **Audit Trail**
   - Log all encryption/decryption operations
   - Maintain immutable audit records
   - Implement anomaly detection

## Compliance Considerations

- **GDPR**: Supports right to erasure and data portability
- **PCI DSS**: Meets encryption requirements for payment data
- **HIPAA**: Suitable for protecting health information
- **SOC 2**: Provides audit trail and access controls

## Performance Considerations

- File encryption uses chunking to handle large files efficiently
- Key derivation is intentionally slow (250k iterations) for security
- Consider using Web Workers for CPU-intensive operations
- Implement caching for frequently accessed encrypted data

## Error Handling

All functions include comprehensive error handling:
- Authentication failures
- Data corruption detection
- Invalid input validation
- Secure error messages (no data leakage)

## Testing

Comprehensive test suite included:
```bash
npm test lib/security/__tests__/kyc-encryption.test.ts
```

## Migration Guide

For existing implementations using basic encryption:

1. Identify all PII fields in your application
2. Map fields to appropriate `KYCFieldType`
3. Implement gradual migration with fallback
4. Update storage to use `kycSecureStorage`
5. Implement key rotation strategy

## Support

For security-related questions or vulnerability reports:
- Use the `[SECURITY]` tag in issues
- Follow responsible disclosure practices
- Contact security team for sensitive matters