/**
 * KYC Service - Real Backend Integration
 * Connects to the custom KYC backend endpoints replacing Sumsub integration
 */

import { apiClient } from '@/services/api/client';
import { API_CONFIG } from '@/services/api-config';

// Types for KYC service
export interface KYCSessionStartRequest {
  requiredLevel?: 'basic' | 'enhanced' | 'full';
}

export interface KYCSession {
  sessionId: string;
  requiredLevel: string;
  requiredDocuments: string[];
  steps: Record<string, { status: string; completedAt?: string }>;
  status: string;
}

export interface KYCSessionResponse {
  success: boolean;
  session: KYCSession;
}

export interface KYCDocumentUploadResult {
  documentId: string;
  documentType: string;
  status: string;
  extractedData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    expiryDate?: string;
    nationality?: string;
    address?: {
      fullAddress?: string;
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  temporaryUrl?: string;
  expiresAt?: string;
}

export interface KYCDocumentUploadResponse {
  success: boolean;
  result: KYCDocumentUploadResult;
}

export interface KYCLivenessResult {
  isLive: boolean;
  confidence: number;
  checks: Record<string, boolean>;
  selfieUrl?: string;
  sessionUpdated: boolean;
}

export interface KYCLivenessCheckResponse {
  success: boolean;
  result: KYCLivenessResult;
}

export interface KYCStatus {
  level: 'none' | 'basic' | 'enhanced' | 'full';
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired';
  lastUpdated: string;
  expiryDate?: string;
  reviewRequired: boolean;
  completedSteps?: string[];
  riskProfile?: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface KYCStatusResponse {
  success: boolean;
  status: KYCStatus;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  occupation?: string;
  employer?: string;
}

export interface KYCPersonalInfoRequest {
  sessionId: string;
  personalInfo: PersonalInfo;
}

export interface KYCCompleteSessionResult {
  success: boolean;
  result: {
    finalStatus: string;
    completedAt: string;
    level: string;
    reviewRequired: boolean;
  };
}

export interface OpenSanctionsSearchResult {
  success: boolean;
  query: {
    name: string;
    threshold: number;
    limit: number;
  };
  resultCount: number;
  results: Array<{
    entity: {
      id: string;
      name: string;
      type: string;
      nationality?: string;
      dateOfBirth?: string;
      datasets: string[];
    };
    matchDetails: {
      matchType: string;
      matchedName: string;
      score: number;
      fuzzyMatchType: string;
      contextBonus: number;
      algorithms: string[];
    };
  }>;
}

export class KYCService {
  /**
   * Start a new KYC session
   */
  async startSession(requiredLevel: 'basic' | 'enhanced' | 'full' = 'basic'): Promise<KYCSessionResponse> {
    const response = await apiClient.post<KYCSessionResponse>(
      API_CONFIG.endpoints.kyc.sessionStart,
      { requiredLevel }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to start KYC session');
    }

    return response.data;
  }

  /**
   * Upload a document for verification
   * Uses multipart/form-data as required by backend
   */
  async uploadDocument(
    sessionId: string,
    documentType: string,
    file: File
  ): Promise<KYCDocumentUploadResponse> {
    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('documentType', documentType);
    formData.append('document', file);

    const response = await apiClient.post<KYCDocumentUploadResponse>(
      API_CONFIG.endpoints.kyc.documentUpload,
      formData,
      {
        headers: {
          // Don't set Content-Type - let browser set it with boundary
        }
      }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to upload document');
    }

    return response.data;
  }

  /**
   * Perform liveness check with base64 image data
   */
  async performLivenessCheck(
    sessionId: string,
    imageData: string
  ): Promise<KYCLivenessCheckResponse> {
    // Ensure imageData is base64 encoded (remove data URL prefix if present)
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await apiClient.post<KYCLivenessCheckResponse>(
      API_CONFIG.endpoints.kyc.livenessCheck,
      {
        sessionId,
        imageData: base64Data
      }
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
    personalInfo: PersonalInfo
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      API_CONFIG.endpoints.kyc.personal,
      {
        sessionId,
        personalInfo
      }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to submit personal information');
    }

    return response.data;
  }

  /**
   * Complete KYC session
   */
  async completeSession(sessionId: string): Promise<KYCCompleteSessionResult> {
    const response = await apiClient.post<KYCCompleteSessionResult>(
      API_CONFIG.endpoints.kyc.sessionComplete,
      { sessionId }
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to complete KYC session');
    }

    return response.data;
  }

  /**
   * Search OpenSanctions database for potential matches
   */
  async searchOpenSanctions(
    name: string,
    options?: {
      threshold?: number;
      limit?: number;
      includeAliases?: boolean;
      datasets?: string[];
      entityType?: 'individual' | 'entity' | 'vessel' | 'aircraft';
      nationality?: string;
      dateOfBirth?: string;
    }
  ): Promise<OpenSanctionsSearchResult> {
    const searchData = {
      name,
      threshold: options?.threshold || 0.75,
      limit: options?.limit || 25,
      includeAliases: options?.includeAliases !== false,
      datasets: options?.datasets,
      entityType: options?.entityType,
      nationality: options?.nationality,
      dateOfBirth: options?.dateOfBirth
    };

    // Filter out undefined values
    const filteredData = Object.fromEntries(
      Object.entries(searchData).filter(([_, value]) => value !== undefined)
    );

    const response = await apiClient.post<OpenSanctionsSearchResult>(
      API_CONFIG.endpoints.kyc.openSanctionsSearch,
      filteredData
    );

    if (!response.success) {
      throw new Error(response.message || 'OpenSanctions search failed');
    }

    return response.data;
  }

  /**
   * Check if user needs KYC for given level
   */
  async checkKYCRequired(requiredLevel: 'basic' | 'enhanced' | 'full' = 'basic'): Promise<boolean> {
    try {
      const statusResponse = await this.getStatus();
      
      if (!statusResponse.status || statusResponse.status.level === 'none') {
        return true;
      }

      const levels = ['none', 'basic', 'enhanced', 'full'];
      const currentLevelIndex = levels.indexOf(statusResponse.status.level);
      const requiredLevelIndex = levels.indexOf(requiredLevel);

      return currentLevelIndex < requiredLevelIndex || 
             statusResponse.status.status !== 'approved' ||
             (statusResponse.status.expiryDate && new Date(statusResponse.status.expiryDate) < new Date());
    } catch (error) {
      // If we can't get status, assume KYC is required
      return true;
    }
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

    return response.data.pending || [];
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
}

// Export singleton instance
export const kycService = new KYCService();