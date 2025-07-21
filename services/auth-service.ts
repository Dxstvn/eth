import { apiClient } from '@/services/api';
import { API_CONFIG } from '@/services/api-config';
import type { 
  AuthResponse, 
  UserProfileResponse, 
  UpdateProfileRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
  VerifyEmailRequest 
} from '@/services/api-config';

// Token management
const TOKEN_KEY = 'clearhold_auth_token';
const TOKEN_EXPIRY_KEY = 'clearhold_token_expiry';
const USER_PROFILE_KEY = 'clearhold_user_profile';
const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

export interface UserProfile {
  uid: string;
  email: string;
  walletAddress?: string;
  isNewUser: boolean;
  registrationMethod: 'email' | 'google';
  hasCompletedOnboarding?: boolean;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  emailVerified?: boolean;
  wallets?: Array<{
    address: string;
    name: string;
    network: string;
    isPrimary: boolean;
    addedAt: Date;
  }>;
  createdAt?: Date;
}

export interface AuthTokenInfo {
  token: string;
  expiry: number;
  userId: string;
}

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private tokenRefreshPromise: Promise<AuthTokenInfo | null> | null = null;

  // Initialize service
  constructor() {
    // Check for existing token on initialization
    if (typeof window !== 'undefined') {
      this.initializeFromStorage();
    }
  }

  // Initialize from localStorage
  private initializeFromStorage(): void {
    const token = this.getStoredToken();
    if (token && this.isTokenValid()) {
      this.scheduleTokenRefresh();
    } else {
      this.clearAuth();
    }
  }

  // Google Sign In
  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.endpoints.auth.signInGoogle,
        { idToken }
      );

      if (response.success && response.data) {
        await this.handleAuthSuccess(response.data);
        return response.data;
      }

      throw new Error('Authentication failed');
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  // Email Sign In
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.endpoints.auth.signIn,
        { email, password }
      );

      if (response.success && response.data) {
        await this.handleAuthSuccess(response.data);
        return response.data;
      }

      throw new Error('Authentication failed');
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  // Email Sign Up
  async signUpWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.endpoints.auth.signUp,
        { email, password }
      );

      if (response.success && response.data) {
        await this.handleAuthSuccess(response.data);
        return response.data;
      }

      throw new Error('Registration failed');
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  // Refresh Token
  async refreshToken(): Promise<AuthTokenInfo | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this._refreshToken();
    
    try {
      const result = await this.tokenRefreshPromise;
      return result;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async _refreshToken(): Promise<AuthTokenInfo | null> {
    try {
      const currentToken = this.getStoredToken();
      if (!currentToken) {
        return null;
      }

      // Call refresh endpoint
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.endpoints.auth.refreshToken,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${currentToken}` 
          } 
        }
      );

      if (response.success && response.data) {
        const { token, userId } = response.data;
        const expiry = this.calculateTokenExpiry(token);
        
        // Store new token
        this.storeToken(token, expiry);
        
        // Schedule next refresh
        this.scheduleTokenRefresh();
        
        return { token, expiry, userId };
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      return null;
    }
  }

  // Sign Out
  async signOut(): Promise<void> {
    try {
      const token = this.getStoredToken();
      if (token) {
        // Notify backend of sign out
        await apiClient.post(
          API_CONFIG.endpoints.auth.signOut,
          {},
          { 
            headers: { 
              'Authorization': `Bearer ${token}` 
            } 
          }
        );
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Handle successful authentication
  private async handleAuthSuccess(authData: AuthResponse): Promise<void> {
    const { token, user, userId } = authData;
    
    // Calculate token expiry
    const expiry = this.calculateTokenExpiry(token);
    
    // Store auth data
    this.storeToken(token, expiry);
    // Store basic profile, will be enriched from backend
    this.storeUserProfile({
      uid: userId,
      email: user.email,
      isNewUser: false,
      registrationMethod: 'email',
      isAdmin: false,
    });
    
    // Fetch full profile from backend after successful auth
    try {
      await this.getUserProfile();
    } catch (error) {
      console.warn('Could not fetch full profile:', error);
    }
    
    // Schedule token refresh
    this.scheduleTokenRefresh();
  }

  // Token Management
  private calculateTokenExpiry(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      // Default to 1 hour from now if parsing fails
      return Date.now() + 60 * 60 * 1000;
    }
  }

  private storeToken(token: string, expiry: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }
  }

  private storeUserProfile(profile: UserProfile): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    }
  }

  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  getStoredUserProfile(): UserProfile | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  isTokenValid(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = this.getStoredToken();
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiryStr) return false;
    
    const expiry = parseInt(expiryStr, 10);
    return Date.now() < expiry - REFRESH_BUFFER;
  }

  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiryStr = typeof window !== 'undefined' ? 
      localStorage.getItem(TOKEN_EXPIRY_KEY) : null;
    
    if (!expiryStr) return;

    const expiry = parseInt(expiryStr, 10);
    const timeUntilRefresh = expiry - Date.now() - REFRESH_BUFFER;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, timeUntilRefresh);
    }
  }

  clearAuth(): void {
    // Clear timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  }

  // Get user profile from backend
  async getUserProfile(): Promise<UserProfile> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await apiClient.get<UserProfileResponse>(
      API_CONFIG.endpoints.auth.profile,
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        } 
      }
    );

    if (response.success && response.data) {
      // Convert backend response to our UserProfile format
      const profile: UserProfile = {
        uid: response.data.uid,
        email: response.data.email,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        phone_number: response.data.phone_number,
        displayName: `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim() || response.data.email,
        isNewUser: false,
        registrationMethod: 'email', // This should come from backend
        hasCompletedOnboarding: response.data.hasCompletedOnboarding,
        isAdmin: response.data.isAdmin,
        wallets: response.data.wallets,
        createdAt: response.data.createdAt,
      };
      
      this.storeUserProfile(profile);
      return profile;
    }

    throw new Error('Failed to get profile');
  }

  // Update user profile
  async updateUserProfile(updates: UpdateProfileRequest): Promise<UserProfile> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await apiClient.put<UserProfileResponse>(
      API_CONFIG.endpoints.auth.profile,
      updates,
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        } 
      }
    );

    if (response.success && response.data) {
      // Get full profile after update
      return await this.getUserProfile();
    }

    throw new Error('Failed to update profile');
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const request: ChangePasswordRequest = {
      currentPassword,
      newPassword
    };

    const response = await apiClient.post(
      API_CONFIG.endpoints.auth.changePassword,
      request,
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        } 
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to change password');
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    const request: ResetPasswordRequest = { email };

    const response = await apiClient.post(
      API_CONFIG.endpoints.auth.resetPassword,
      request
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to send password reset email');
    }
  }

  // Confirm password reset
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const request: ConfirmResetPasswordRequest = {
      token,
      newPassword
    };

    const response = await apiClient.post(
      API_CONFIG.endpoints.auth.confirmResetPassword,
      request
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to reset password');
    }
  }

  // Send email verification
  async sendVerificationEmail(): Promise<void> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await apiClient.post(
      API_CONFIG.endpoints.auth.sendVerificationEmail,
      {},
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        } 
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to send verification email');
    }
  }

  // Verify email
  async verifyEmail(verificationToken: string): Promise<void> {
    const request: VerifyEmailRequest = { token: verificationToken };

    const response = await apiClient.post(
      API_CONFIG.endpoints.auth.verifyEmail,
      request
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to verify email');
    }

    // Update stored profile to reflect email verification
    const profile = this.getStoredUserProfile();
    if (profile) {
      profile.emailVerified = true;
      this.storeUserProfile(profile);
    }
  }

  // Get current auth state
  getAuthState(): {
    isAuthenticated: boolean;
    token: string | null;
    profile: UserProfile | null;
  } {
    const token = this.getStoredToken();
    const isValid = this.isTokenValid();
    
    return {
      isAuthenticated: !!token && isValid,
      token: isValid ? token : null,
      profile: isValid ? this.getStoredUserProfile() : null,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

// Configure API client to use auth token - delay configuration to avoid initialization issues
if (typeof window !== 'undefined') {
  // Only configure in browser environment
  setTimeout(() => {
    if (apiClient && typeof apiClient.configure === 'function') {
      apiClient.configure({
        onTokenExpired: async () => {
          const tokenInfo = await authService.refreshToken();
          return tokenInfo?.token || null;
        }
      });
    } else {
      console.warn('API client not ready for configuration');
    }
  }, 0);
}