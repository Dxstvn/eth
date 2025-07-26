# Mock KYC Services Documentation

This directory contains mock services for KYC (Know Your Customer) verification processes. These services simulate real-world OCR, document verification, and identity verification workflows.

## Services Overview

### 1. Mock OCR Service (`mock-ocr-service.ts`)

Simulates Optical Character Recognition (OCR) for identity documents.

**Features:**
- Extracts personal information from passports, driver's licenses, and ID cards
- Simulates realistic processing delays (1-3 seconds)
- Includes confidence scores for each extracted field
- 10% failure rate to simulate real-world scenarios
- 15% chance of low-quality results requiring manual review

**Usage:**
```typescript
import { performOCR } from '@/lib/services/mock-ocr-service'

const result = await performOCR('passport', imageFile, {
  simulateError: false,
  simulateLowQuality: false,
  processingDelay: 2000
})

if (result.success) {
  console.log(result.extractedData)
  console.log(`Confidence: ${result.confidence}%`)
}
```

### 2. Mock Verification Service (`mock-verification-service.ts`)

Simulates document authenticity checks, face matching, and compliance verification.

**Features:**
- Document authenticity verification with security feature checks
- Face matching between selfie and document photo
- Liveness detection with multiple challenges
- Address proof verification
- AML/Sanctions/PEP compliance checks
- Risk assessment and scoring

**Usage:**
```typescript
import { performFullVerification } from '@/lib/services/mock-verification-service'

const result = await performFullVerification(
  extractedDocumentData,
  documentImage,
  selfieImage,
  addressDocument
)

console.log(`Verification Status: ${result.overallStatus}`)
console.log(`Risk Level: ${result.riskAssessment.level}`)
```

### 3. KYC Verification Workflow (`kyc-verification-workflow.ts`)

Orchestrates the complete KYC verification process.

**Features:**
- Combines OCR, document verification, and liveness checks
- Manages workflow state and progress tracking
- Handles retry logic for failed verifications
- Generates comprehensive verification reports
- Provides step-by-step status updates

**Usage:**
```typescript
import { KYCVerificationWorkflow } from '@/lib/services/kyc-verification-workflow'

const workflow = new KYCVerificationWorkflow({
  enableOCR: true,
  enableDocumentVerification: true,
  enableFaceMatch: true,
  enableLiveness: true,
  maxRetries: 3
})

const result = await workflow.executeWorkflow(
  [{ type: 'passport', frontImage: file }],
  selfieImage,
  addressDocument
)

console.log(`Workflow Status: ${result.status}`)
console.log(`Progress: ${workflow.getProgress()}%`)
```

## Mock Data Generation

The services generate realistic mock data including:
- Common first and last names
- Valid document numbers with appropriate prefixes
- Realistic addresses for US locations
- Appropriate date ranges for birth dates and document expiry
- Machine Readable Zone (MRZ) data for passports

## Verification Scenarios

### Success Scenarios (90% probability)
- All documents pass authenticity checks
- Face matching succeeds with high confidence
- Liveness detection passes all challenges
- Low risk score assigned

### Failure Scenarios (10% probability)
- Document tampering detected
- Face match fails
- Liveness detection identifies spoofing attempt
- High risk score requiring manual review

## Integration with Components

The mock services are integrated with the KYC components:

1. **DocumentUploadStep**: Uses OCR service to extract document data
2. **LivenessCheckStep**: Integrates with liveness verification
3. **AddressProofStep**: Validates address documents
4. **KYCWorkflowDemo**: Demonstrates the complete workflow

## Replacing with Real Services

To replace these mock services with real APIs:

1. Maintain the same interface contracts
2. Replace the mock implementation with API calls
3. Update error handling for real API responses
4. Adjust processing delays to match actual service times

Example:
```typescript
// Replace this:
export async function performOCR(...) {
  // Mock implementation
}

// With this:
export async function performOCR(...) {
  const response = await fetch('/api/ocr', {
    method: 'POST',
    body: formData
  })
  return response.json()
}
```

## Configuration Options

All services support configuration options:

- `simulateError`: Force a failure scenario
- `simulateFailure`: Trigger specific failure types
- `failureRate`: Adjust the probability of failures
- `processingDelay`: Control mock processing time

## Testing

The mock services are designed to be deterministic when needed:

```typescript
import { mockOCRData } from '@/lib/services/mock-ocr-service'

// Use predefined mock data for consistent testing
const testData = mockOCRData.passport
```