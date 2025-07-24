import { z } from 'zod';
import CryptoJS from 'crypto-js';
import { secureRandom } from './crypto-utils';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';

// Password policy configuration
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  forbidUserInfo: boolean;
  forbidRepeatingChars: boolean;
  forbidSequentialChars: boolean;
  maxPasswordAge: number; // days
  preventReuse: number; // number of previous passwords to check
  requireComplexity: boolean;
  minComplexityScore: number;
}

// Default security policy for financial applications
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbidCommonPasswords: true,
  forbidUserInfo: true,
  forbidRepeatingChars: true,
  forbidSequentialChars: true,
  maxPasswordAge: 90,
  preventReuse: 5,
  requireComplexity: true,
  minComplexityScore: 70,
};

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4,
  VERY_STRONG = 5,
}

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Common passwords list (subset for demo - real implementation would use larger list)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
  'princess', 'superman', 'batman', 'shadow', 'master', 'jordan',
  'jennifer', 'hunter', 'daniel', 'michael', 'matthew', 'charlie',
  'clearhold', 'escrow', 'wallet', 'bitcoin', 'ethereum', 'crypto',
]);

// Password security manager
export class PasswordSecurityManager {
  private static instance: PasswordSecurityManager;
  private policy: PasswordPolicy;
  
  private constructor(policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY) {
    this.policy = policy;
  }
  
  static getInstance(policy?: PasswordPolicy): PasswordSecurityManager {
    if (!PasswordSecurityManager.instance) {
      PasswordSecurityManager.instance = new PasswordSecurityManager(policy);
    }
    return PasswordSecurityManager.instance;
  }
  
  // Validate password against policy
  validatePassword(password: string, userInfo?: {
    email?: string;
    name?: string;
    username?: string;
  }): PasswordValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Length validation
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }
    
    if (password.length > this.policy.maxLength) {
      errors.push(`Password must be no more than ${this.policy.maxLength} characters long`);
    }
    
    // Character requirements
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
      suggestions.push('Add uppercase letters (A-Z)');
    }
    
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
      suggestions.push('Add lowercase letters (a-z)');
    }
    
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
      suggestions.push('Add numbers (0-9)');
    }
    
    if (this.policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
      suggestions.push('Add special characters (!@#$%^&*(),.?":{}|<>)');
    }
    
    // Common password check
    if (this.policy.forbidCommonPasswords) {
      const lowercasePassword = password.toLowerCase();
      if (COMMON_PASSWORDS.has(lowercasePassword)) {
        errors.push('Password is too common');
        suggestions.push('Use a unique password that others cannot easily guess');
      }
    }
    
    // User info check
    if (this.policy.forbidUserInfo && userInfo) {
      const userInfoValues = [
        userInfo.email?.split('@')[0].toLowerCase(),
        userInfo.name?.toLowerCase(),
        userInfo.username?.toLowerCase(),
      ].filter(Boolean) as string[];
      
      const lowercasePassword = password.toLowerCase();
      for (const info of userInfoValues) {
        if (info && lowercasePassword.includes(info)) {
          errors.push('Password should not contain personal information');
          suggestions.push('Avoid using your name, username, or email in your password');
          break;
        }
      }
    }
    
    // Repeating characters check
    if (this.policy.forbidRepeatingChars) {
      const repeatingPattern = /(.)\1{2,}/;
      if (repeatingPattern.test(password)) {
        warnings.push('Password contains repeating characters');
        suggestions.push('Avoid repeating the same character multiple times');
      }
    }
    
    // Sequential characters check
    if (this.policy.forbidSequentialChars) {
      if (this.hasSequentialChars(password)) {
        warnings.push('Password contains sequential characters');
        suggestions.push('Avoid sequential characters like "123" or "abc"');
      }
    }
    
    // Calculate strength and score
    const { strength, score } = this.calculatePasswordStrength(password);
    
    // Complexity requirement
    if (this.policy.requireComplexity && score < this.policy.minComplexityScore) {
      errors.push(`Password complexity score (${score}) is below required minimum (${this.policy.minComplexityScore})`);
      suggestions.push('Use a longer password with a mix of character types');
    }
    
    return {
      isValid: errors.length === 0,
      strength,
      score,
      errors,
      warnings,
      suggestions,
    };
  }
  
  // Calculate password strength and score
  private calculatePasswordStrength(password: string): { strength: PasswordStrength; score: number } {
    let score = 0;
    
    // Length score (0-25 points)
    score += Math.min(password.length * 2, 25);
    
    // Character diversity (0-25 points)
    let charTypes = 0;
    if (/[a-z]/.test(password)) charTypes++;
    if (/[A-Z]/.test(password)) charTypes++;
    if (/\d/.test(password)) charTypes++;
    if (/[^a-zA-Z\d]/.test(password)) charTypes++;
    score += charTypes * 6;
    
    // Uniqueness (0-20 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);
    
    // Pattern analysis (0-15 points)
    if (!this.hasSequentialChars(password)) score += 5;
    if (!/(.)\1{2,}/.test(password)) score += 5;
    if (!COMMON_PASSWORDS.has(password.toLowerCase())) score += 5;
    
    // Entropy calculation (0-15 points)
    const entropy = this.calculateEntropy(password);
    score += Math.min(entropy / 4, 15);
    
    // Determine strength level
    let strength: PasswordStrength;
    if (score < 20) strength = PasswordStrength.VERY_WEAK;
    else if (score < 40) strength = PasswordStrength.WEAK;
    else if (score < 60) strength = PasswordStrength.FAIR;
    else if (score < 80) strength = PasswordStrength.GOOD;
    else if (score < 90) strength = PasswordStrength.STRONG;
    else strength = PasswordStrength.VERY_STRONG;
    
    return { strength, score: Math.min(score, 100) };
  }
  
  // Calculate password entropy
  private calculateEntropy(password: string): number {
    let charSpace = 0;
    
    if (/[a-z]/.test(password)) charSpace += 26;
    if (/[A-Z]/.test(password)) charSpace += 26;
    if (/\d/.test(password)) charSpace += 10;
    if (/[^a-zA-Z\d]/.test(password)) charSpace += 32;
    
    return Math.log2(Math.pow(charSpace, password.length));
  }
  
  // Check for sequential characters
  private hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      'qwertyuiopasdfghjklzxcvbnm',
    ];
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        if (password.includes(sequence.substr(i, 3))) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Generate secure password
  generateSecurePassword(length: number = 16, options?: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSpecialChars?: boolean;
    excludeSimilarChars?: boolean;
  }): string {
    const opts = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSpecialChars: true,
      excludeSimilarChars: true,
      ...options,
    };
    
    let charset = '';
    if (opts.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.includeNumbers) charset += '0123456789';
    if (opts.includeSpecialChars) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Exclude similar characters to avoid confusion
    if (opts.excludeSimilarChars) {
      charset = charset.replace(/[0Oo1Il]/g, '');
    }
    
    if (!charset) {
      throw new Error('At least one character type must be included');
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = secureRandom.generateNumber(0, charset.length);
      password += charset[randomIndex];
    }
    
    // Ensure password meets requirements
    const validation = this.validatePassword(password);
    if (!validation.isValid && validation.score < 70) {
      // Try again with different parameters
      return this.generateSecurePassword(Math.max(length, 16), opts);
    }
    
    return password;
  }
  
  // Hash password securely
  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const passwordSalt = salt || secureRandom.generateString(32);
    
    // Use PBKDF2 with high iteration count
    const hash = CryptoJS.PBKDF2(password, passwordSalt, {
      keySize: 512 / 32,
      iterations: 100000,
    }).toString();
    
    return { hash, salt: passwordSalt };
  }
  
  // Verify password against hash
  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return this.constantTimeCompare(hash, computedHash);
  }
  
  // Constant-time string comparison to prevent timing attacks
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
  
  // Generate password recovery codes
  generateRecoveryCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = secureRandom.generateString(8).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      codes.push(code.padEnd(8, '0')); // Ensure 8 characters
    }
    
    return codes;
  }
  
  // Update password policy
  updatePolicy(newPolicy: Partial<PasswordPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.MEDIUM,
      { action: 'Password policy updated', changes: newPolicy }
    );
  }
}

// React hook for password validation
export function usePasswordValidator(policy?: PasswordPolicy) {
  const manager = React.useMemo(
    () => PasswordSecurityManager.getInstance(policy),
    [policy]
  );
  
  const [validationResult, setValidationResult] = React.useState<PasswordValidationResult | null>(null);
  
  const validatePassword = React.useCallback(
    (password: string, userInfo?: { email?: string; name?: string; username?: string }) => {
      const result = manager.validatePassword(password, userInfo);
      setValidationResult(result);
      return result;
    },
    [manager]
  );
  
  const generatePassword = React.useCallback(
    (length?: number, options?: Parameters<typeof manager.generateSecurePassword>[1]) => {
      return manager.generateSecurePassword(length, options);
    },
    [manager]
  );
  
  return {
    validatePassword,
    generatePassword,
    validationResult,
  };
}

// Password strength indicator component
interface PasswordStrengthIndicatorProps {
  password: string;
  userInfo?: { email?: string; name?: string; username?: string };
  className?: string;
}

export function PasswordStrengthIndicator({ 
  password, 
  userInfo, 
  className 
}: PasswordStrengthIndicatorProps) {
  const { validatePassword } = usePasswordValidator();
  const [result, setResult] = React.useState<PasswordValidationResult | null>(null);
  
  React.useEffect(() => {
    if (password) {
      const validation = validatePassword(password, userInfo);
      setResult(validation);
    } else {
      setResult(null);
    }
  }, [password, userInfo, validatePassword]);
  
  if (!result || !password) return null;
  
  const strengthLabels = {
    [PasswordStrength.VERY_WEAK]: 'Very Weak',
    [PasswordStrength.WEAK]: 'Weak',
    [PasswordStrength.FAIR]: 'Fair',
    [PasswordStrength.GOOD]: 'Good',
    [PasswordStrength.STRONG]: 'Strong',
    [PasswordStrength.VERY_STRONG]: 'Very Strong',
  };
  
  const strengthColors = {
    [PasswordStrength.VERY_WEAK]: 'bg-red-500',
    [PasswordStrength.WEAK]: 'bg-red-400',
    [PasswordStrength.FAIR]: 'bg-yellow-500',
    [PasswordStrength.GOOD]: 'bg-blue-500',
    [PasswordStrength.STRONG]: 'bg-green-500',
    [PasswordStrength.VERY_STRONG]: 'bg-green-600',
  };
  
  return (
    <div className={className}>
      {/* Strength bar */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${strengthColors[result.strength]}`}
            style={{ width: `${(result.score / 100) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium">
          {strengthLabels[result.strength]} ({result.score}/100)
        </span>
      </div>
      
      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="text-red-600 text-sm mb-2">
          <ul className="list-disc list-inside">
            {result.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="text-yellow-600 text-sm mb-2">
          <ul className="list-disc list-inside">
            {result.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="text-blue-600 text-sm">
          <p className="font-medium">Suggestions:</p>
          <ul className="list-disc list-inside">
            {result.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Export singleton
export const passwordSecurityManager = PasswordSecurityManager.getInstance();

import React from 'react';