import { apiClient } from './api/client';
import { errorHandler } from './api/error-handler';

// API base URL - environment-dependent
const getApiUrl = () => {
  // Check if we're in development mode
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return "http://localhost:3000"
  }
  
  // Production/staging - use the domain
  return process.env.NEXT_PUBLIC_API_URL || "https://api.clearhold.app"
}

const API_URL = getApiUrl()

/**
 * @deprecated Use apiClient.post() instead
 * Makes a POST request to the API
 * @param endpoint - API endpoint
 * @param data - Request body data
 * @returns Promise with response data
 */
export async function postRequest<T>(endpoint: string, data: any): Promise<T> {
  try {
    const response = await apiClient.post<T>(endpoint, data);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.message || "An error occurred");
  } catch (error) {
    errorHandler.handleError(error, 'postRequest');
    throw error;
  }
}

/**
 * @deprecated Use apiClient.get() instead
 * Makes a GET request to the API
 * @param endpoint - API endpoint
 * @param token - Optional auth token
 * @returns Promise with response data
 */
export async function getRequest<T>(endpoint: string, token?: string): Promise<T> {
  try {
    const options = token ? { 
      headers: { 'Authorization': `Bearer ${token}` } 
    } : undefined;
    
    const response = await apiClient.get<T>(endpoint, options);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.message || "An error occurred");
  } catch (error) {
    errorHandler.handleError(error, 'getRequest');
    throw error;
  }
}
