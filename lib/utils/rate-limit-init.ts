import { getGlobalRateLimitMonitor } from './rate-limit-monitor';

/**
 * Initialize the global rate limit monitor with production settings
 */
export function initializeRateLimitMonitor() {
  const monitor = getGlobalRateLimitMonitor({
    suspiciousThreshold: 10, // 10 violations in 5 minutes
    timeWindowMs: 300000, // 5 minute window
    persistViolations: true,
    maxViolationHistory: 1000,
    onSuspiciousActivity: async (pattern) => {
      console.error('[SECURITY] Suspicious rate limit pattern detected:', {
        clientId: pattern.clientId,
        violations: pattern.totalViolations,
        endpoints: Array.from(pattern.endpoints),
        timespan: `${pattern.firstViolation.toISOString()} - ${pattern.lastViolation.toISOString()}`
      });

      // In production, send alerts
      if (process.env.NODE_ENV === 'production' && process.env.SECURITY_ALERT_WEBHOOK) {
        try {
          await fetch(process.env.SECURITY_ALERT_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'rate_limit_abuse',
              severity: 'high',
              pattern: {
                clientId: pattern.clientId,
                violations: pattern.totalViolations,
                endpoints: Array.from(pattern.endpoints),
                firstViolation: pattern.firstViolation.toISOString(),
                lastViolation: pattern.lastViolation.toISOString()
              },
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV
            })
          });
        } catch (error) {
          console.error('[SECURITY] Failed to send security alert:', error);
        }
      }
    },
    onViolation: (violation) => {
      // Log all violations in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[RATE LIMIT] Violation detected:', {
          endpoint: violation.endpoint,
          clientId: violation.clientId,
          timestamp: violation.timestamp.toISOString()
        });
      }
    }
  });

  // Set up periodic reporting in production
  if (process.env.NODE_ENV === 'production') {
    // Report statistics every hour
    setInterval(async () => {
      const stats = monitor.getStats();
      
      if (stats.totalViolations > 0) {
        console.log('[RATE LIMIT] Hourly statistics:', stats);
        
        // Send to monitoring service
        if (process.env.MONITORING_ENDPOINT) {
          try {
            await fetch(process.env.MONITORING_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'rate_limit_stats',
                stats,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV
              })
            });
          } catch (error) {
            console.error('[MONITORING] Failed to send statistics:', error);
          }
        }
      }
    }, 3600000); // 1 hour
  }

  return monitor;
}

/**
 * Rate limit configuration for different environments
 */
export const RATE_LIMIT_CONFIG = {
  development: {
    kyc: {
      '/kyc': { windowMs: 60000, max: 100 }, // More lenient in dev
      '/kyc/personal': { windowMs: 60000, max: 50 },
      '/kyc/documents': { windowMs: 60000, max: 20 },
      '/kyc/verification': { windowMs: 60000, max: 20 },
      '/api/kyc': { windowMs: 60000, max: 100 }
    }
  },
  production: {
    kyc: {
      '/kyc': { windowMs: 60000, max: 30 },
      '/kyc/personal': { windowMs: 60000, max: 10 },
      '/kyc/documents': { windowMs: 60000, max: 5 },
      '/kyc/verification': { windowMs: 60000, max: 5 },
      '/api/kyc': { windowMs: 60000, max: 20 }
    }
  }
};

/**
 * Get rate limit configuration for current environment
 */
export function getRateLimitConfig() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  return RATE_LIMIT_CONFIG[env];
}

/**
 * Check if a client should be auto-blocked based on patterns
 */
export function shouldAutoBlock(clientId: string, violations: number): boolean {
  // Auto-block thresholds
  const thresholds = {
    immediate: 50, // Block immediately if 50+ violations in window
    escalated: 25, // Escalate if 25+ violations
    warning: 10    // Warning level
  };

  if (violations >= thresholds.immediate) {
    console.error(`[SECURITY] Auto-blocking client ${clientId} - ${violations} violations`);
    return true;
  }

  if (violations >= thresholds.escalated) {
    console.warn(`[SECURITY] Client ${clientId} escalated - ${violations} violations`);
    // In production, this would trigger manual review
  }

  return false;
}

/**
 * Apply temporary block to a client
 */
export async function blockClient(
  clientId: string, 
  duration: number = 3600000, // 1 hour default
  reason: string = 'Rate limit abuse'
) {
  const blockList = new Map<string, { until: Date; reason: string }>();
  
  blockList.set(clientId, {
    until: new Date(Date.now() + duration),
    reason
  });

  console.error(`[SECURITY] Client blocked:`, {
    clientId,
    until: blockList.get(clientId)?.until.toISOString(),
    reason
  });

  // In production, persist to database
  if (process.env.NODE_ENV === 'production' && process.env.BLOCK_LIST_ENDPOINT) {
    try {
      await fetch(process.env.BLOCK_LIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          blockedUntil: blockList.get(clientId)?.until.toISOString(),
          reason,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('[SECURITY] Failed to persist block:', error);
    }
  }

  return blockList;
}

// Auto-initialize in non-test environments
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeRateLimitMonitor();
}