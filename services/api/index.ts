// API Module Exports

export { apiClient, ApiClient } from './client';
export { apiLogger } from './logger';
export { errorHandler } from './error-handler';
export { retryHandler, withRetry } from './retry-logic';
export { requestQueue } from './request-queue';
export {
  InterceptorManager,
  defaultRequestInterceptor,
  authTokenInterceptor,
  errorNormalizationInterceptor
} from './interceptors';

// Export types
export type {
  ApiResponse,
  ApiError,
  RequestOptions,
  ApiClientConfig,
  QueuedRequest,
  ApiLogEntry,
  RequestInterceptor,
  ResponseInterceptor
} from './types';

export { ApiException } from './types';

// Export configuration
export { API_CONFIG, SUPPORTED_NETWORKS, getChainId, getAuthHeaders, buildUrl } from '../api-config';

// Re-export specific types from api-config
export type {
  AuthSignUpRequest,
  AuthResponse,
  CreateDealRequest,
  CreateDealResponse,
  WalletRegistrationRequest,
  ContactInviteRequest,
  FileUploadResponse
} from '../api-config';