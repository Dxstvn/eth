// Security library exports
export * from './validation';
export * from './xss-protection';
export * from './csrf-protection';
export * from './rate-limiting';
export * from './session-management';
export * from './security-logging';
export * from './secure-storage';
export * from './audit-trail';

// Main security configuration
export interface SecurityConfig {
  enableCSRFProtection: boolean;
  enableXSSProtection: boolean;
  enableRateLimit: boolean;
  enableSecureStorage: boolean;
  enableAuditTrail: boolean;
  enableSecurityLogging: boolean;
}

export const defaultSecurityConfig: SecurityConfig = {
  enableCSRFProtection: true,
  enableXSSProtection: true,
  enableRateLimit: true,
  enableSecureStorage: true,
  enableAuditTrail: true,
  enableSecurityLogging: true,
};

// Initialize security system
export function initializeSecurity(config: Partial<SecurityConfig> = {}): void {
  const finalConfig = { ...defaultSecurityConfig, ...config };
  
  if (typeof window !== 'undefined') {
    console.log('[Security] Initializing ClearHold security system...');
    
    if (finalConfig.enableXSSProtection) {
      import('./validation').then(({ setupCSPReporter }) => {
        setupCSPReporter();
      });
    }
    
    console.log('[Security] Security system initialized');
  }
}