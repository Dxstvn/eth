/**
 * @fileoverview Performance tests for reputation system scenarios
 * @module tests/reputation/PerformanceScenarios.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { ReputationCalculator } from '@/services/reputation/ReputationCalculator';
import { ReputationService } from '@/services/reputation/ReputationService';
import { ReputationProofService } from '@/lib/security/reputation-security';
import { DatabaseService } from '@/services/DatabaseService';
import { CacheService } from '@/services/CacheService';
import type { ReputationEvent, User } from '@/types';

describe('Reputation System Performance', () => {
  let calculator: ReputationCalculator;
  let reputationService: ReputationService;
  let proofService: ReputationProofService;
  let dbService: DatabaseService;
  let cacheService: CacheService;

  beforeEach(() => {
    calculator = new ReputationCalculator();
    reputationService = new ReputationService();
    proofService = new ReputationProofService();
    dbService = new DatabaseService();
    cacheService = new CacheService();
    
    // Clear caches
    cacheService.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Performance', () => {
    it('should retrieve single user reputation under 50ms', async () => {
      const userId = 'perf-test-user-1';
      
      // Warm up cache
      await reputationService.getReputation(userId);
      
      // Measure performance
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await reputationService.getReputation(userId);
        const duration = performance.now() - start;
        times.push(duration);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(10); // Average under 10ms
      expect(maxTime).toBeLessThan(50); // No query over 50ms
    });

    it('should handle bulk user queries efficiently', async () => {
      const userIds = Array(100).fill(null).map((_, i) => `user-${i}`);
      
      // Populate data
      await Promise.all(userIds.map(id => 
        reputationService.initializeUser(id)
      ));
      
      // Test bulk query
      const start = performance.now();
      const results = await reputationService.getBulkReputation(userIds);
      const duration = performance.now() - start;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(500); // Under 500ms for 100 users
      
      // Calculate per-user time
      const perUserTime = duration / userIds.length;
      expect(perUserTime).toBeLessThan(5); // Under 5ms per user
    });

    it('should optimize repeated queries with caching', async () => {
      const userId = 'cache-test-user';
      
      // First query (cache miss)
      const firstStart = performance.now();
      await reputationService.getReputation(userId);
      const firstDuration = performance.now() - firstStart;
      
      // Subsequent queries (cache hits)
      const cachedTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await reputationService.getReputation(userId);
        cachedTimes.push(performance.now() - start);
      }
      
      const avgCachedTime = cachedTimes.reduce((a, b) => a + b, 0) / 10;
      
      // Cached queries should be much faster
      expect(avgCachedTime).toBeLessThan(firstDuration * 0.1); // 10x faster
      expect(avgCachedTime).toBeLessThan(1); // Under 1ms
    });

    it('should handle historical data queries performantly', async () => {
      const userId = 'history-test-user';
      
      // Generate historical events
      const events: ReputationEvent[] = Array(365).fill(null).map((_, i) => ({
        id: `event-${i}`,
        userId,
        type: 'transaction_complete',
        points: Math.floor(Math.random() * 10),
        timestamp: Date.now() - i * 24 * 60 * 60 * 1000 // Daily events
      }));
      
      await dbService.bulkInsertEvents(events);
      
      // Query different time ranges
      const timeRanges = [7, 30, 90, 365]; // days
      const queryTimes: Record<number, number> = {};
      
      for (const days of timeRanges) {
        const start = performance.now();
        await reputationService.getReputationHistory(userId, days);
        queryTimes[days] = performance.now() - start;
      }
      
      // Even full year should be fast
      expect(queryTimes[7]).toBeLessThan(50);
      expect(queryTimes[30]).toBeLessThan(100);
      expect(queryTimes[90]).toBeLessThan(150);
      expect(queryTimes[365]).toBeLessThan(200);
      
      // Query time should scale sub-linearly
      const scaleFactor = queryTimes[365] / queryTimes[7];
      expect(scaleFactor).toBeLessThan(10); // Less than 10x for 52x data
    });
  });

  describe('Calculation Performance', () => {
    it('should calculate reputation scores efficiently', async () => {
      const events: ReputationEvent[] = Array(1000).fill(null).map((_, i) => ({
        id: `event-${i}`,
        userId: 'calc-test-user',
        type: 'transaction_complete',
        points: Math.floor(Math.random() * 10),
        timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      }));
      
      const start = performance.now();
      const score = calculator.calculateBaseScore(events);
      const duration = performance.now() - start;
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(50); // Under 50ms for 1000 events
    });

    it('should apply anti-gaming calculations performantly', async () => {
      const userId = 'gaming-test-user';
      const context = {
        recentTransactions: Array(50).fill(null).map((_, i) => ({
          counterparty: `user-${i % 10}`,
          amount: 1000
        })),
        transactionVolume: 50000,
        lastEventTime: Date.now() - 3600000,
        counterpartyReputations: Array(50).fill(60)
      };
      
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        calculator.calculateAdjustedScore(userId, 10, 'transaction_complete', context);
        times.push(performance.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / 100;
      expect(avgTime).toBeLessThan(5); // Under 5ms per calculation
    });

    it('should generate merkle proofs efficiently', async () => {
      const userId = 'proof-test-user';
      const eventCounts = [10, 100, 1000];
      const proofTimes: Record<number, number> = {};
      
      for (const count of eventCounts) {
        const events: ReputationEvent[] = Array(count).fill(null).map((_, i) => ({
          id: `event-${i}`,
          userId,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now() - i * 3600000
        }));
        
        const start = performance.now();
        const proof = proofService.generateReputationProof(userId, events[events.length - 1]);
        proofTimes[count] = performance.now() - start;
        
        expect(proof.merkleRoot).toBeDefined();
        expect(proof.proof).toBeDefined();
      }
      
      // Proof generation should scale logarithmically
      expect(proofTimes[10]).toBeLessThan(10);
      expect(proofTimes[100]).toBeLessThan(20);
      expect(proofTimes[1000]).toBeLessThan(50);
    });
  });

  describe('Update Performance', () => {
    it('should process single reputation updates quickly', async () => {
      const userId = 'update-test-user';
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await reputationService.processEvent({
          userId,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now()
        });
        times.push(performance.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / 100;
      const p95Time = times.sort((a, b) => a - b)[94]; // 95th percentile
      
      expect(avgTime).toBeLessThan(20); // Average under 20ms
      expect(p95Time).toBeLessThan(50); // 95% under 50ms
    });

    it('should handle bulk updates efficiently', async () => {
      const events: ReputationEvent[] = Array(1000).fill(null).map((_, i) => ({
        id: `bulk-${i}`,
        userId: `user-${i % 100}`, // 100 different users
        type: 'review_received',
        points: Math.floor(Math.random() * 5),
        timestamp: Date.now()
      }));
      
      const start = performance.now();
      await reputationService.processBulkEvents(events);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // Under 1 second for 1000 events
      
      const perEventTime = duration / events.length;
      expect(perEventTime).toBeLessThan(1); // Under 1ms per event
    });

    it('should optimize concurrent updates', async () => {
      const userIds = Array(50).fill(null).map((_, i) => `concurrent-${i}`);
      
      // Sequential updates
      const seqStart = performance.now();
      for (const userId of userIds) {
        await reputationService.processEvent({
          userId,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now()
        });
      }
      const seqDuration = performance.now() - seqStart;
      
      // Concurrent updates
      const concStart = performance.now();
      await Promise.all(userIds.map(userId =>
        reputationService.processEvent({
          userId,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now()
        })
      ));
      const concDuration = performance.now() - concStart;
      
      // Concurrent should be faster
      expect(concDuration).toBeLessThan(seqDuration * 0.3); // At least 3x faster
      expect(concDuration).toBeLessThan(200); // Under 200ms total
    });
  });

  describe('Database Performance', () => {
    it('should use indexes effectively', async () => {
      // Populate test data
      const users = Array(10000).fill(null).map((_, i) => ({
        id: `idx-user-${i}`,
        reputation: Math.floor(Math.random() * 100),
        level: ['bronze', 'silver', 'gold', 'platinum'][Math.floor(Math.random() * 4)],
        createdAt: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      }));
      
      await dbService.bulkInsertUsers(users);
      
      // Test indexed queries
      const queries = [
        { name: 'by_id', query: { id: 'idx-user-5000' } },
        { name: 'by_level', query: { level: 'gold' } },
        { name: 'by_reputation_range', query: { reputation: { $gte: 70, $lte: 80 } } },
        { name: 'top_users', query: {}, sort: { reputation: -1 }, limit: 100 }
      ];
      
      const queryTimes: Record<string, number> = {};
      
      for (const { name, query, sort, limit } of queries) {
        const start = performance.now();
        await dbService.query('users', query, { sort, limit });
        queryTimes[name] = performance.now() - start;
      }
      
      // All indexed queries should be fast
      Object.entries(queryTimes).forEach(([name, time]) => {
        expect(time).toBeLessThan(50); // Under 50ms
      });
    });

    it('should handle connection pooling efficiently', async () => {
      const concurrentOps = 100;
      const operations = Array(concurrentOps).fill(null).map((_, i) => async () => {
        const userId = `pool-test-${i}`;
        await reputationService.getReputation(userId);
        await reputationService.processEvent({
          userId,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now()
        });
      });
      
      const start = performance.now();
      await Promise.all(operations.map(op => op()));
      const duration = performance.now() - start;
      
      // Should handle high concurrency well
      expect(duration).toBeLessThan(1000); // Under 1 second
      
      // Check connection pool metrics
      const poolMetrics = await dbService.getPoolMetrics();
      expect(poolMetrics.waitTime).toBeLessThan(10); // Low wait time
      expect(poolMetrics.activeConnections).toBeLessThanOrEqual(poolMetrics.maxConnections);
    });
  });

  describe('Real-time Performance', () => {
    it('should handle high-frequency updates', async () => {
      const userId = 'realtime-test-user';
      const updateCount = 1000;
      const targetTime = 1000; // 1 second
      
      const start = performance.now();
      
      // Simulate rapid updates
      for (let i = 0; i < updateCount; i++) {
        await reputationService.processEvent({
          userId,
          type: 'micro_action',
          points: 0.1,
          timestamp: Date.now()
        });
      }
      
      const duration = performance.now() - start;
      const updatesPerSecond = (updateCount / duration) * 1000;
      
      expect(duration).toBeLessThan(targetTime);
      expect(updatesPerSecond).toBeGreaterThan(1000); // Over 1000 updates/second
    });

    it('should broadcast updates efficiently', async () => {
      const subscribers = Array(100).fill(null).map((_, i) => ({
        id: `subscriber-${i}`,
        callback: vi.fn()
      }));
      
      // Register subscribers
      subscribers.forEach(sub => {
        reputationService.subscribe(sub.id, sub.callback);
      });
      
      // Measure broadcast performance
      const start = performance.now();
      await reputationService.broadcast({
        type: 'reputation_update',
        userId: 'broadcast-user',
        data: { score: 75, level: 'gold' }
      });
      const duration = performance.now() - start;
      
      // All subscribers should receive update
      subscribers.forEach(sub => {
        expect(sub.callback).toHaveBeenCalled();
      });
      
      // Broadcast should be fast
      expect(duration).toBeLessThan(50); // Under 50ms for 100 subscribers
    });
  });

  describe('Memory Performance', () => {
    it('should manage memory efficiently under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process many events
      for (let batch = 0; batch < 10; batch++) {
        const events = Array(1000).fill(null).map((_, i) => ({
          id: `mem-event-${batch}-${i}`,
          userId: `mem-user-${i % 100}`,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now()
        }));
        
        await reputationService.processBulkEvents(events);
        
        // Allow garbage collection
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    it('should prevent memory leaks in caching', async () => {
      const iterations = 1000;
      const memorySnapshots: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Create unique user to force cache entries
        const userId = `leak-test-${i}`;
        await reputationService.getReputation(userId);
        
        // Take memory snapshot every 100 iterations
        if (i % 100 === 0) {
          if (global.gc) global.gc();
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }
      
      // Check for linear memory growth (potential leak)
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      const avgGrowthPerIteration = memoryGrowth / iterations;
      
      // Should have bounded memory growth
      expect(avgGrowthPerIteration).toBeLessThan(1024); // Less than 1KB per iteration
    });
  });

  describe('Network Performance', () => {
    it('should batch API calls efficiently', async () => {
      const users = Array(50).fill(null).map((_, i) => `batch-user-${i}`);
      
      // Without batching
      const unbatchedStart = performance.now();
      for (const userId of users) {
        await reputationService.syncWithBackend(userId);
      }
      const unbatchedTime = performance.now() - unbatchedStart;
      
      // With batching
      const batchedStart = performance.now();
      await reputationService.batchSyncWithBackend(users);
      const batchedTime = performance.now() - batchedStart;
      
      // Batching should be significantly faster
      expect(batchedTime).toBeLessThan(unbatchedTime * 0.2); // At least 5x faster
      expect(batchedTime).toBeLessThan(500); // Under 500ms total
    });

    it('should handle network latency gracefully', async () => {
      // Simulate various network conditions
      const latencies = [0, 50, 100, 200, 500]; // ms
      const results: Record<number, number> = {};
      
      for (const latency of latencies) {
        // Mock network delay
        vi.spyOn(global, 'fetch').mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, latency));
          return new Response(JSON.stringify({ success: true }));
        });
        
        const start = performance.now();
        await reputationService.syncWithBackend('latency-test-user');
        results[latency] = performance.now() - start;
        
        vi.restoreAllMocks();
      }
      
      // Performance should degrade gracefully
      expect(results[0]).toBeLessThan(100);
      expect(results[500]).toBeLessThan(700); // Overhead should be minimal
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const targetOpsPerSecond = 100;
      
      let operations = 0;
      const startTime = Date.now();
      const latencies: number[] = [];
      
      while (Date.now() - startTime < duration) {
        const opStart = performance.now();
        
        // Mix of operations
        const op = operations % 3;
        if (op === 0) {
          await reputationService.getReputation(`load-user-${operations % 100}`);
        } else if (op === 1) {
          await reputationService.processEvent({
            userId: `load-user-${operations % 100}`,
            type: 'transaction_complete',
            points: 5,
            timestamp: Date.now()
          });
        } else {
          await calculator.calculateBaseScore([]);
        }
        
        latencies.push(performance.now() - opStart);
        operations++;
      }
      
      const actualOpsPerSecond = operations / (duration / 1000);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p99Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];
      
      expect(actualOpsPerSecond).toBeGreaterThan(targetOpsPerSecond);
      expect(avgLatency).toBeLessThan(10); // Average under 10ms
      expect(p99Latency).toBeLessThan(50); // 99% under 50ms
    });
  });
});