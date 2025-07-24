import { v4 as uuidv4 } from 'uuid';

// Session configuration
export const SESSION_CONFIG = {
  // Session timeout in milliseconds
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  // Warning time before session expires
  warningTime: 5 * 60 * 1000, // 5 minutes
  // Session storage keys
  sessionKey: 'clearhold_session',
  sessionExpiryKey: 'clearhold_session_expiry',
  sessionActivityKey: 'clearhold_session_activity',
  // Maximum session duration
  maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
};

// Session data interface
export interface SessionData {
  id: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  fingerprint: string;
  metadata?: Record<string, any>;
}

// Browser fingerprinting for session security
function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    (navigator as any).deviceMemory || 'unknown',
  ];
  
  return btoa(components.join('|'));
}

// Secure session manager
export class SecureSessionManager {
  private static instance: SecureSessionManager;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private warningCallback?: () => void;
  private expiredCallback?: () => void;
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.startSessionMonitoring();
      this.attachActivityListeners();
    }
  }
  
  static getInstance(): SecureSessionManager {
    if (!SecureSessionManager.instance) {
      SecureSessionManager.instance = new SecureSessionManager();
    }
    return SecureSessionManager.instance;
  }
  
  // Create a new session
  createSession(userId: string, metadata?: Record<string, any>): SessionData {
    const now = Date.now();
    const session: SessionData = {
      id: uuidv4(),
      userId,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + SESSION_CONFIG.sessionTimeout,
      fingerprint: generateFingerprint(),
      metadata,
    };
    
    this.saveSession(session);
    return session;
  }
  
  // Get current session
  getSession(): SessionData | null {
    if (typeof window === 'undefined') return null;
    
    const sessionStr = sessionStorage.getItem(SESSION_CONFIG.sessionKey);
    if (!sessionStr) return null;
    
    try {
      const session: SessionData = JSON.parse(sessionStr);
      
      // Validate session fingerprint
      if (session.fingerprint !== generateFingerprint()) {
        console.warn('Session fingerprint mismatch - possible session hijacking attempt');
        this.destroySession();
        return null;
      }
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.destroySession();
        return null;
      }
      
      // Check maximum session duration
      if (Date.now() - session.createdAt > SESSION_CONFIG.maxSessionDuration) {
        this.destroySession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Failed to parse session:', error);
      this.destroySession();
      return null;
    }
  }
  
  // Update session activity
  updateActivity(): void {
    const session = this.getSession();
    if (!session) return;
    
    const now = Date.now();
    session.lastActivity = now;
    session.expiresAt = now + SESSION_CONFIG.sessionTimeout;
    
    this.saveSession(session);
  }
  
  // Save session to storage
  private saveSession(session: SessionData): void {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(SESSION_CONFIG.sessionKey, JSON.stringify(session));
    sessionStorage.setItem(SESSION_CONFIG.sessionExpiryKey, session.expiresAt.toString());
    localStorage.setItem(SESSION_CONFIG.sessionActivityKey, Date.now().toString());
  }
  
  // Destroy session
  destroySession(): void {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem(SESSION_CONFIG.sessionKey);
    sessionStorage.removeItem(SESSION_CONFIG.sessionExpiryKey);
    localStorage.removeItem(SESSION_CONFIG.sessionActivityKey);
    
    // Clear auth token as well
    localStorage.removeItem('clearhold_auth_token');
    
    if (this.expiredCallback) {
      this.expiredCallback();
    }
  }
  
  // Start monitoring session
  private startSessionMonitoring(): void {
    // Check session every minute
    this.sessionCheckInterval = setInterval(() => {
      const session = this.getSession();
      if (!session) return;
      
      const timeRemaining = session.expiresAt - Date.now();
      
      // Warn when approaching expiry
      if (timeRemaining <= SESSION_CONFIG.warningTime && timeRemaining > 0) {
        if (this.warningCallback) {
          this.warningCallback();
        }
      }
      
      // Check for session expiry
      if (timeRemaining <= 0) {
        this.destroySession();
      }
    }, 60 * 1000); // Check every minute
  }
  
  // Attach activity listeners
  private attachActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    let lastActivity = Date.now();
    const activityHandler = () => {
      const now = Date.now();
      // Only update if more than 1 minute since last update
      if (now - lastActivity > 60 * 1000) {
        lastActivity = now;
        this.updateActivity();
      }
    };
    
    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });
    
    // Listen for activity in other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_CONFIG.sessionActivityKey) {
        this.updateActivity();
      }
    });
  }
  
  // Set warning callback
  onSessionWarning(callback: () => void): void {
    this.warningCallback = callback;
  }
  
  // Set expired callback
  onSessionExpired(callback: () => void): void {
    this.expiredCallback = callback;
  }
  
  // Get time remaining in session
  getTimeRemaining(): number {
    const session = this.getSession();
    if (!session) return 0;
    
    return Math.max(0, session.expiresAt - Date.now());
  }
  
  // Extend session
  extendSession(): void {
    this.updateActivity();
  }
  
  // Clean up
  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
  }
}

// Session manager singleton
export const sessionManager = SecureSessionManager.getInstance();

// React hook for session management
export function useSession() {
  const [session, setSession] = React.useState<SessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [showWarning, setShowWarning] = React.useState(false);
  
  React.useEffect(() => {
    // Initial session check
    const currentSession = sessionManager.getSession();
    setSession(currentSession);
    
    // Set up warning callback
    sessionManager.onSessionWarning(() => {
      setShowWarning(true);
    });
    
    // Set up expired callback
    sessionManager.onSessionExpired(() => {
      setSession(null);
      setShowWarning(false);
      // Redirect to login or show session expired message
      window.location.href = '/login?session=expired';
    });
    
    // Update time remaining every second
    const interval = setInterval(() => {
      const remaining = sessionManager.getTimeRemaining();
      setTimeRemaining(remaining);
      
      const currentSession = sessionManager.getSession();
      setSession(currentSession);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const extendSession = React.useCallback(() => {
    sessionManager.extendSession();
    setShowWarning(false);
  }, []);
  
  const endSession = React.useCallback(() => {
    sessionManager.destroySession();
    setSession(null);
  }, []);
  
  return {
    session,
    timeRemaining,
    showWarning,
    extendSession,
    endSession,
  };
}

// Session timeout warning component
export function SessionTimeoutWarning() {
  const { showWarning, timeRemaining, extendSession } = useSession();
  
  if (!showWarning) return null;
  
  const minutes = Math.floor(timeRemaining / (60 * 1000));
  const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold text-yellow-800 mb-2">Session Expiring Soon</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
      <button
        onClick={extendSession}
        className="w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
      >
        Extend Session
      </button>
    </div>
  );
}

// Concurrent session detection
export class ConcurrentSessionDetector {
  private storageKey = 'clearhold_active_sessions';
  private sessionId: string;
  
  constructor() {
    this.sessionId = uuidv4();
  }
  
  registerSession(): void {
    if (typeof window === 'undefined') return;
    
    const sessions = this.getActiveSessions();
    sessions[this.sessionId] = {
      timestamp: Date.now(),
      fingerprint: generateFingerprint(),
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(sessions));
    
    // Listen for other sessions
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }
  
  private getActiveSessions(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
  
  private handleStorageChange(e: StorageEvent): void {
    if (e.key !== this.storageKey) return;
    
    const sessions = this.getActiveSessions();
    const otherSessions = Object.entries(sessions).filter(
      ([id]) => id !== this.sessionId
    );
    
    if (otherSessions.length > 0) {
      console.warn('Concurrent session detected');
      // Handle concurrent session (e.g., show warning, force logout, etc.)
    }
  }
  
  unregisterSession(): void {
    const sessions = this.getActiveSessions();
    delete sessions[this.sessionId];
    localStorage.setItem(this.storageKey, JSON.stringify(sessions));
  }
}

import React from 'react';