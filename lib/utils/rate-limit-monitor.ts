import { EventEmitter } from 'events';

export interface RateLimitViolation {
  timestamp: Date;
  endpoint: string;
  clientId: string;
  userAgent?: string;
  ip?: string;
  attemptCount: number;
  limit: number;
  windowMs: number;
}

export interface RateLimitPattern {
  clientId: string;
  violations: RateLimitViolation[];
  firstViolation: Date;
  lastViolation: Date;
  totalViolations: number;
  endpoints: Set<string>;
}

export interface MonitoringConfig {
  suspiciousThreshold: number; // Number of violations to trigger alert
  timeWindowMs: number; // Time window for pattern detection
  onSuspiciousActivity?: (pattern: RateLimitPattern) => void;
  onViolation?: (violation: RateLimitViolation) => void;
  persistViolations?: boolean;
  maxViolationHistory?: number;
}

class MonitorEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

/**
 * Rate limit monitoring service for detecting patterns and suspicious activity
 */
export class RateLimitMonitor {
  private violations: Map<string, RateLimitViolation[]> = new Map();
  private patterns: Map<string, RateLimitPattern> = new Map();
  private eventEmitter = new MonitorEventEmitter();

  constructor(private config: MonitoringConfig) {
    // Clean up old violations periodically
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupOldViolations(), 60000); // Every minute
    }
  }

  /**
   * Record a rate limit violation
   */
  public recordViolation(violation: Omit<RateLimitViolation, 'timestamp'>) {
    const fullViolation: RateLimitViolation = {
      ...violation,
      timestamp: new Date()
    };

    // Store violation
    const violations = this.violations.get(violation.clientId) || [];
    violations.push(fullViolation);
    
    // Limit history size
    if (this.config.maxViolationHistory && violations.length > this.config.maxViolationHistory) {
      violations.shift();
    }
    
    this.violations.set(violation.clientId, violations);

    // Update patterns
    this.updatePatterns(violation.clientId);

    // Emit events
    this.config.onViolation?.(fullViolation);
    this.eventEmitter.emit('violation', fullViolation);

    // Check for suspicious activity
    const pattern = this.patterns.get(violation.clientId);
    if (pattern && pattern.totalViolations >= this.config.suspiciousThreshold) {
      this.config.onSuspiciousActivity?.(pattern);
      this.eventEmitter.emit('suspicious-activity', pattern);
    }

    // Persist if configured
    if (this.config.persistViolations) {
      this.persistViolation(fullViolation);
    }
  }

  /**
   * Get violations for a specific client
   */
  public getViolations(clientId: string): RateLimitViolation[] {
    return this.violations.get(clientId) || [];
  }

  /**
   * Get all current patterns
   */
  public getPatterns(): RateLimitPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get suspicious patterns
   */
  public getSuspiciousPatterns(): RateLimitPattern[] {
    return this.getPatterns().filter(
      pattern => pattern.totalViolations >= this.config.suspiciousThreshold
    );
  }

  /**
   * Get statistics
   */
  public getStats() {
    const now = Date.now();
    const recentViolations = Array.from(this.violations.values())
      .flat()
      .filter(v => now - v.timestamp.getTime() < this.config.timeWindowMs);

    const endpointStats: Record<string, number> = {};
    const clientStats: Record<string, number> = {};

    recentViolations.forEach(violation => {
      endpointStats[violation.endpoint] = (endpointStats[violation.endpoint] || 0) + 1;
      clientStats[violation.clientId] = (clientStats[violation.clientId] || 0) + 1;
    });

    return {
      totalViolations: recentViolations.length,
      uniqueClients: Object.keys(clientStats).length,
      suspiciousPatterns: this.getSuspiciousPatterns().length,
      topEndpoints: Object.entries(endpointStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      topClients: Object.entries(clientStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([clientId, count]) => ({ clientId, count }))
    };
  }

  /**
   * Clear violations for a specific client
   */
  public clearClient(clientId: string) {
    this.violations.delete(clientId);
    this.patterns.delete(clientId);
    this.eventEmitter.emit('client-cleared', clientId);
  }

  /**
   * Subscribe to monitoring events
   */
  public on(event: 'violation' | 'suspicious-activity' | 'client-cleared', 
    listener: (data: any) => void) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from monitoring events
   */
  public off(event: string, listener: (data: any) => void) {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Export violations for analysis
   */
  public exportViolations(format: 'json' | 'csv' = 'json'): string {
    const allViolations = Array.from(this.violations.values()).flat();

    if (format === 'json') {
      return JSON.stringify(allViolations, null, 2);
    }

    // CSV format
    const headers = [
      'timestamp',
      'clientId',
      'endpoint',
      'ip',
      'userAgent',
      'attemptCount',
      'limit',
      'windowMs'
    ];

    const rows = allViolations.map(v => [
      v.timestamp.toISOString(),
      v.clientId,
      v.endpoint,
      v.ip || '',
      v.userAgent || '',
      v.attemptCount.toString(),
      v.limit.toString(),
      v.windowMs.toString()
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  private updatePatterns(clientId: string) {
    const violations = this.violations.get(clientId) || [];
    const recentViolations = violations.filter(
      v => Date.now() - v.timestamp.getTime() < this.config.timeWindowMs
    );

    if (recentViolations.length === 0) {
      this.patterns.delete(clientId);
      return;
    }

    const endpoints = new Set(recentViolations.map(v => v.endpoint));
    const pattern: RateLimitPattern = {
      clientId,
      violations: recentViolations,
      firstViolation: recentViolations[0].timestamp,
      lastViolation: recentViolations[recentViolations.length - 1].timestamp,
      totalViolations: recentViolations.length,
      endpoints
    };

    this.patterns.set(clientId, pattern);
  }

  private cleanupOldViolations() {
    const now = Date.now();
    const cutoff = now - this.config.timeWindowMs;

    for (const [clientId, violations] of this.violations.entries()) {
      const recentViolations = violations.filter(
        v => v.timestamp.getTime() > cutoff
      );

      if (recentViolations.length === 0) {
        this.violations.delete(clientId);
        this.patterns.delete(clientId);
      } else {
        this.violations.set(clientId, recentViolations);
        this.updatePatterns(clientId);
      }
    }
  }

  private persistViolation(violation: RateLimitViolation) {
    // In a real implementation, this would save to a database or logging service
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const key = 'clearhold_rate_limit_violations';
        const existing = localStorage.getItem(key);
        const violations = existing ? JSON.parse(existing) : [];
        
        violations.push({
          ...violation,
          timestamp: violation.timestamp.toISOString()
        });

        // Keep only last 1000 violations
        if (violations.length > 1000) {
          violations.splice(0, violations.length - 1000);
        }

        localStorage.setItem(key, JSON.stringify(violations));
      } catch (error) {
        console.error('Failed to persist rate limit violation:', error);
      }
    }
  }
}

/**
 * React hook for rate limit monitoring
 */
export function useRateLimitMonitor(config: MonitoringConfig) {
  const [stats, setStats] = React.useState<ReturnType<RateLimitMonitor['getStats']>>();
  const [suspiciousPatterns, setSuspiciousPatterns] = React.useState<RateLimitPattern[]>([]);
  const monitorRef = React.useRef<RateLimitMonitor>();

  React.useEffect(() => {
    if (!monitorRef.current) {
      monitorRef.current = new RateLimitMonitor(config);
    }

    const monitor = monitorRef.current;
    
    const updateStats = () => {
      setStats(monitor.getStats());
      setSuspiciousPatterns(monitor.getSuspiciousPatterns());
    };

    const handleViolation = () => updateStats();
    const handleSuspicious = () => updateStats();

    monitor.on('violation', handleViolation);
    monitor.on('suspicious-activity', handleSuspicious);

    // Initial stats
    updateStats();

    // Update stats periodically
    const interval = setInterval(updateStats, 5000);

    return () => {
      monitor.off('violation', handleViolation);
      monitor.off('suspicious-activity', handleSuspicious);
      clearInterval(interval);
    };
  }, [config]);

  const recordViolation = React.useCallback((violation: Omit<RateLimitViolation, 'timestamp'>) => {
    monitorRef.current?.recordViolation(violation);
  }, []);

  const clearClient = React.useCallback((clientId: string) => {
    monitorRef.current?.clearClient(clientId);
  }, []);

  const exportData = React.useCallback((format: 'json' | 'csv' = 'json') => {
    return monitorRef.current?.exportViolations(format) || '';
  }, []);

  return {
    stats,
    suspiciousPatterns,
    recordViolation,
    clearClient,
    exportData
  };
}

/**
 * Global rate limit monitor instance
 */
let globalMonitor: RateLimitMonitor | null = null;

export function getGlobalRateLimitMonitor(config?: MonitoringConfig): RateLimitMonitor {
  if (!globalMonitor && config) {
    globalMonitor = new RateLimitMonitor(config);
  }
  
  if (!globalMonitor) {
    throw new Error('Global rate limit monitor not initialized');
  }
  
  return globalMonitor;
}

// Import React for hooks
import React from 'react';