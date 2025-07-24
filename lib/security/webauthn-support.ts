import { secureRandom } from './crypto-utils';
import { secureLocalStorage } from './secure-storage';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';
import { auditTrail, AuditActionType } from './audit-trail';

// WebAuthn credential types
export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  type: 'public-key';
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

// Stored credential data
export interface StoredCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  aaguid?: string;
  deviceName?: string;
  createdAt: number;
  lastUsed?: number;
  isEnabled: boolean;
}

// WebAuthn registration options
export interface RegistrationOptions {
  challenge: string;
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntity;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

// WebAuthn authentication options
export interface AuthenticationOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

// WebAuthn error types
export enum WebAuthnErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  INVALID_STATE = 'INVALID_STATE',
  NOT_ALLOWED = 'NOT_ALLOWED',
  ABORT = 'ABORT',
  CONSTRAINT = 'CONSTRAINT',
  DATA = 'DATA',
  INVALID_MODIFICATION = 'INVALID_MODIFICATION',
  ENCODING = 'ENCODING',
  NETWORK = 'NETWORK',
  OPERATION = 'OPERATION',
  SECURITY = 'SECURITY',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

// WebAuthn result
export interface WebAuthnResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: WebAuthnErrorType;
    message: string;
    details?: any;
  };
}

// WebAuthn manager
export class WebAuthnManager {
  private static instance: WebAuthnManager;
  private storageKey = 'webauthn_credentials';
  
  private constructor() {}
  
  static getInstance(): WebAuthnManager {
    if (!WebAuthnManager.instance) {
      WebAuthnManager.instance = new WebAuthnManager();
    }
    return WebAuthnManager.instance;
  }
  
  // Check if WebAuthn is supported
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'credentials' in navigator &&
      typeof navigator.credentials.create === 'function' &&
      typeof navigator.credentials.get === 'function' &&
      typeof PublicKeyCredential !== 'undefined'
    );
  }
  
  // Check if platform authenticator is available
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  
  // Generate registration options
  generateRegistrationOptions(
    userId: string,
    username: string,
    displayName: string,
    excludeExistingCredentials: boolean = true
  ): RegistrationOptions {
    const challenge = this.generateChallenge();
    
    // Get existing credentials to exclude
    let excludeCredentials: PublicKeyCredentialDescriptor[] | undefined;
    if (excludeExistingCredentials) {
      const existingCredentials = this.getStoredCredentials(userId);
      excludeCredentials = Object.values(existingCredentials).map(cred => ({
        id: this.base64urlToBuffer(cred.id),
        type: 'public-key' as const,
        transports: cred.transports,
      }));
    }
    
    return {
      challenge,
      rp: {
        name: 'ClearHold Escrow Platform',
        id: this.getRpId(),
      },
      user: {
        id: this.stringToBuffer(userId),
        name: username,
        displayName: displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: 60000, // 1 minute
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      attestation: 'direct',
    };
  }
  
  // Generate authentication options
  generateAuthenticationOptions(userId?: string): AuthenticationOptions {
    const challenge = this.generateChallenge();
    
    let allowCredentials: PublicKeyCredentialDescriptor[] | undefined;
    if (userId) {
      const storedCredentials = this.getStoredCredentials(userId);
      allowCredentials = Object.values(storedCredentials)
        .filter(cred => cred.isEnabled)
        .map(cred => ({
          id: this.base64urlToBuffer(cred.id),
          type: 'public-key' as const,
          transports: cred.transports,
        }));
    }
    
    return {
      challenge,
      timeout: 60000, // 1 minute
      rpId: this.getRpId(),
      allowCredentials,
      userVerification: 'required',
    };
  }
  
  // Register new credential
  async registerCredential(
    userId: string,
    options: RegistrationOptions,
    deviceName?: string
  ): Promise<WebAuthnResult<StoredCredential>> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: {
          type: WebAuthnErrorType.NOT_SUPPORTED,
          message: 'WebAuthn is not supported on this device',
        },
      };
    }
    
    try {
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: this.base64urlToBuffer(options.challenge),
          user: {
            ...options.user,
            id: this.base64urlToBuffer(this.bufferToBase64url(options.user.id)),
          },
          excludeCredentials: options.excludeCredentials?.map(cred => ({
            ...cred,
            id: this.base64urlToBuffer(this.bufferToBase64url(cred.id)),
          })),
        },
      }) as PublicKeyCredential;
      
      if (!credential) {
        return {
          success: false,
          error: {
            type: WebAuthnErrorType.INVALID_STATE,
            message: 'Failed to create credential',
          },
        };
      }
      
      // Process the credential
      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Extract credential data
      const credentialId = this.bufferToBase64url(credential.rawId);
      const publicKey = this.bufferToBase64url(response.getPublicKey());
      
      // Get authenticator data
      const authData = new Uint8Array(response.getAuthenticatorData());
      const transports = response.getTransports ? response.getTransports() : [];
      
      // Create stored credential
      const storedCredential: StoredCredential = {
        id: credentialId,
        publicKey,
        counter: 0, // Initial counter
        transports,
        deviceName: deviceName || this.generateDeviceName(),
        createdAt: Date.now(),
        isEnabled: true,
      };
      
      // Store credential
      this.storeCredential(userId, credentialId, storedCredential);
      
      // Log successful registration
      securityLogger.log(
        SecurityEventType.SECURITY_CONFIG_CHANGED,
        SecurityEventSeverity.HIGH,
        {
          action: 'WebAuthn credential registered',
          userId,
          credentialId: credentialId.substring(0, 8) + '...',
          deviceName: storedCredential.deviceName,
        }
      );
      
      auditTrail.log(
        AuditActionType.PROFILE_UPDATED,
        'user',
        {
          action: 'Hardware security key registered',
          deviceName: storedCredential.deviceName,
        },
        { resourceId: userId }
      );
      
      return {
        success: true,
        data: storedCredential,
      };
      
    } catch (error: any) {
      const webauthnError = this.parseWebAuthnError(error);
      
      securityLogger.log(
        SecurityEventType.ERROR,
        SecurityEventSeverity.MEDIUM,
        {
          action: 'WebAuthn registration failed',
          userId,
          error: webauthnError.type,
          message: webauthnError.message,
        }
      );
      
      return {
        success: false,
        error: webauthnError,
      };
    }
  }
  
  // Authenticate with credential
  async authenticateWithCredential(
    userId: string,
    options: AuthenticationOptions
  ): Promise<WebAuthnResult<{ credentialId: string; verified: boolean }>> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: {
          type: WebAuthnErrorType.NOT_SUPPORTED,
          message: 'WebAuthn is not supported on this device',
        },
      };
    }
    
    try {
      // Get credential
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: this.base64urlToBuffer(options.challenge),
          allowCredentials: options.allowCredentials?.map(cred => ({
            ...cred,
            id: this.base64urlToBuffer(this.bufferToBase64url(cred.id)),
          })),
        },
      }) as PublicKeyCredential;
      
      if (!credential) {
        return {
          success: false,
          error: {
            type: WebAuthnErrorType.INVALID_STATE,
            message: 'Authentication was cancelled or failed',
          },
        };
      }
      
      // Get credential ID
      const credentialId = this.bufferToBase64url(credential.rawId);
      
      // Get stored credential
      const storedCredential = this.getStoredCredential(userId, credentialId);
      if (!storedCredential || !storedCredential.isEnabled) {
        return {
          success: false,
          error: {
            type: WebAuthnErrorType.NOT_ALLOWED,
            message: 'Credential not found or disabled',
          },
        };
      }
      
      // Verify the authentication
      const response = credential.response as AuthenticatorAssertionResponse;
      const verified = await this.verifyAuthentication(
        options.challenge,
        storedCredential,
        response
      );
      
      if (verified) {
        // Update last used and counter
        storedCredential.lastUsed = Date.now();
        // In real implementation, you'd extract and validate the counter from authenticatorData
        storedCredential.counter++;
        
        this.storeCredential(userId, credentialId, storedCredential);
        
        securityLogger.log(
          SecurityEventType.LOGIN_SUCCESS,
          SecurityEventSeverity.LOW,
          {
            action: 'WebAuthn authentication successful',
            userId,
            credentialId: credentialId.substring(0, 8) + '...',
            deviceName: storedCredential.deviceName,
          }
        );
        
        return {
          success: true,
          data: { credentialId, verified: true },
        };
      } else {
        securityLogger.log(
          SecurityEventType.LOGIN_FAILED,
          SecurityEventSeverity.HIGH,
          {
            action: 'WebAuthn authentication failed - verification failed',
            userId,
            credentialId: credentialId.substring(0, 8) + '...',
          }
        );
        
        return {
          success: false,
          error: {
            type: WebAuthnErrorType.SECURITY,
            message: 'Authentication verification failed',
          },
        };
      }
      
    } catch (error: any) {
      const webauthnError = this.parseWebAuthnError(error);
      
      securityLogger.log(
        SecurityEventType.LOGIN_FAILED,
        SecurityEventSeverity.MEDIUM,
        {
          action: 'WebAuthn authentication failed',
          userId,
          error: webauthnError.type,
          message: webauthnError.message,
        }
      );
      
      return {
        success: false,
        error: webauthnError,
      };
    }
  }
  
  // Verify authentication (simplified implementation)
  private async verifyAuthentication(
    challenge: string,
    storedCredential: StoredCredential,
    response: AuthenticatorAssertionResponse
  ): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Verify the signature using the stored public key
      // 2. Verify the authenticator data
      // 3. Verify the client data JSON
      // 4. Check the counter to prevent replay attacks
      
      // For this implementation, we'll do basic validation
      const clientDataJSON = new TextDecoder().decode(response.clientDataJSON);
      const clientData = JSON.parse(clientDataJSON);
      
      // Verify challenge
      if (clientData.challenge !== challenge) {
        return false;
      }
      
      // Verify origin (in real app, check against your domain)
      if (!clientData.origin.includes('localhost') && !clientData.origin.includes('clearhold')) {
        return false;
      }
      
      // Verify type
      if (clientData.type !== 'webauthn.get') {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  // Get stored credentials for user
  getStoredCredentials(userId: string): Record<string, StoredCredential> {
    return secureLocalStorage.getItem(this.storageKey + '_' + userId) || {};
  }
  
  // Get specific stored credential
  getStoredCredential(userId: string, credentialId: string): StoredCredential | null {
    const credentials = this.getStoredCredentials(userId);
    return credentials[credentialId] || null;
  }
  
  // Store credential
  private storeCredential(userId: string, credentialId: string, credential: StoredCredential): void {
    const credentials = this.getStoredCredentials(userId);
    credentials[credentialId] = credential;
    secureLocalStorage.setItem(this.storageKey + '_' + userId, credentials);
  }
  
  // Disable credential
  disableCredential(userId: string, credentialId: string): boolean {
    const credential = this.getStoredCredential(userId, credentialId);
    if (!credential) return false;
    
    credential.isEnabled = false;
    this.storeCredential(userId, credentialId, credential);
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      {
        action: 'WebAuthn credential disabled',
        userId,
        credentialId: credentialId.substring(0, 8) + '...',
        deviceName: credential.deviceName,
      }
    );
    
    return true;
  }
  
  // Remove credential
  removeCredential(userId: string, credentialId: string): boolean {
    const credentials = this.getStoredCredentials(userId);
    const credential = credentials[credentialId];
    
    if (!credential) return false;
    
    delete credentials[credentialId];
    secureLocalStorage.setItem(this.storageKey + '_' + userId, credentials);
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.HIGH,
      {
        action: 'WebAuthn credential removed',
        userId,
        credentialId: credentialId.substring(0, 8) + '...',
        deviceName: credential.deviceName,
      }
    );
    
    auditTrail.log(
      AuditActionType.PROFILE_UPDATED,
      'user',
      {
        action: 'Hardware security key removed',
        deviceName: credential.deviceName,
      },
      { resourceId: userId }
    );
    
    return true;
  }
  
  // Utility methods
  private generateChallenge(): string {
    const challenge = secureRandom.generateBytes(32);
    return this.bufferToBase64url(challenge);
  }
  
  private getRpId(): string {
    if (typeof window === 'undefined') return 'localhost';
    return window.location.hostname;
  }
  
  private generateDeviceName(): string {
    const platform = this.detectPlatform();
    const timestamp = new Date().toLocaleDateString();
    return `${platform} Security Key (${timestamp})`;
  }
  
  private detectPlatform(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unknown';
  }
  
  // Buffer conversion utilities
  private stringToBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str);
  }
  
  private bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  private base64urlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }
  
  // Parse WebAuthn errors
  private parseWebAuthnError(error: any): { type: WebAuthnErrorType; message: string; details?: any } {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'InvalidStateError':
          return {
            type: WebAuthnErrorType.INVALID_STATE,
            message: 'Authenticator is already registered or in an invalid state',
          };
        case 'NotAllowedError':
          return {
            type: WebAuthnErrorType.NOT_ALLOWED,
            message: 'User cancelled the operation or device is not allowed',
          };
        case 'AbortError':
          return {
            type: WebAuthnErrorType.ABORT,
            message: 'Operation was aborted',
          };
        case 'ConstraintError':
          return {
            type: WebAuthnErrorType.CONSTRAINT,
            message: 'Constraint error occurred',
          };
        case 'DataError':
          return {
            type: WebAuthnErrorType.DATA,
            message: 'Data error occurred',
          };
        case 'InvalidModificationError':
          return {
            type: WebAuthnErrorType.INVALID_MODIFICATION,
            message: 'Invalid modification error',
          };
        case 'EncodingError':
          return {
            type: WebAuthnErrorType.ENCODING,
            message: 'Encoding error occurred',
          };
        case 'NetworkError':
          return {
            type: WebAuthnErrorType.NETWORK,
            message: 'Network error occurred',
          };
        case 'OperationError':
          return {
            type: WebAuthnErrorType.OPERATION,
            message: 'Operation error occurred',
          };
        case 'SecurityError':
          return {
            type: WebAuthnErrorType.SECURITY,
            message: 'Security error occurred',
          };
        case 'TimeoutError':
          return {
            type: WebAuthnErrorType.TIMEOUT,
            message: 'Operation timed out',
          };
        default:
          return {
            type: WebAuthnErrorType.UNKNOWN,
            message: error.message || 'Unknown WebAuthn error',
            details: error,
          };
      }
    }
    
    return {
      type: WebAuthnErrorType.UNKNOWN,
      message: error.message || 'Unknown error occurred',
      details: error,
    };
  }
}

// React hook for WebAuthn
export function useWebAuthn() {
  const manager = WebAuthnManager.getInstance();
  const [isSupported, setIsSupported] = React.useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = React.useState(false);
  
  React.useEffect(() => {
    setIsSupported(manager.isSupported());
    
    if (manager.isSupported()) {
      manager.isPlatformAuthenticatorAvailable().then(setIsPlatformAvailable);
    }
  }, [manager]);
  
  const registerCredential = React.useCallback(async (
    userId: string,
    username: string,
    displayName: string,
    deviceName?: string
  ) => {
    const options = manager.generateRegistrationOptions(userId, username, displayName);
    return await manager.registerCredential(userId, options, deviceName);
  }, [manager]);
  
  const authenticate = React.useCallback(async (userId: string) => {
    const options = manager.generateAuthenticationOptions(userId);
    return await manager.authenticateWithCredential(userId, options);
  }, [manager]);
  
  const getCredentials = React.useCallback((userId: string) => {
    return manager.getStoredCredentials(userId);
  }, [manager]);
  
  const removeCredential = React.useCallback((userId: string, credentialId: string) => {
    return manager.removeCredential(userId, credentialId);
  }, [manager]);
  
  return {
    isSupported,
    isPlatformAvailable,
    registerCredential,
    authenticate,
    getCredentials,
    removeCredential,
  };
}

// Export singleton
export const webAuthnManager = WebAuthnManager.getInstance();

import React from 'react';