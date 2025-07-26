/**
 * @fileoverview Security tests for reputation system
 * @module lib/security/__tests__/reputation-security.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SybilDetectionService,
  CollusionDetectionService,
  ReputationValidationService,
  ReputationProofService,
  ReputationFraudDetector,
  AntiGamingCalculator,
  ReputationEventType,
  type ReputationEvent,
  type SybilRiskScore
} from '../reputation-security';

describe('Reputation Security Tests', () => {
  describe('Sybil Attack Detection', () => {
    let sybilDetector: SybilDetectionService;

    beforeEach(() => {
      sybilDetector = new SybilDetectionService();
    });

    it('should detect multiple accounts from same IP', async () => {
      const contexts = [
        { ip: '192.168.1.100', deviceId: 'device1', userAgent: 'Mozilla/5.0', timestamp: Date.now() },
        { ip: '192.168.1.100', deviceId: 'device2', userAgent: 'Mozilla/5.0', timestamp: Date.now() },
        { ip: '192.168.1.100', deviceId: 'device3', userAgent: 'Mozilla/5.0', timestamp: Date.now() }
      ];

      const scores: SybilRiskScore[] = [];
      for (let i = 0; i < contexts.length; i++) {
        const score = await sybilDetector.detectSybilPatterns(`user${i}`, contexts[i]);
        scores.push(score);
      }

      // Later accounts should have higher risk scores
      expect(scores[2].score).toBeGreaterThan(scores[0].score);
      expect(scores[2].factors.ipClustering).toBeGreaterThan(0.5);
      expect(scores[2].recommendation).toBe('review');
    });

    it('should detect multiple accounts from same device', async () => {
      const sharedDevice = 'device-fingerprint-123';
      
      const score1 = await sybilDetector.detectSybilPatterns('user1', {
        ip: '192.168.1.100',
        deviceId: sharedDevice,
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      });

      const score2 = await sybilDetector.detectSybilPatterns('user2', {
        ip: '192.168.1.101',
        deviceId: sharedDevice,
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      });

      expect(score2.factors.deviceFingerprint).toBeGreaterThan(0.4);
      expect(score2.recommendation).not.toBe('allow');
    });

    it('should detect bot-like behavior patterns', async () => {
      const context = {
        ip: '192.168.1.100',
        deviceId: 'device1',
        userAgent: 'Automated-Bot/1.0',
        timestamp: Date.now()
      };

      const score = await sybilDetector.detectSybilPatterns('bot-user', context);
      
      expect(score.factors.behaviorPattern).toBeGreaterThan(0);
      expect(score.score).toBeGreaterThan(0.2);
    });

    it('should handle legitimate users with low risk scores', async () => {
      const context = {
        ip: '10.0.0.1',
        deviceId: 'unique-device-456',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: Date.now()
      };

      const score = await sybilDetector.detectSybilPatterns('legitimate-user', context);
      
      expect(score.score).toBeLessThan(0.3);
      expect(score.recommendation).toBe('allow');
    });
  });

  describe('Collusion Detection', () => {
    let collusionDetector: CollusionDetectionService;

    beforeEach(() => {
      collusionDetector = new CollusionDetectionService();
    });

    it('should detect reciprocal transaction patterns', async () => {
      const users = ['user1', 'user2', 'user3', 'user4'];
      
      // Mock reciprocal transactions
      vi.spyOn(collusionDetector as any, 'getTransactions')
        .mockImplementation((from: string, to: string) => {
          if ((from === 'user1' && to === 'user2') || (from === 'user2' && to === 'user1')) return 10;
          if ((from === 'user3' && to === 'user4') || (from === 'user4' && to === 'user3')) return 8;
          return 0;
        });

      const report = await collusionDetector.detectCollusion(users);
      
      expect(report.detected).toBe(true);
      expect(report.patterns.some(p => p.type === 'reciprocal')).toBe(true);
      expect(report.affectedUsers).toContain('user1');
      expect(report.affectedUsers).toContain('user2');
    });

    it('should detect circular trading patterns', async () => {
      const users = ['user1', 'user2', 'user3'];
      
      // Mock circular pattern: user1 -> user2 -> user3 -> user1
      vi.spyOn(collusionDetector as any, 'getTransactions')
        .mockImplementation((from: string, to: string) => {
          if (from === 'user1' && to === 'user2') return 5;
          if (from === 'user2' && to === 'user3') return 5;
          if (from === 'user3' && to === 'user1') return 5;
          return 0;
        });

      const report = await collusionDetector.detectCollusion(users);
      
      expect(report.detected).toBe(true);
      expect(report.severity).not.toBe('low');
    });

    it('should detect coordinated timing patterns', async () => {
      const users = ['user1', 'user2', 'user3'];
      
      // Mock synchronized timestamps
      const baseTime = Date.now();
      vi.spyOn(collusionDetector as any, 'getActionTimestamps')
        .mockImplementation((userId: string) => {
          // All users perform actions at similar times
          return [baseTime, baseTime + 1000, baseTime + 2000];
        });

      const report = await collusionDetector.detectCollusion(users);
      
      // Should detect timing correlation
      expect(report.patterns.some(p => p.type === 'timing')).toBe(true);
    });
  });

  describe('Reputation Event Validation', () => {
    let validator: ReputationValidationService;

    beforeEach(() => {
      validator = new ReputationValidationService();
    });

    it('should validate correct reputation events', () => {
      const validEvent = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now(),
        evidence: {
          type: 'transaction_hash',
          data: '0x1234567890abcdef',
          hash: '0x' + '0'.repeat(64)
        }
      };

      const result = validator.validateReputationEvent(validEvent);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.sanitized).toBeDefined();
    });

    it('should reject events with invalid point ranges', () => {
      const invalidEvent = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 50, // Too high
        timestamp: Date.now()
      };

      const result = validator.validateReputationEvent(invalidEvent);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid point value');
    });

    it('should enforce cooldown periods', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const event1 = {
        userId,
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 3,
        timestamp: Date.now()
      };

      const event2 = {
        userId,
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 3,
        timestamp: Date.now() + 1000 // Only 1 second later
      };

      const result1 = validator.validateReputationEvent(event1);
      expect(result1.valid).toBe(true);

      const result2 = validator.validateReputationEvent(event2);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('cooldown');
    });

    it('should sanitize metadata to prevent XSS', () => {
      const eventWithXSS = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now(),
        metadata: {
          transactionId: 'tx123',
          malicious: '<script>alert("XSS")</script>',
          tags: ['<img src=x onerror=alert("XSS")>']
        }
      };

      const result = validator.validateReputationEvent(eventWithXSS);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized?.metadata?.malicious).toBeUndefined();
      expect(result.sanitized?.metadata?.tags?.[0]).not.toContain('<');
    });
  });

  describe('Merkle Tree Reputation Proofs', () => {
    let proofService: ReputationProofService;

    beforeEach(() => {
      process.env.REPUTATION_SIGNING_KEY = 'test-private-key';
      process.env.REPUTATION_PUBLIC_KEY = 'test-public-key';
      proofService = new ReputationProofService();
    });

    it('should generate valid reputation proofs', () => {
      const event: ReputationEvent = {
        id: 'event-123',
        userId: 'user-123',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 10,
        timestamp: Date.now()
      };

      const proof = proofService.generateReputationProof('user-123', event);
      
      expect(proof.merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof.eventHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof.proof).toBeInstanceOf(Array);
      expect(proof.signature).toBeDefined();
      expect(proof.timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('should verify valid proofs', () => {
      const event: ReputationEvent = {
        id: 'event-456',
        userId: 'user-456',
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      };

      const proof = proofService.generateReputationProof('user-456', event);
      
      // Mock signature verification for testing
      vi.spyOn(proofService as any, 'verifyProofSignature').mockReturnValue(true);
      
      const isValid = proofService.verifyReputationProof(proof);
      expect(isValid).toBe(true);
    });

    it('should reject expired proofs', () => {
      const oldProof = {
        merkleRoot: '0x' + '0'.repeat(64),
        eventHash: '0x' + '1'.repeat(64),
        proof: [],
        signature: 'fake-signature',
        timestamp: Date.now() - 7200000 // 2 hours old
      };

      const isValid = proofService.verifyReputationProof(oldProof);
      expect(isValid).toBe(false);
    });
  });

  describe('Fraud Detection', () => {
    let fraudDetector: ReputationFraudDetector;

    beforeEach(() => {
      fraudDetector = new ReputationFraudDetector();
    });

    it('should detect high velocity reputation farming', async () => {
      const events: ReputationEvent[] = [];
      const baseTime = Date.now();
      
      // Generate 50 events in 1 hour (suspicious velocity)
      for (let i = 0; i < 50; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'farmer-user',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: baseTime + (i * 72000) // Every 72 seconds
        });
      }

      const result = await fraudDetector.detectFraud('farmer-user', events);
      
      expect(result.fraudScore).toBeGreaterThan(0.7);
      expect(result.detected).toBe(true);
      expect(result.recommendations).toContain('Flag for manual review');
    });

    it('should detect repetitive pattern behavior', async () => {
      const events: ReputationEvent[] = [];
      const pattern = [
        ReputationEventType.TRANSACTION_COMPLETE,
        ReputationEventType.REVIEW_RECEIVED,
        ReputationEventType.TRANSACTION_COMPLETE
      ];
      
      // Repeat pattern 5 times
      for (let i = 0; i < 15; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'pattern-user',
          type: pattern[i % 3],
          points: 5,
          timestamp: Date.now() + (i * 3600000)
        });
      }

      const result = await fraudDetector.detectFraud('pattern-user', events);
      
      const patternAnalysis = result.analyses.find(a => a.type === 'pattern');
      expect(patternAnalysis?.score).toBeGreaterThan(0.5);
    });

    it('should detect low diversity automated behavior', async () => {
      const events: ReputationEvent[] = [];
      
      // Only use one type of event (suspicious)
      for (let i = 0; i < 20; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'bot-user',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now() + (i * 3600000)
        });
      }

      const result = await fraudDetector.detectFraud('bot-user', events);
      
      const behaviorAnalysis = result.analyses.find(a => a.type === 'behavior');
      expect(behaviorAnalysis?.score).toBeGreaterThan(0.6);
      expect(behaviorAnalysis?.details.eventDiversity).toBeLessThan(0.2);
    });

    it('should not flag legitimate user behavior', async () => {
      const events: ReputationEvent[] = [
        {
          id: 'event-1',
          userId: 'legit-user',
          type: ReputationEventType.KYC_VERIFIED,
          points: 10,
          timestamp: Date.now() - 86400000 * 30
        },
        {
          id: 'event-2',
          userId: 'legit-user',
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now() - 86400000 * 20
        },
        {
          id: 'event-3',
          userId: 'legit-user',
          type: ReputationEventType.REVIEW_RECEIVED,
          points: 3,
          timestamp: Date.now() - 86400000 * 10
        },
        {
          id: 'event-4',
          userId: 'legit-user',
          type: ReputationEventType.STAKE_DEPOSITED,
          points: 8,
          timestamp: Date.now() - 86400000 * 5
        }
      ];

      const result = await fraudDetector.detectFraud('legit-user', events);
      
      expect(result.fraudScore).toBeLessThan(0.5);
      expect(result.detected).toBe(false);
    });
  });

  describe('Anti-Gaming Score Calculations', () => {
    let calculator: AntiGamingCalculator;

    beforeEach(() => {
      calculator = new AntiGamingCalculator();
    });

    it('should apply diminishing returns for repeated actions', () => {
      const userId = 'gamer-user';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;
      const basePoints = 10;
      
      const scores: number[] = [];
      
      // Calculate scores for 5 consecutive events
      for (let i = 0; i < 5; i++) {
        const score = calculator.calculateAdjustedScore(
          userId,
          basePoints,
          eventType,
          {
            recentTransactions: [],
            transactionVolume: 1000,
            lastEventTime: Date.now() - 3600000,
            counterpartyReputations: [50]
          }
        );
        scores.push(score);
      }
      
      // Each subsequent score should be lower
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThan(scores[i - 1]);
      }
      
      // But should maintain minimum points
      expect(scores[4]).toBeGreaterThan(0);
    });

    it('should reward transaction diversity', () => {
      const userId = 'diverse-user';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;
      const basePoints = 10;
      
      // Low diversity context
      const lowDiversityScore = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        {
          recentTransactions: [
            { counterparty: 'user1', amount: 100 },
            { counterparty: 'user1', amount: 100 },
            { counterparty: 'user1', amount: 100 }
          ],
          transactionVolume: 300,
          lastEventTime: Date.now() - 3600000,
          counterpartyReputations: [50]
        }
      );
      
      // High diversity context
      const highDiversityScore = calculator.calculateAdjustedScore(
        userId + '-2', // Different user to avoid DR cache
        basePoints,
        eventType,
        {
          recentTransactions: [
            { counterparty: 'user1', amount: 100 },
            { counterparty: 'user2', amount: 100 },
            { counterparty: 'user3', amount: 100 }
          ],
          transactionVolume: 300,
          lastEventTime: Date.now() - 3600000,
          counterpartyReputations: [50]
        }
      );
      
      expect(highDiversityScore).toBeGreaterThan(lowDiversityScore);
    });

    it('should apply volume adjustments with logarithmic scaling', () => {
      const userId = 'volume-user';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;
      const basePoints = 10;
      
      const smallVolumeScore = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        {
          recentTransactions: [{ counterparty: 'user1', amount: 100 }],
          transactionVolume: 100,
          lastEventTime: Date.now() - 86400000,
          counterpartyReputations: [50]
        }
      );
      
      const largeVolumeScore = calculator.calculateAdjustedScore(
        userId + '-2',
        basePoints,
        eventType,
        {
          recentTransactions: [{ counterparty: 'user1', amount: 100000 }],
          transactionVolume: 100000,
          lastEventTime: Date.now() - 86400000,
          counterpartyReputations: [50]
        }
      );
      
      // Large volume should give bonus but not proportional
      expect(largeVolumeScore).toBeGreaterThan(smallVolumeScore);
      expect(largeVolumeScore / smallVolumeScore).toBeLessThan(2); // Not more than 2x
    });

    it('should encourage time spacing between events', () => {
      const userId = 'timing-user';
      const eventType = ReputationEventType.REVIEW_RECEIVED;
      const basePoints = 5;
      
      // Event immediately after previous
      const immediateScore = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        {
          recentTransactions: [],
          transactionVolume: 1000,
          lastEventTime: Date.now() - 300000, // 5 minutes ago
          counterpartyReputations: [50]
        }
      );
      
      // Event after reasonable delay
      const delayedScore = calculator.calculateAdjustedScore(
        userId + '-2',
        basePoints,
        eventType,
        {
          recentTransactions: [],
          transactionVolume: 1000,
          lastEventTime: Date.now() - 86400000, // 1 day ago
          counterpartyReputations: [50]
        }
      );
      
      expect(delayedScore).toBeGreaterThan(immediateScore);
    });

    it('should reward interactions with high-reputation users', () => {
      const userId = 'network-user';
      const eventType = ReputationEventType.TRANSACTION_COMPLETE;
      const basePoints = 10;
      
      const lowRepScore = calculator.calculateAdjustedScore(
        userId,
        basePoints,
        eventType,
        {
          recentTransactions: [{ counterparty: 'low-rep-user', amount: 1000 }],
          transactionVolume: 1000,
          lastEventTime: Date.now() - 86400000,
          counterpartyReputations: [20, 25, 30] // Low reputation counterparties
        }
      );
      
      const highRepScore = calculator.calculateAdjustedScore(
        userId + '-2',
        basePoints,
        eventType,
        {
          recentTransactions: [{ counterparty: 'high-rep-user', amount: 1000 }],
          transactionVolume: 1000,
          lastEventTime: Date.now() - 86400000,
          counterpartyReputations: [85, 90, 95] // High reputation counterparties
        }
      );
      
      expect(highRepScore).toBeGreaterThan(lowRepScore);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete reputation update flow securely', async () => {
      const sybilDetector = new SybilDetectionService();
      const validator = new ReputationValidationService();
      const fraudDetector = new ReputationFraudDetector();
      const calculator = new AntiGamingCalculator();
      
      // Step 1: Check for Sybil attack
      const sybilScore = await sybilDetector.detectSybilPatterns('test-user', {
        ip: '192.168.1.1',
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now()
      });
      
      if (sybilScore.recommendation === 'block') {
        return; // Block suspicious user
      }
      
      // Step 2: Validate event
      const event = {
        userId: 'test-user',
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 10,
        timestamp: Date.now()
      };
      
      const validation = validator.validateReputationEvent(event);
      expect(validation.valid).toBe(true);
      
      // Step 3: Check for fraud
      const fraudResult = await fraudDetector.detectFraud('test-user', [
        {
          id: 'prev-event',
          userId: 'test-user',
          type: ReputationEventType.KYC_VERIFIED,
          points: 10,
          timestamp: Date.now() - 86400000
        }
      ]);
      
      expect(fraudResult.detected).toBe(false);
      
      // Step 4: Calculate adjusted score
      const adjustedScore = calculator.calculateAdjustedScore(
        'test-user',
        event.points,
        event.type,
        {
          recentTransactions: [{ counterparty: 'other-user', amount: 1000 }],
          transactionVolume: 1000,
          lastEventTime: Date.now() - 86400000,
          counterpartyReputations: [60]
        }
      );
      
      expect(adjustedScore).toBeGreaterThan(0);
      expect(adjustedScore).toBeLessThanOrEqual(event.points);
    });
  });
});