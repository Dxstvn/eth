// Re-export the new KYC service for backward compatibility
export { kycService as kycAPI } from '@/services/kyc-service';

// Re-export types for backward compatibility
export type {
  KYCSessionResponse,
  KYCDocumentUploadResponse,
  KYCLivenessCheckResponse,
  KYCStatusResponse,
  PersonalInfo as KYCPersonalInfoRequest
} from '@/services/kyc-service';