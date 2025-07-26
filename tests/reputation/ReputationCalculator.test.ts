/**
 * @fileoverview Unit tests for ReputationCalculator
 * @module tests/reputation/ReputationCalculator.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReputationCalculator } from '@/services/reputation/ReputationCalculator';
import { ReputationEventType } from '@/lib/security/reputation-security';
import type { ReputationEvent, ScoreContext } from '@/types/reputation';

describe('ReputationCalculator', () => {
  let calculator: ReputationCalculator;

  beforeEach(() => {
    calculator = new ReputationCalculator();
    vi.clearAllMocks();
  });

  describe('Score Calculations', () => {
    it('should calculate base score correctly', () => {
      const events: ReputationEvent[] = [
        {
          id: '1',
          userId: 'user1',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now()
        },
        {
          id: '2',
          userId: 'user1',
          type: ReputationEventType.KYC_VERIFIED,
          points: 10,
          timestamp: Date.now()
        }
      ];

      const score = calculator.calculateBaseScore(events);
      expect(score).toBe(15);
    });

    it('should apply time decay to old events', () => {
      const oldEvent: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 10,
        timestamp: Date.now() - 180 * 24 * 60 * 60 * 1000 // 180 days ago
      };

      const score = calculator.calculateWithTimeDecay([oldEvent]);
      expect(score).toBeLessThan(10);
      expect(score).toBeGreaterThan(0);
    });

    it('should cap maximum score at 100', () => {
      const events: ReputationEvent[] = Array(50).fill(null).map((_, i) => ({
        id: `${i}`,
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now() - i * 24 * 60 * 60 * 1000
      }));

      const score = calculator.calculateBaseScore(events);
      expect(score).toBe(100);
    });

    it('should handle negative reputation events', () => {
      const events: ReputationEvent[] = [
        {
          id: '1',
          userId: 'user1',
          type: ReputationEventType.DISPUTE_LOST,
          points: -10,
          timestamp: Date.now()
        },
        {
          id: '2',
          userId: 'user1',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now()
        }
      ];

      const score = calculator.calculateBaseScore(events);
      expect(score).toBe(-5);
    });

    it('should not allow score below 0', () => {
      const events: ReputationEvent[] = [
        {
          id: '1',
          userId: 'user1',
          type: ReputationEventType.DISPUTE_LOST,
          points: -50,
          timestamp: Date.now()
        }
      ];

      const score = calculator.calculateBaseScore(events);
      expect(score).toBe(0);
    });
  });

  describe('Weighting Mechanisms', () => {
    it('should apply event type weightings', () => {
      const kycEvent: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      };

      const transactionEvent: ReputationEvent = {
        id: '2',
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 10,
        timestamp: Date.now()
      };

      const kycScore = calculator.applyEventWeighting(kycEvent);
      const txScore = calculator.applyEventWeighting(transactionEvent);

      expect(kycScore).toBeGreaterThan(txScore); // KYC should have higher weight
    });

    it('should apply volume-based weightings', () => {
      const context: ScoreContext = {
        recentTransactions: Array(50).fill(null).map((_, i) => ({
          counterparty: `user${i}`,
          amount: 1000
        })),
        transactionVolume: 50000,
        lastEventTime: Date.now() - 3600000,
        counterpartyReputations: Array(50).fill(70)
      };

      const weightedScore = calculator.applyVolumeWeighting(10, context);
      expect(weightedScore).toBeGreaterThan(10);
    });

    it('should apply stake-based multipliers', () => {
      const baseScore = 50;
      const stakeAmount = 10000;

      const multipliedScore = calculator.applyStakeMultiplier(baseScore, stakeAmount);
      expect(multipliedScore).toBeGreaterThan(baseScore);
      expect(multipliedScore).toBeLessThanOrEqual(baseScore * 1.5); // Max 50% boost
    });
  });

  describe('Diminishing Returns', () => {
    it('should reduce points for repeated same actions', () => {
      const firstEvent: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 5,
        timestamp: Date.now()
      };

      const secondEvent: ReputationEvent = {
        id: '2',
        userId: 'user1',
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 5,
        timestamp: Date.now() + 1000
      };

      const firstScore = calculator.applyDiminishingReturns(firstEvent, 0);
      const secondScore = calculator.applyDiminishingReturns(secondEvent, 1);

      expect(secondScore).toBeLessThan(firstScore);
    });

    it('should reset diminishing returns after cooldown period', () => {
      const event: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 5,
        timestamp: Date.now()
      };

      // After many repetitions
      const diminishedScore = calculator.applyDiminishingReturns(event, 10);
      
      // After cooldown reset
      calculator.resetDiminishingReturns('user1', ReputationEventType.REVIEW_RECEIVED);
      const resetScore = calculator.applyDiminishingReturns(event, 0);

      expect(resetScore).toBeGreaterThan(diminishedScore);
      expect(resetScore).toBe(5);
    });

    it('should apply different decay rates for different event types', () => {
      const reviewEvent: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 5,
        timestamp: Date.now()
      };

      const txEvent: ReputationEvent = {
        id: '2',
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now()
      };

      const reviewDecay = calculator.getDiminishingRate(reviewEvent.type, 5);
      const txDecay = calculator.getDiminishingRate(txEvent.type, 5);

      expect(reviewDecay).toBeLessThan(txDecay); // Reviews decay faster
    });
  });

  describe('Diversity Bonus', () => {
    it('should reward diverse counterparties', () => {
      const diverseContext: ScoreContext = {
        recentTransactions: Array(10).fill(null).map((_, i) => ({
          counterparty: `user${i}`,
          amount: 1000
        })),
        transactionVolume: 10000,
        lastEventTime: Date.now(),
        counterpartyReputations: Array(10).fill(60)
      };

      const concentratedContext: ScoreContext = {
        recentTransactions: Array(10).fill(null).map(() => ({
          counterparty: 'user1',
          amount: 1000
        })),
        transactionVolume: 10000,
        lastEventTime: Date.now(),
        counterpartyReputations: Array(10).fill(60)
      };

      const diverseBonus = calculator.calculateDiversityBonus(diverseContext);
      const concentratedBonus = calculator.calculateDiversityBonus(concentratedContext);

      expect(diverseBonus).toBeGreaterThan(concentratedBonus);
      expect(diverseBonus).toBe(1.5); // Max bonus
      expect(concentratedBonus).toBe(0.5); // Min bonus
    });

    it('should consider transaction recency in diversity', () => {
      const recentDiverseContext: ScoreContext = {
        recentTransactions: Array(5).fill(null).map((_, i) => ({
          counterparty: `user${i}`,
          amount: 1000,
          timestamp: Date.now() - i * 60000 // Recent
        })),
        transactionVolume: 5000,
        lastEventTime: Date.now(),
        counterpartyReputations: Array(5).fill(60)
      };

      const oldDiverseContext: ScoreContext = {
        recentTransactions: Array(5).fill(null).map((_, i) => ({
          counterparty: `user${i}`,
          amount: 1000,
          timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days old
        })),
        transactionVolume: 5000,
        lastEventTime: Date.now(),
        counterpartyReputations: Array(5).fill(60)
      };

      const recentBonus = calculator.calculateDiversityBonus(recentDiverseContext);
      const oldBonus = calculator.calculateDiversityBonus(oldDiverseContext);

      expect(recentBonus).toBeGreaterThan(oldBonus);
    });
  });

  describe('Network Effects', () => {
    it('should reward interactions with high-reputation users', () => {
      const highRepContext: ScoreContext = {
        recentTransactions: [],
        transactionVolume: 0,
        lastEventTime: Date.now(),
        counterpartyReputations: [90, 85, 95, 88, 92]
      };

      const lowRepContext: ScoreContext = {
        recentTransactions: [],
        transactionVolume: 0,
        lastEventTime: Date.now(),
        counterpartyReputations: [20, 25, 15, 30, 10]
      };

      const highRepBonus = calculator.calculateNetworkBonus(highRepContext);
      const lowRepPenalty = calculator.calculateNetworkBonus(lowRepContext);

      expect(highRepBonus).toBeGreaterThan(1);
      expect(lowRepPenalty).toBeLessThan(1);
    });

    it('should consider network centrality', () => {
      const centralUser = {
        userId: 'central',
        connections: 100,
        avgConnectionRep: 75
      };

      const peripheralUser = {
        userId: 'peripheral',
        connections: 5,
        avgConnectionRep: 75
      };

      const centralBonus = calculator.calculateCentralityBonus(centralUser);
      const peripheralBonus = calculator.calculateCentralityBonus(peripheralUser);

      expect(centralBonus).toBeGreaterThan(peripheralBonus);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty event arrays', () => {
      const score = calculator.calculateBaseScore([]);
      expect(score).toBe(0);
    });

    it('should handle null or undefined values gracefully', () => {
      const event: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now(),
        metadata: undefined
      };

      expect(() => calculator.calculateBaseScore([event])).not.toThrow();
    });

    it('should handle extreme timestamp values', () => {
      const futureEvent: ReputationEvent = {
        id: '1',
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year future
      };

      const score = calculator.calculateWithTimeDecay([futureEvent]);
      expect(score).toBe(0); // Future events should be ignored
    });

    it('should handle concurrent calculations', async () => {
      const promises = Array(100).fill(null).map(async (_, i) => {
        const events: ReputationEvent[] = [{
          id: `${i}`,
          userId: `user${i}`,
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now()
        }];

        return calculator.calculateBaseScore(events);
      });

      const results = await Promise.all(promises);
      expect(results.every(score => score === 5)).toBe(true);
    });
  });

  describe('Algorithm Validation', () => {
    it('should produce deterministic results', () => {
      const events: ReputationEvent[] = [
        {
          id: '1',
          userId: 'user1',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: 1234567890000
        },
        {
          id: '2',
          userId: 'user1',
          type: ReputationEventType.KYC_VERIFIED,
          points: 10,
          timestamp: 1234567890000
        }
      ];

      const score1 = calculator.calculateBaseScore(events);
      const score2 = calculator.calculateBaseScore(events);

      expect(score1).toBe(score2);
    });

    it('should maintain score monotonicity', () => {
      const baseEvents: ReputationEvent[] = [{
        id: '1',
        userId: 'user1',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now()
      }];

      const moreEvents: ReputationEvent[] = [
        ...baseEvents,
        {
          id: '2',
          userId: 'user1',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now()
        }
      ];

      const baseScore = calculator.calculateBaseScore(baseEvents);
      const higherScore = calculator.calculateBaseScore(moreEvents);

      expect(higherScore).toBeGreaterThanOrEqual(baseScore);
    });

    it('should validate mathematical bounds', () => {
      // Test with maximum possible inputs
      const maxEvents: ReputationEvent[] = Array(1000).fill(null).map((_, i) => ({
        id: `${i}`,
        userId: 'user1',
        type: ReputationEventType.STAKE_DEPOSITED,
        points: 15,
        timestamp: Date.now()
      }));

      const score = calculator.calculateBaseScore(maxEvents);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('ReputationCalculator - Performance', () => {
  let calculator: ReputationCalculator;

  beforeEach(() => {
    calculator = new ReputationCalculator();
  });

  it('should calculate scores efficiently for large datasets', () => {
    const events: ReputationEvent[] = Array(10000).fill(null).map((_, i) => ({
      id: `${i}`,
      userId: 'user1',
      type: ReputationEventType.TRANSACTION_COMPLETE,
      points: Math.random() * 10,
      timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
    }));

    const start = performance.now();
    calculator.calculateBaseScore(events);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should process 10k events in < 100ms
  });

  it('should cache calculations appropriately', () => {
    const events: ReputationEvent[] = Array(100).fill(null).map((_, i) => ({
      id: `${i}`,
      userId: 'user1',
      type: ReputationEventType.TRANSACTION_COMPLETE,
      points: 5,
      timestamp: Date.now()
    }));

    // First calculation
    const start1 = performance.now();
    const score1 = calculator.calculateBaseScore(events);
    const duration1 = performance.now() - start1;

    // Second calculation (should use cache)
    const start2 = performance.now();
    const score2 = calculator.calculateBaseScore(events);
    const duration2 = performance.now() - start2;

    expect(score1).toBe(score2);
    expect(duration2).toBeLessThan(duration1 * 0.5); // Cache should be at least 2x faster
  });
});