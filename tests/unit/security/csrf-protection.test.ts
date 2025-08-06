import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

/**
 * Security Unit Tests - CSRF Protection
 * Tests Cross-Site Request Forgery prevention mechanisms
 */

interface CSRFToken {
  token: string;
  expiresAt: number;
  sessionId: string;
}

class CSRFProtection {
  private tokens: Map<string, CSRFToken> = new Map();
  private tokenLength = 32;
  private tokenTTL = 3600000; // 1 hour in milliseconds

  /**
   * Generate a new CSRF token for a session
   */
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(this.tokenLength).toString('hex');
    const expiresAt = Date.now() + this.tokenTTL;
    
    this.tokens.set(token, {
      token,
      expiresAt,
      sessionId
    });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  /**
   * Validate a CSRF token
   */
  validateToken(token: string, sessionId: string): boolean {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return false;
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return false;
    }
    
    // Check if token belongs to the session
    if (tokenData.sessionId !== sessionId) {
      return false;
    }
    
    return true;
  }

  /**
   * Consume a token (single-use tokens)
   */
  consumeToken(token: string, sessionId: string): boolean {
    const isValid = this.validateToken(token, sessionId);
    
    if (isValid) {
      this.tokens.delete(token);
    }
    
    return isValid;
  }

  /**
   * Rotate token (generate new, invalidate old)
   */
  rotateToken(oldToken: string, sessionId: string): string | null {
    if (this.validateToken(oldToken, sessionId)) {
      this.tokens.delete(oldToken);
      return this.generateToken(sessionId);
    }
    
    return null;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Get all tokens for a session (for testing)
   */
  getSessionTokens(sessionId: string): string[] {
    const sessionTokens: string[] = [];
    
    for (const [token, data] of this.tokens.entries()) {
      if (data.sessionId === sessionId) {
        sessionTokens.push(token);
      }
    }
    
    return sessionTokens;
  }

  /**
   * Clear all tokens for a session
   */
  clearSessionTokens(sessionId: string): void {
    for (const [token, data] of this.tokens.entries()) {
      if (data.sessionId === sessionId) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Check origin header for CSRF protection
   */
  validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.includes(origin);
  }

  /**
   * Check referer header for CSRF protection
   */
  validateReferer(referer: string, expectedHost: string): boolean {
    try {
      const url = new URL(referer);
      return url.host === expectedHost;
    } catch {
      return false;
    }
  }
}

describe('Security: CSRF Protection', () => {
  let csrfProtection: CSRFProtection;

  beforeEach(() => {
    csrfProtection = new CSRFProtection();
  });

  describe('Token Generation', () => {
    it('should generate unique tokens', () => {
      const sessionId = 'session-123';
      const tokens = new Set();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(csrfProtection.generateToken(sessionId));
      }
      
      expect(tokens.size).toBe(100);
    });

    it('should generate tokens of correct length', () => {
      const sessionId = 'session-123';
      const token = csrfProtection.generateToken(sessionId);
      
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should associate tokens with sessions', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      const token1 = csrfProtection.generateToken(session1);
      const token2 = csrfProtection.generateToken(session2);
      
      expect(csrfProtection.validateToken(token1, session1)).toBe(true);
      expect(csrfProtection.validateToken(token2, session2)).toBe(true);
      expect(csrfProtection.validateToken(token1, session2)).toBe(false);
      expect(csrfProtection.validateToken(token2, session1)).toBe(false);
    });
  });

  describe('Token Validation', () => {
    it('should validate correct token and session', () => {
      const sessionId = 'session-123';
      const token = csrfProtection.generateToken(sessionId);
      
      expect(csrfProtection.validateToken(token, sessionId)).toBe(true);
    });

    it('should reject invalid tokens', () => {
      const sessionId = 'session-123';
      const fakeToken = 'fake-token-123';
      
      expect(csrfProtection.validateToken(fakeToken, sessionId)).toBe(false);
    });

    it('should reject token from different session', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      const token = csrfProtection.generateToken(session1);
      
      expect(csrfProtection.validateToken(token, session2)).toBe(false);
    });

    it('should reject expired tokens', () => {
      const sessionId = 'session-123';
      const token = csrfProtection.generateToken(sessionId);
      
      // Manually expire the token
      const tokenData = (csrfProtection as any).tokens.get(token);
      if (tokenData) {
        tokenData.expiresAt = Date.now() - 1000;
      }
      
      expect(csrfProtection.validateToken(token, sessionId)).toBe(false);
    });
  });

  describe('Single-Use Tokens', () => {
    it('should consume token on use', () => {
      const sessionId = 'session-123';
      const token = csrfProtection.generateToken(sessionId);
      
      // First use should succeed
      expect(csrfProtection.consumeToken(token, sessionId)).toBe(true);
      
      // Second use should fail
      expect(csrfProtection.consumeToken(token, sessionId)).toBe(false);
    });

    it('should not consume invalid tokens', () => {
      const sessionId = 'session-123';
      const fakeToken = 'fake-token';
      
      expect(csrfProtection.consumeToken(fakeToken, sessionId)).toBe(false);
    });
  });

  describe('Token Rotation', () => {
    it('should rotate valid tokens', () => {
      const sessionId = 'session-123';
      const oldToken = csrfProtection.generateToken(sessionId);
      
      const newToken = csrfProtection.rotateToken(oldToken, sessionId);
      
      expect(newToken).not.toBeNull();
      expect(newToken).not.toBe(oldToken);
      expect(csrfProtection.validateToken(oldToken, sessionId)).toBe(false);
      expect(csrfProtection.validateToken(newToken!, sessionId)).toBe(true);
    });

    it('should not rotate invalid tokens', () => {
      const sessionId = 'session-123';
      const fakeToken = 'fake-token';
      
      const newToken = csrfProtection.rotateToken(fakeToken, sessionId);
      
      expect(newToken).toBeNull();
    });

    it('should not rotate token for wrong session', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      const token = csrfProtection.generateToken(session1);
      
      const newToken = csrfProtection.rotateToken(token, session2);
      
      expect(newToken).toBeNull();
      expect(csrfProtection.validateToken(token, session1)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should track multiple tokens per session', () => {
      const sessionId = 'session-123';
      
      const token1 = csrfProtection.generateToken(sessionId);
      const token2 = csrfProtection.generateToken(sessionId);
      const token3 = csrfProtection.generateToken(sessionId);
      
      const sessionTokens = csrfProtection.getSessionTokens(sessionId);
      expect(sessionTokens).toContain(token1);
      expect(sessionTokens).toContain(token2);
      expect(sessionTokens).toContain(token3);
    });

    it('should clear all session tokens', () => {
      const sessionId = 'session-123';
      
      const token1 = csrfProtection.generateToken(sessionId);
      const token2 = csrfProtection.generateToken(sessionId);
      
      csrfProtection.clearSessionTokens(sessionId);
      
      expect(csrfProtection.validateToken(token1, sessionId)).toBe(false);
      expect(csrfProtection.validateToken(token2, sessionId)).toBe(false);
      expect(csrfProtection.getSessionTokens(sessionId).length).toBe(0);
    });

    it('should not affect other sessions when clearing', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      const token1 = csrfProtection.generateToken(session1);
      const token2 = csrfProtection.generateToken(session2);
      
      csrfProtection.clearSessionTokens(session1);
      
      expect(csrfProtection.validateToken(token1, session1)).toBe(false);
      expect(csrfProtection.validateToken(token2, session2)).toBe(true);
    });
  });

  describe('Origin Validation', () => {
    it('should validate allowed origins', () => {
      const allowedOrigins = [
        'https://example.com',
        'https://app.example.com',
        'http://localhost:3000'
      ];
      
      expect(csrfProtection.validateOrigin('https://example.com', allowedOrigins)).toBe(true);
      expect(csrfProtection.validateOrigin('https://app.example.com', allowedOrigins)).toBe(true);
      expect(csrfProtection.validateOrigin('http://localhost:3000', allowedOrigins)).toBe(true);
    });

    it('should reject disallowed origins', () => {
      const allowedOrigins = ['https://example.com'];
      
      expect(csrfProtection.validateOrigin('https://evil.com', allowedOrigins)).toBe(false);
      expect(csrfProtection.validateOrigin('http://example.com', allowedOrigins)).toBe(false);
      expect(csrfProtection.validateOrigin('', allowedOrigins)).toBe(false);
    });
  });

  describe('Referer Validation', () => {
    it('should validate correct referer', () => {
      const expectedHost = 'example.com';
      
      expect(csrfProtection.validateReferer('https://example.com/page', expectedHost)).toBe(true);
      expect(csrfProtection.validateReferer('http://example.com/other', expectedHost)).toBe(true);
    });

    it('should reject incorrect referer', () => {
      const expectedHost = 'example.com';
      
      expect(csrfProtection.validateReferer('https://evil.com/page', expectedHost)).toBe(false);
      expect(csrfProtection.validateReferer('https://sub.example.com/page', expectedHost)).toBe(false);
    });

    it('should handle invalid referer URLs', () => {
      const expectedHost = 'example.com';
      
      expect(csrfProtection.validateReferer('not-a-url', expectedHost)).toBe(false);
      expect(csrfProtection.validateReferer('', expectedHost)).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle token fixation attempts', () => {
      const sessionId = 'session-123';
      const attackerToken = 'attacker-controlled-token';
      
      // Attacker cannot validate a token they didn't generate
      expect(csrfProtection.validateToken(attackerToken, sessionId)).toBe(false);
    });

    it('should prevent token reuse after rotation', () => {
      const sessionId = 'session-123';
      const token1 = csrfProtection.generateToken(sessionId);
      
      const token2 = csrfProtection.rotateToken(token1, sessionId);
      const token3 = csrfProtection.rotateToken(token1, sessionId); // Try to rotate old token
      
      expect(token2).not.toBeNull();
      expect(token3).toBeNull();
    });

    it('should handle concurrent token generation', () => {
      const sessionId = 'session-123';
      const tokens: string[] = [];
      
      // Simulate concurrent token generation
      for (let i = 0; i < 10; i++) {
        tokens.push(csrfProtection.generateToken(sessionId));
      }
      
      // All tokens should be valid
      tokens.forEach(token => {
        expect(csrfProtection.validateToken(token, sessionId)).toBe(true);
      });
      
      // All tokens should be unique
      expect(new Set(tokens).size).toBe(10);
    });
  });
});