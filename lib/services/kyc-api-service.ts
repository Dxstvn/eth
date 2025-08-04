import { apiClient } from '@/services/api';
import { API_CONFIG } from '@/services/api-config';
import type {
  KYCSessionStartRequest,
  KYCSessionResponse,
  KYCDocumentUploadResponse,
  KYCLivenessCheckRequest,
  KYCLivenessCheckResponse,
  KYCStatusResponse,
  KYCPersonalInfoRequest
} from '@/services/api-config';

export class KYCAPIService {
  /**
   * Start a new KYC session
   */
  async startSession(requiredLevel: 'basic' | 'enhanced' | 'full' = 'basic'): Promise<KYCSessionResponse> {
    const response = await apiClient.post<KYCSessionResponse>(
      API_CONFIG.endpoints.kyc.sessionStart,
      { requiredLevel } as KYCSessionStartRequest
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to start KYC session');
    }

    return response.data;
  }

  /**
   * Upload a document for verification
   */
  async uploadDocument(
    sessionId: string,
    documentType: string,
    file: File
  ): Promise<KYCDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('documentType', documentType);
    formData.append('document', file);

    const response = await apiClient.post<KYCDocumentUploadResponse>(
      API_CONFIG.endpoints.kyc.documentUpload,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to upload document');
    }

    return response.data;
  }

  /**
   * Perform liveness check with webcam image
   */
  async performLivenessCheck(
    sessionId: string,
    imageData: string
  ): Promise<KYCLivenessCheckResponse> {
    const response = await apiClient.post<KYCLivenessCheckResponse>(
      API_CONFIG.endpoints.kyc.livenessCheck,
      { sessionId, imageData } as KYCLivenessCheckRequest
    );

    if (!response.success) {
      throw new Error(response.message || 'Liveness check failed');
    }

    return response.data;
  }

  /**
   * Get current KYC status for the authenticated user
   */
  async getStatus(): Promise<KYCStatusResponse> {
    const response = await apiClient.get<KYCStatusResponse>(
      API_CONFIG.endpoints.kyc.status
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to get KYC status');
    }

    return response.data;
  }

  /**
   * Submit personal information
   */
  async submitPersonalInfo(
    sessionId: string,
    personalInfo: KYCPersonalInfoRequest['personalInfo']
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      API_CONFIG.endpoints.kyc.personal,
      { sessionId, personalInfo } as KYCPersonalInfoRequest
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to submit personal information');
    }

    return response.data;
  }

  /**
   * Complete KYC session
   */
  async completeSession(sessionId: string): Promise<any> {
    const response = await apiClient.post<any>(
      API_CONFIG.endpoints.kyc.sessionComplete,
      { sessionId }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to complete KYC session');
    }

    return response.data;
  }

  /**
   * Admin: Get pending reviews
   */
  async getPendingReviews(): Promise<any[]> {
    const response = await apiClient.get<{ pending: any[] }>(
      API_CONFIG.endpoints.kyc.adminPendingReviews
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to get pending reviews');
    }

    return response.data.pending;
  }

  /**
   * Admin: Perform manual review
   */
  async performManualReview(
    userId: string,
    decision: 'approve' | 'reject',
    notes: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      API_CONFIG.endpoints.kyc.adminManualReview,
      { userId, decision, notes }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to perform manual review');
    }

    return response.data;
  }

  /**
   * Check if user needs KYC
   */
  async checkKYCRequired(requiredLevel: 'basic' | 'enhanced' | 'full' = 'basic'): Promise<boolean> {
    try {
      const status = await this.getStatus();
      
      if (!status.status || status.status.level === 'none') {
        return true;
      }

      const levels = ['none', 'basic', 'enhanced', 'full'];
      const currentLevelIndex = levels.indexOf(status.status.level);
      const requiredLevelIndex = levels.indexOf(requiredLevel);

      return currentLevelIndex < requiredLevelIndex || 
             status.status.status !== 'approved' ||
             (status.status.expiryDate && new Date(status.status.expiryDate) < new Date());
    } catch (error) {
      // If we can't get status, assume KYC is required
      return true;
    }
  }
}

// Export singleton instance
export const kycAPI = new KYCAPIService();