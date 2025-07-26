// Cryptographic Security exports
export * from './crypto-utils';
export * from './wallet-security';
export * from './secure-communication';
export * from './password-security';
export * from './mfa-support';
export * from './webauthn-support';
export * from './kyc-encryption';

// Re-export main security library
export * from './index';

// Main cryptographic configuration
export interface CryptographicSecurityConfig {
  enableAdvancedEncryption: boolean;
  enableWalletSecurity: boolean;
  enableSecureCommunication: boolean;
  enablePasswordSecurity: boolean;
  enableMFA: boolean;
  enableWebAuthn: boolean;
}

export const defaultCryptographicConfig: CryptographicSecurityConfig = {
  enableAdvancedEncryption: true,
  enableWalletSecurity: true,
  enableSecureCommunication: true,
  enablePasswordSecurity: true,
  enableMFA: true,
  enableWebAuthn: true,
};

// Initialize cryptographic security system
export function initializeCryptographicSecurity(
  config: Partial<CryptographicSecurityConfig> = {}
): void {
  const finalConfig = { ...defaultCryptographicConfig, ...config };
  
  if (typeof window !== 'undefined') {
    console.log('[CryptoSecurity] Initializing cryptographic security system...');
    
    // Initialize components based on configuration
    if (finalConfig.enablePasswordSecurity) {
      import('./password-security').then(({ passwordSecurityManager }) => {
        console.log('[CryptoSecurity] Password security initialized');
      });
    }
    
    if (finalConfig.enableMFA) {
      import('./mfa-support').then(({ mfaManager }) => {
        console.log('[CryptoSecurity] MFA support initialized');
      });
    }
    
    if (finalConfig.enableWebAuthn) {
      import('./webauthn-support').then(({ webAuthnManager }) => {
        if (webAuthnManager.isSupported()) {
          console.log('[CryptoSecurity] WebAuthn support initialized');
        }
      });
    }
    
    if (finalConfig.enableSecureCommunication) {
      import('./secure-communication').then(({ certificatePinner }) => {
        console.log('[CryptoSecurity] Secure communication initialized');
      });
    }
    
    console.log('[CryptoSecurity] Cryptographic security system initialized');
  }
}