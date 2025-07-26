/**
 * @fileoverview Unit tests for Anti-Gaming Algorithms
 * @module tests/reputation/AntiGaming.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  AntiGamingCalculator,
  SybilDetectionService,
  CollusionDetectionService,
  ReputationFraudDetector
} from '@/lib/security/reputation-security';
import { ReputationEventType } from '@/lib/security/reputation-security';
import type { ReputationEvent, ScoreContext, UserContext } from '@/types/reputation';

describe('AntiGamingCalculator', () => {
  let calculator: AntiGamingCalculator;

  beforeEach(() => {
    calculator = new AntiGamingCalculator();
    vi.clearAllMocks();
  });

  describe('Diminishing Returns', () => {
    it('should apply exponential decay for repeated actions', () => {
      const basePoints = 10;
      const userId = 'user123';
      const eventType = ReputationEventType.REVIEW_RECEIVED;

      // First action - full points
      const score1 = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        createMockContext()
      );
      expect(score1).toBe(10);

      // Simulate multiple repeated actions
      const scores = [];
      for (let i = 0; i < 10; i++) {
        const score = calculator.calculateAdjustedScore(
          userId,
          basePoints,
          eventType,
          createMockContext()
        );
        scores.push(score);
      }

      // Each subsequent score should be less than previous
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThan(scores[i - 1]);
      }

      // 10th action should give minimal points
      expect(scores[9]).toBeLessThan(2);
    });

    it('should reset diminishing returns after cooldown period', () => {
      const userId = 'user123';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;

      // Perform actions to trigger diminishing returns
      for (let i = 0; i < 5; i++) {
        calculator.calculateAdjustedScore(userId, 10, eventType, createMockContext());
      }

      // Simulate time passage (25 hours)
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);

      // Should get full points again
      const scoreAfterReset = calculator.calculateAdjustedScore(
        userId,
        10,
        eventType,
        createMockContext()
      );
      expect(scoreAfterReset).toBe(10);
    });

    it('should apply different decay rates for different event types', () => {
      const userId = 'user123';
      
      // Reviews should decay faster
      const reviewScores = [];
      for (let i = 0; i < 5; i++) {
        reviewScores.push(calculator.calculateAdjustedScore(
          userId,
          10,
          ReputationEventType.REVIEW_RECEIVED,
          createMockContext()
        ));
      }

      // Transactions should decay slower
      const txScores = [];
      for (let i = 0; i < 5; i++) {
        txScores.push(calculator.calculateAdjustedScore(
          'user456',
          10,
          ReputationEventType.TRANSACTION_COMPLETE,
          createMockContext()
        ));
      }

      // Compare decay rates
      expect(reviewScores[4]).toBeLessThan(txScores[4]);
    });
  });

  describe('Diversity Requirements', () => {
    it('should reward diverse counterparty interactions', () => {
      const basePoints = 10;
      const userId = 'user123';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;

      // High diversity context
      const diverseContext: ScoreContext = {
        recentTransactions: [
          { counterparty: 'user1', amount: 100 },
          { counterparty: 'user2', amount: 200 },
          { counterparty: 'user3', amount: 150 },
          { counterparty: 'user4', amount: 300 },
          { counterparty: 'user5', amount: 250 }
        ],
        transactionVolume: 1000,
        lastEventTime: Date.now() - 3600000,
        counterpartyReputations: [70, 80, 75, 85, 90]
      };

      const diverseScore = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        diverseContext
      );

      // Low diversity context
      const concentratedContext: ScoreContext = {
        recentTransactions: [
          { counterparty: 'user1', amount: 200 },
          { counterparty: 'user1', amount: 200 },
          { counterparty: 'user1', amount: 200 },
          { counterparty: 'user1', amount: 200 },
          { counterparty: 'user1', amount: 200 }
        ],
        transactionVolume: 1000,
        lastEventTime: Date.now() - 3600000,
        counterpartyReputations: [70, 70, 70, 70, 70]
      };

      const concentratedScore = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        concentratedContext
      );

      expect(diverseScore).toBeGreaterThan(concentratedScore);
      expect(diverseScore / concentratedScore).toBeGreaterThan(1.5);
    });

    it('should penalize repetitive interactions with same users', () => {
      const context: ScoreContext = {
        recentTransactions: Array(20).fill({ counterparty: 'sameUser', amount: 100 }),
        transactionVolume: 2000,
        lastEventTime: Date.now() - 3600000,
        counterpartyReputations: Array(20).fill(60)
      };

      const score = calculator.calculateAdjustedScore(
        'user123',
        10,
        ReputationEventType.TRANSACTION_COMPLETE,
        context
      );

      expect(score).toBeLessThan(5); // 50% penalty
    });
  });

  describe('Volume Manipulation Prevention', () => {
    it('should apply logarithmic scaling to prevent volume gaming', () => {
      const userId = 'user123';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;

      const volumes = [100, 1000, 10000, 100000, 1000000];
      const scores = volumes.map(volume => {
        const context = createMockContext({ transactionVolume: volume });
        return calculator.calculateAdjustedScore(userId, 10, eventType, context);
      });

      // Verify logarithmic growth
      const growthRates = [];
      for (let i = 1; i < scores.length; i++) {
        growthRates.push(scores[i] / scores[i - 1]);
      }

      // Growth rate should decrease
      for (let i = 1; i < growthRates.length; i++) {
        expect(growthRates[i]).toBeLessThan(growthRates[i - 1]);
      }

      // Maximum bonus should be capped
      expect(scores[scores.length - 1]).toBeLessThanOrEqual(13); // 30% max bonus
    });
  });

  describe('Time-based Restrictions', () => {
    it('should penalize rapid consecutive actions', () => {
      const userId = 'user123';
      const eventType = ReputationEventType.REVIEW_RECEIVED;

      // Action immediately after previous
      const immediateContext = createMockContext({ lastEventTime: Date.now() - 60000 }); // 1 minute ago
      const immediateScore = calculator.calculateAdjustedScore(
        userId,
        10,
        eventType,
        immediateContext
      );

      // Action after reasonable delay
      const delayedContext = createMockContext({ lastEventTime: Date.now() - 3600000 * 12 }); // 12 hours ago
      const delayedScore = calculator.calculateAdjustedScore(
        userId,
        10,
        eventType,
        delayedContext
      );

      expect(immediateScore).toBeLessThan(delayedScore);
      expect(immediateScore).toBe(5); // 50% penalty for rapid action
    });

    it('should reward patient users with time bonus', () => {
      const context24h = createMockContext({ lastEventTime: Date.now() - 86400000 }); // 24 hours
      const context48h = createMockContext({ lastEventTime: Date.now() - 172800000 }); // 48 hours

      const score24h = calculator.calculateAdjustedScore(
        'user123',
        10,
        ReputationEventType.TRANSACTION_COMPLETE,
        context24h
      );

      const score48h = calculator.calculateAdjustedScore(
        'user456',
        10,
        ReputationEventType.TRANSACTION_COMPLETE,
        context48h
      );

      expect(score48h).toBeGreaterThan(score24h);
    });
  });

  describe('Network Effect Calculations', () => {
    it('should reward interactions with high-reputation users', () => {
      const highRepContext = createMockContext({
        counterpartyReputations: [85, 90, 95, 88, 92]
      });

      const lowRepContext = createMockContext({
        counterpartyReputations: [20, 25, 30, 15, 35]
      });

      const highRepScore = calculator.calculateAdjustedScore(
        'user123',
        10,
        ReputationEventType.TRANSACTION_COMPLETE,
        highRepContext
      );

      const lowRepScore = calculator.calculateAdjustedScore(
        'user456',
        10,
        ReputationEventType.TRANSACTION_COMPLETE,
        lowRepContext
      );

      expect(highRepScore).toBeGreaterThan(lowRepScore);
      expect(highRepScore).toBe(12); // 20% bonus
      expect(lowRepScore).toBe(9); // 10% penalty
    });
  });

  describe('Minimum Points Protection', () => {
    it('should guarantee minimum points for legitimate actions', () => {
      // Even with all penalties, certain actions should give minimum points
      const worstContext = createMockContext({
        recentTransactions: Array(100).fill({ counterparty: 'same', amount: 1 }),
        transactionVolume: 100,
        lastEventTime: Date.now() - 1000, // 1 second ago
        counterpartyReputations: [10, 10, 10, 10, 10]
      });

      const txScore = calculator.calculateAdjustedScore(
        'user123',
        10,
        ReputationEventType.TRANSACTION_COMPLETE,
        worstContext
      );

      const kycScore = calculator.calculateAdjustedScore(
        'user123',
        10,
        ReputationEventType.KYC_VERIFIED,
        worstContext
      );

      expect(txScore).toBeGreaterThanOrEqual(0.1);
      expect(kycScore).toBe(10); // KYC always gives full points
    });
  });
});

describe('SybilDetectionService', () => {
  let detector: SybilDetectionService;

  beforeEach(() => {
    detector = new SybilDetectionService();
  });

  describe('IP Clustering Detection', () => {
    it('should detect multiple accounts from same IP subnet', async () => {
      const context1: UserContext = {
        ip: '192.168.1.100',
        deviceId: 'device1',
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      };

      const context2: UserContext = {
        ip: '192.168.1.101',
        deviceId: 'device2',
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      };

      const score1 = await detector.detectSybilPatterns('user1', context1);
      const score2 = await detector.detectSybilPatterns('user2', context2);

      expect(score2.factors.ipClustering).toBeGreaterThan(0);
      expect(score2.recommendation).not.toBe('allow');
    });

    it('should escalate risk with more accounts on same subnet', async () => {
      const baseContext: UserContext = {
        ip: '10.0.0.',
        deviceId: 'device',
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      };

      const scores = [];
      for (let i = 1; i <= 10; i++) {
        const context = { ...baseContext, ip: `10.0.0.${i}`, deviceId: `device${i}` };
        const score = await detector.detectSybilPatterns(`user${i}`, context);
        scores.push(score.factors.ipClustering);
      }

      // Risk should increase with more accounts
      expect(scores[9]).toBeGreaterThan(scores[2]);
      expect(scores[9]).toBe(0.9); // Very high risk
    });
  });

  describe('Device Fingerprint Analysis', () => {
    it('should detect multiple accounts on same device', async () => {
      const sharedDevice = 'device-fingerprint-12345';
      
      const context1: UserContext = {
        ip: '192.168.1.100',
        deviceId: sharedDevice,
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      };

      const context2: UserContext = {
        ip: '192.168.1.200', // Different IP
        deviceId: sharedDevice, // Same device
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      };

      const score1 = await detector.detectSybilPatterns('user1', context1);
      const score2 = await detector.detectSybilPatterns('user2', context2);

      expect(score2.factors.deviceFingerprint).toBe(0.5);
      expect(score2.recommendation).toBe('review');
    });

    it('should flag high risk for many accounts on one device', async () => {
      const sharedDevice = 'suspicious-device';
      
      for (let i = 1; i <= 5; i++) {
        const context: UserContext = {
          ip: `192.168.1.${i}00`,
          deviceId: sharedDevice,
          userAgent: 'Mozilla/5.0',
          timestamp: Date.now()
        };
        
        const score = await detector.detectSybilPatterns(`user${i}`, context);
        
        if (i >= 3) {
          expect(score.factors.deviceFingerprint).toBe(0.95);
          expect(score.recommendation).toBe('block');
        }
      }
    });
  });

  describe('Behavioral Pattern Analysis', () => {
    it('should detect automated behavior patterns', async () => {
      // Simulate bot-like behavior
      const botContext: UserContext = {
        ip: '1.2.3.4',
        deviceId: 'bot-device',
        userAgent: 'Automated-Script/1.0',
        timestamp: Date.now(),
        behaviorMetrics: {
          typingSpeed: 1000, // Impossibly fast
          mouseMovement: 'linear', // No human randomness
          sessionDuration: 86400, // 24 hours non-stop
          clickPatterns: 'uniform' // Too regular
        }
      };

      const score = await detector.detectSybilPatterns('bot-user', botContext);
      
      expect(score.factors.behaviorPattern).toBeGreaterThan(0.8);
      expect(score.recommendation).toBe('block');
    });
  });

  describe('Combined Risk Scoring', () => {
    it('should combine multiple risk factors appropriately', async () => {
      const suspiciousContext: UserContext = {
        ip: '10.0.0.50', // Clustered IP
        deviceId: 'shared-device', // Used by others
        userAgent: 'Automated-Bot',
        timestamp: Date.now()
      };

      // Register multiple users to trigger clustering
      for (let i = 1; i < 5; i++) {
        await detector.detectSybilPatterns(`other${i}`, {
          ...suspiciousContext,
          ip: `10.0.0.${i}`
        });
      }

      const finalScore = await detector.detectSybilPatterns('suspicious-user', suspiciousContext);
      
      expect(finalScore.score).toBeGreaterThan(0.7);
      expect(finalScore.recommendation).toBe('block');
      
      // All factors should contribute
      expect(finalScore.factors.ipClustering).toBeGreaterThan(0);
      expect(finalScore.factors.deviceFingerprint).toBeGreaterThan(0);
      expect(finalScore.factors.behaviorPattern).toBeGreaterThan(0);
    });
  });
});

describe('CollusionDetectionService', () => {
  let detector: CollusionDetectionService;

  beforeEach(() => {
    detector = new CollusionDetectionService();
  });

  describe('Reciprocal Pattern Detection', () => {
    it('should detect reciprocal reputation boosting', async () => {
      // Simulate reciprocal transactions
      detector.recordTransaction('userA', 'userB', 5);
      detector.recordTransaction('userB', 'userA', 5);
      detector.recordTransaction('userA', 'userB', 5);
      detector.recordTransaction('userB', 'userA', 5);

      const report = await detector.detectCollusion(['userA', 'userB']);
      
      expect(report.detected).toBe(true);
      expect(report.patterns).toContainEqual(
        expect.objectContaining({ type: 'reciprocal' })
      );
      expect(report.severity).toBe('high');
    });

    it('should calculate reciprocity ratio correctly', async () => {
      // Asymmetric relationship
      detector.recordTransaction('userA', 'userB', 10);
      detector.recordTransaction('userB', 'userA', 2);

      const report = await detector.detectCollusion(['userA', 'userB']);
      const reciprocalPattern = report.patterns.find(p => p.type === 'reciprocal');
      
      expect(reciprocalPattern?.confidence).toBeLessThan(0.3); // Low reciprocity
    });
  });

  describe('Circular Trading Detection', () => {
    it('should detect circular reputation chains', async () => {
      // Create circular pattern: A -> B -> C -> A
      detector.recordTransaction('userA', 'userB', 5);
      detector.recordTransaction('userB', 'userC', 5);
      detector.recordTransaction('userC', 'userA', 5);

      const report = await detector.detectCollusion(['userA', 'userB', 'userC']);
      
      expect(report.detected).toBe(true);
      expect(report.patterns).toContainEqual(
        expect.objectContaining({ type: 'circular' })
      );
    });

    it('should detect complex circular patterns', async () => {
      // Create complex pattern: A -> B -> C -> D -> B (subcycle)
      detector.recordTransaction('userA', 'userB', 5);
      detector.recordTransaction('userB', 'userC', 5);
      detector.recordTransaction('userC', 'userD', 5);
      detector.recordTransaction('userD', 'userB', 5);

      const report = await detector.detectCollusion(['userA', 'userB', 'userC', 'userD']);
      
      expect(report.detected).toBe(true);
      expect(report.affectedUsers).toContain('userB');
      expect(report.affectedUsers).toContain('userD');
    });
  });

  describe('Timing Analysis', () => {
    it('should detect coordinated timing patterns', async () => {
      const baseTime = Date.now();
      
      // Simulate coordinated actions within 5 minutes
      detector.recordTransaction('userA', 'userB', 5, baseTime);
      detector.recordTransaction('userB', 'userC', 5, baseTime + 1000);
      detector.recordTransaction('userC', 'userD', 5, baseTime + 2000);
      detector.recordTransaction('userD', 'userE', 5, baseTime + 3000);
      detector.recordTransaction('userE', 'userA', 5, baseTime + 4000);

      const report = await detector.detectCollusion(['userA', 'userB', 'userC', 'userD', 'userE']);
      
      expect(report.patterns).toContainEqual(
        expect.objectContaining({ type: 'timing' })
      );
      expect(report.recommendations).toContain('Analyze IP addresses and device fingerprints');
    });
  });

  describe('Severity Calculation', () => {
    it('should escalate severity with multiple patterns', async () => {
      // Create multiple suspicious patterns
      // Reciprocal
      detector.recordTransaction('userA', 'userB', 10);
      detector.recordTransaction('userB', 'userA', 10);
      
      // Circular
      detector.recordTransaction('userA', 'userC', 5);
      detector.recordTransaction('userC', 'userB', 5);
      detector.recordTransaction('userB', 'userA', 5);
      
      // Timing (all within 1 second)
      const now = Date.now();
      detector.recordTransaction('userA', 'userD', 5, now);
      detector.recordTransaction('userB', 'userD', 5, now + 100);
      detector.recordTransaction('userC', 'userD', 5, now + 200);

      const report = await detector.detectCollusion(['userA', 'userB', 'userC', 'userD']);
      
      expect(report.severity).toBe('critical');
      expect(report.recommendations).toContain('Freeze all affected accounts immediately');
    });
  });
});

describe('ReputationFraudDetector', () => {
  let detector: ReputationFraudDetector;

  beforeEach(() => {
    detector = new ReputationFraudDetector();
  });

  describe('Velocity Analysis', () => {
    it('should detect abnormal event velocity', async () => {
      const events: ReputationEvent[] = [];
      const baseTime = Date.now();
      
      // Create 50 events in 1 hour (suspicious)
      for (let i = 0; i < 50; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'suspicious-user',
          type: ReputationEventType.REVIEW_RECEIVED,
          points: 2,
          timestamp: baseTime + i * 60000 // 1 per minute
        });
      }

      const result = await detector.detectFraud('suspicious-user', events);
      
      expect(result.fraudScore).toBeGreaterThan(0.8);
      expect(result.detected).toBe(true);
      
      const velocityAnalysis = result.analyses.find(a => a.type === 'velocity');
      expect(velocityAnalysis?.score).toBeGreaterThan(0.8);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect repeating event sequences', async () => {
      const events: ReputationEvent[] = [];
      const pattern = [
        ReputationEventType.TRANSACTION_COMPLETE,
        ReputationEventType.REVIEW_RECEIVED,
        ReputationEventType.STAKE_DEPOSITED
      ];
      
      // Repeat pattern 5 times
      for (let i = 0; i < 15; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'pattern-user',
          type: pattern[i % 3],
          points: 5,
          timestamp: Date.now() + i * 3600000
        });
      }

      const result = await detector.detectFraud('pattern-user', events);
      
      const patternAnalysis = result.analyses.find(a => a.type === 'pattern');
      expect(patternAnalysis?.score).toBeGreaterThan(0.6);
      expect(result.recommendations).toContain('Review transaction history for automation');
    });

    it('should detect bot-like timing patterns', async () => {
      const events: ReputationEvent[] = [];
      
      // Create events with exact 1-hour intervals (bot-like)
      for (let i = 0; i < 24; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'bot-user',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 3,
          timestamp: Date.now() + i * 3600000 // Exactly 1 hour apart
        });
      }

      const result = await detector.detectFraud('bot-user', events);
      
      const patternAnalysis = result.analyses.find(a => a.type === 'pattern');
      expect(patternAnalysis?.details.unusualTiming).toBeGreaterThan(0.8);
    });
  });

  describe('Behavioral Analysis', () => {
    it('should detect low event diversity', async () => {
      const events: ReputationEvent[] = [];
      
      // Only use 2 event types (low diversity)
      for (let i = 0; i < 100; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'limited-user',
          type: i % 2 === 0 
            ? ReputationEventType.TRANSACTION_COMPLETE 
            : ReputationEventType.REVIEW_RECEIVED,
          points: 2,
          timestamp: Date.now() + i * 3600000
        });
      }

      const result = await detector.detectFraud('limited-user', events);
      
      const behaviorAnalysis = result.analyses.find(a => a.type === 'behavior');
      expect(behaviorAnalysis?.score).toBeGreaterThan(0.7);
      expect(behaviorAnalysis?.details.eventDiversity).toBeLessThan(0.3);
    });
  });

  describe('Comprehensive Fraud Scoring', () => {
    it('should combine multiple fraud indicators', async () => {
      const events: ReputationEvent[] = [];
      const baseTime = Date.now();
      
      // High velocity + repeating pattern + low diversity
      const pattern = [ReputationEventType.TRANSACTION_COMPLETE, ReputationEventType.REVIEW_RECEIVED];
      
      for (let i = 0; i < 100; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'fraudulent-user',
          type: pattern[i % 2],
          points: 5,
          timestamp: baseTime + i * 60000 // 1 per minute (high velocity)
        });
      }

      const result = await detector.detectFraud('fraudulent-user', events);
      
      expect(result.fraudScore).toBeGreaterThan(0.85);
      expect(result.detected).toBe(true);
      expect(result.recommendations).toContain('Immediately freeze account and investigate');
      expect(result.recommendations.length).toBeGreaterThan(3);
    });
  });
});

// Helper function to create mock context
function createMockContext(overrides: Partial<ScoreContext> = {}): ScoreContext {
  return {
    recentTransactions: [],
    transactionVolume: 1000,
    lastEventTime: Date.now() - 86400000, // 24 hours ago
    counterpartyReputations: [60, 65, 70, 75, 80],
    ...overrides
  };
}