// [SECURITY] KYC Encryption Usage Examples

import {
  kycEncryption,
  kycKeyDerivation,
  kycSecureStorage,
  kycDataIntegrity,
  KYCFieldType,
  KYCEncryptionResult,
} from './kyc-encryption';

/**
 * Example 1: Encrypting PII Data
 */
async function encryptUserPII() {
  const masterPassword = 'user-master-password-from-secure-input';
  
  // Encrypt different types of PII with field-specific keys
  const ssnEncrypted = kycEncryption.encryptPII(
    '123-45-6789',
    KYCFieldType.SSN,
    masterPassword
  );
  
  const taxIdEncrypted = kycEncryption.encryptPII(
    '98-7654321',
    KYCFieldType.TAX_ID,
    masterPassword
  );
  
  const bankAccountEncrypted = kycEncryption.encryptPII(
    '1234567890',
    KYCFieldType.BANK_ACCOUNT,
    masterPassword
  );
  
  // Store encrypted data in database
  const userRecord = {
    id: 'user-123',
    encrypted_ssn: ssnEncrypted,
    encrypted_tax_id: taxIdEncrypted,
    encrypted_bank_account: bankAccountEncrypted,
  };
  
  console.log('[SECURITY] PII encrypted with field-level encryption');
  return userRecord;
}

/**
 * Example 2: Encrypting KYC Documents
 */
async function encryptKYCDocument(file: File, userId: string) {
  const documentPassword = `doc-password-${userId}`;
  
  console.log(`[SECURITY] Encrypting document: ${file.name}`);
  
  const encryptedFile = await kycEncryption.encryptFile(
    file,
    documentPassword,
    (progress) => {
      console.log(`[SECURITY] Encryption progress: ${progress.toFixed(2)}%`);
    }
  );
  
  // Store encrypted file metadata
  const documentRecord = {
    userId,
    documentId: encryptedFile.metadata.id,
    encryptedData: encryptedFile.encryptedData,
    metadata: encryptedFile.metadata,
    fileMetadata: encryptedFile.fileMetadata,
    uploadTimestamp: Date.now(),
  };
  
  // Generate integrity hash for audit
  const integrityHash = kycDataIntegrity.createTimestampedHash(documentRecord);
  
  return {
    documentRecord,
    integrityHash,
  };
}

/**
 * Example 3: Secure Local Storage of Sensitive Data
 */
async function securelyStoreSensitiveData() {
  const sessionPassword = 'user-session-password';
  
  // Store user's KYC status securely
  const kycStatus = {
    status: 'verified',
    verificationDate: new Date().toISOString(),
    level: 2,
    documents: ['passport', 'utility_bill'],
  };
  
  await kycSecureStorage.store(
    'kyc_status',
    kycStatus,
    sessionPassword,
    {
      expiry: 24 * 60 * 60 * 1000, // 24 hours
      fieldType: KYCFieldType.DOCUMENT,
    }
  );
  
  // Later, retrieve the data
  const retrievedStatus = await kycSecureStorage.retrieve(
    'kyc_status',
    sessionPassword
  );
  
  console.log('[SECURITY] KYC status securely stored and retrieved');
  return retrievedStatus;
}

/**
 * Example 4: Key Derivation and Management
 */
function demonstrateKeyManagement() {
  const masterPassword = 'organization-master-password';
  
  // Derive master key with custom parameters
  const masterKeyInfo = kycKeyDerivation.deriveKey(
    masterPassword,
    undefined,
    {
      iterations: 500000, // Extra security for master key
      keySize: 64, // 512-bit key
      memoryFactor: 8, // Increase memory hardness
    }
  );
  
  // Create hierarchical keys for different purposes
  const keyPaths = kycKeyDerivation.deriveHierarchicalKeys(
    masterKeyInfo.key,
    ['kyc', 'documents', 'encryption']
  );
  
  // Split master key for multi-party control
  const keyShares = kycKeyDerivation.splitKey(
    masterKeyInfo.key.toString(),
    5, // Total shares
    3  // Threshold needed to reconstruct
  );
  
  console.log('[SECURITY] Generated 5 key shares, need 3 to reconstruct');
  
  return {
    masterKeyInfo,
    keyPaths,
    keyShares,
  };
}

/**
 * Example 5: Data Integrity and Audit Trail
 */
function createAuditableTransaction() {
  const secret = 'audit-secret-key';
  
  const transaction = {
    type: 'kyc_verification',
    userId: 'user-123',
    verifier: 'admin-456',
    timestamp: Date.now(),
    documents: ['passport', 'bank_statement'],
    result: 'approved',
  };
  
  // Create signature for transaction
  const signature = kycDataIntegrity.generateSignature(transaction, secret);
  
  // Create merkle root for multiple documents
  const documentHashes = transaction.documents.map(doc => 
    kycEncryption.generateHash(doc)
  );
  const merkleRoot = kycDataIntegrity.generateMerkleRoot(documentHashes);
  
  // Create timestamped hash for immutable record
  const auditRecord = kycDataIntegrity.createTimestampedHash({
    transaction,
    signature,
    merkleRoot,
  });
  
  console.log('[SECURITY] Audit trail created with cryptographic proof');
  
  return {
    transaction,
    signature,
    merkleRoot,
    auditRecord,
  };
}

/**
 * Example 6: Batch PII Encryption
 */
function encryptUserProfile(profile: any, masterPassword: string) {
  const encryptedFields: Record<string, KYCEncryptionResult> = {};
  
  // Map profile fields to KYC field types
  const fieldMapping = {
    ssn: KYCFieldType.SSN,
    taxId: KYCFieldType.TAX_ID,
    passportNumber: KYCFieldType.PASSPORT,
    driversLicense: KYCFieldType.DRIVERS_LICENSE,
    bankAccount: KYCFieldType.BANK_ACCOUNT,
    routingNumber: KYCFieldType.ROUTING_NUMBER,
    dateOfBirth: KYCFieldType.DATE_OF_BIRTH,
    fullName: KYCFieldType.FULL_NAME,
    address: KYCFieldType.ADDRESS,
    phone: KYCFieldType.PHONE,
    email: KYCFieldType.EMAIL,
  };
  
  // Encrypt each field with appropriate field type
  Object.entries(fieldMapping).forEach(([field, fieldType]) => {
    if (profile[field]) {
      encryptedFields[field] = kycEncryption.encryptPII(
        profile[field],
        fieldType,
        masterPassword
      );
    }
  });
  
  // Generate profile fingerprint for duplicate detection
  const profileFingerprint = kycEncryption.generateFingerprint(
    JSON.stringify(profile)
  );
  
  return {
    encryptedFields,
    profileFingerprint,
    encryptedAt: Date.now(),
  };
}

/**
 * Example 7: Secure Key Recovery
 */
function setupKeyRecovery(masterPassword: string) {
  // Generate recovery key
  const recoveryKey = kycEncryption.generateHash(
    masterPassword + 'recovery' + Date.now()
  );
  
  // Encrypt master password with recovery key
  const encryptedMaster = kycEncryption.secureStoreKey(
    masterPassword,
    recoveryKey
  );
  
  // Split recovery key into shares
  const recoveryShares = kycKeyDerivation.splitKey(
    recoveryKey,
    5, // 5 total shares
    3  // Need 3 to recover
  );
  
  console.log('[SECURITY] Recovery system configured');
  console.log('Distribute these shares to trusted parties:');
  recoveryShares.forEach((share, index) => {
    console.log(`Share ${index + 1}: ${share}`);
  });
  
  return {
    encryptedMaster,
    recoveryShares,
  };
}

/**
 * Example 8: Zero-Knowledge Proof of KYC
 */
function generateKYCProof(userId: string, kycData: any) {
  // Hash KYC data
  const kycHash = kycEncryption.generateHash(
    JSON.stringify(kycData)
  );
  
  // Create proof without revealing actual data
  const proof = {
    userId,
    kycLevel: kycData.level,
    verificationHash: kycHash,
    timestamp: Date.now(),
    // Proof that user has specific documents without revealing them
    hasPassport: !!kycData.passport,
    hasBankStatement: !!kycData.bankStatement,
    hasUtilityBill: !!kycData.utilityBill,
  };
  
  // Sign the proof
  const proofSignature = kycDataIntegrity.generateSignature(
    proof,
    'kyc-proof-secret'
  );
  
  return {
    proof,
    signature: proofSignature,
    // Verifier can check this matches their records
    verificationHash: kycHash,
  };
}

/**
 * Example 9: Compliance-Ready Encryption
 */
async function complianceReadyEncryption() {
  const compliancePassword = 'compliance-key';
  const userData = {
    name: 'John Doe',
    ssn: '123-45-6789',
    address: '123 Main St',
  };
  
  // Encrypt with compliance metadata
  const encrypted = kycEncryption.encryptPII(
    JSON.stringify(userData),
    KYCFieldType.DOCUMENT,
    compliancePassword
  );
  
  // Create compliance record
  const complianceRecord = {
    encryptedData: encrypted,
    regulation: 'GDPR',
    jurisdiction: 'EU',
    retentionPeriod: '7 years',
    purpose: 'KYC Verification',
    legalBasis: 'Regulatory Requirement',
    encryptionStandard: 'AES-256-CBC-HMAC',
    keyDerivation: 'PBKDF2-SHA256-250000',
    createdAt: new Date().toISOString(),
  };
  
  // Generate audit hash
  const auditHash = kycDataIntegrity.createTimestampedHash(complianceRecord);
  
  console.log('[SECURITY] Compliance-ready encryption completed');
  return {
    complianceRecord,
    auditHash,
  };
}

// Export examples for documentation
export {
  encryptUserPII,
  encryptKYCDocument,
  securelyStoreSensitiveData,
  demonstrateKeyManagement,
  createAuditableTransaction,
  encryptUserProfile,
  setupKeyRecovery,
  generateKYCProof,
  complianceReadyEncryption,
};