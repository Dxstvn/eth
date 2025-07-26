/**
 * @fileoverview Integration tests for cross-system reputation integration
 * @module tests/integration/reputation/CrossSystemIntegration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser, cleanupTestData } from '@/tests/utils/testHelpers';
import { ReputationService } from '@/services/reputation/ReputationService';
import { TransactionService } from '@/services/TransactionService';
import { WalletService } from '@/services/WalletService';
import { NotificationService } from '@/services/NotificationService';
import { AnalyticsService } from '@/services/AnalyticsService';
import { BlockchainService } from '@/services/BlockchainService';
import { BackendSyncService } from '@/services/BackendSyncService';
import { apiClient } from '@/services/api/client';
import { ethers } from 'ethers';
import type { User, ReputationEvent, SystemEvent } from '@/types';

describe('Cross-System Reputation Integration', () => {
  let reputationService: ReputationService;
  let transactionService: TransactionService;
  let walletService: WalletService;
  let notificationService: NotificationService;
  let analyticsService: AnalyticsService;
  let blockchainService: BlockchainService;
  let backendSync: BackendSyncService;
  let testUsers: User[];

  beforeEach(async () => {
    // Initialize all services
    reputationService = new ReputationService();
    transactionService = new TransactionService();
    walletService = new WalletService();
    notificationService = new NotificationService();
    analyticsService = new AnalyticsService();
    blockchainService = new BlockchainService();
    backendSync = new BackendSyncService();

    // Create test users
    testUsers = await Promise.all([
      createTestUser({ name: 'Alice', initialReputation: 70 }),
      createTestUser({ name: 'Bob', initialReputation: 50 }),
      createTestUser({ name: 'Charlie', initialReputation: 30 })
    ]);

    // Mock API responses
    vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url.includes('/sync/reputation')) {
        return { data: { success: true, synced: true } };
      }
      return { data: {} };
    });
  });

  afterEach(async () => {
    await cleanupTestData(testUsers);
    vi.clearAllMocks();
  });

  describe('Frontend-Backend Synchronization', () => {
    it('should sync reputation changes across frontend and backend', async () => {
      const alice = testUsers[0];
      
      // Frontend reputation event
      const frontendEvent = await reputationService.processEvent({
        userId: alice.id,
        type: 'transaction_complete',
        points: 5,
        timestamp: Date.now(),
        source: 'frontend'
      });

      // Verify backend sync triggered
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/reputation/event'),
        expect.objectContaining({
          userId: alice.id,
          type: 'transaction_complete',
          points: 5
        })
      );

      // Simulate backend reputation update
      const backendUpdate = {
        userId: alice.id,
        score: 75,
        level: 'gold',
        badges: ['trusted_seller'],
        lastSync: Date.now()
      };

      await backendSync.handleReputationUpdate(backendUpdate);

      // Verify frontend updated
      const currentRep = await reputationService.getReputation(alice.id);
      expect(currentRep.score).toBe(75);
      expect(currentRep.level).toBe('gold');
      expect(currentRep.badges).toContain('trusted_seller');
      expect(currentRep.syncStatus).toBe('synced');
    });

    it('should handle sync conflicts with resolution', async () => {
      const bob = testUsers[1];
      
      // Simulate conflicting updates
      const frontendUpdate = reputationService.processEvent({
        userId: bob.id,
        type: 'review_received',
        points: 5,
        timestamp: Date.now()
      });

      const backendUpdate = backendSync.receiveUpdate({
        userId: bob.id,
        type: 'dispute_lost',
        points: -10,
        timestamp: Date.now() - 1000 // Slightly earlier
      });

      await Promise.all([frontendUpdate, backendUpdate]);

      // Check conflict resolution
      const conflictResolution = await backendSync.resolveConflict(bob.id);
      expect(conflictResolution.strategy).toBe('timestamp_ordering');
      expect(conflictResolution.finalScore).toBeDefined();

      // Both events should be applied in correct order
      const finalRep = await reputationService.getReputation(bob.id);
      expect(finalRep.eventHistory).toHaveLength(2);
      expect(finalRep.conflictsResolved).toBe(1);
    });

    it('should queue events during offline mode', async () => {
      const charlie = testUsers[2];
      
      // Simulate offline mode
      backendSync.setOfflineMode(true);

      // Create events while offline
      const offlineEvents = [];
      for (let i = 0; i < 5; i++) {
        const event = await reputationService.processEvent({
          userId: charlie.id,
          type: 'transaction_complete',
          points: 3,
          timestamp: Date.now() + i * 1000,
          source: 'frontend'
        });
        offlineEvents.push(event);
      }

      // Check events queued
      const queue = await backendSync.getQueuedEvents();
      expect(queue.length).toBe(5);
      expect(queue.every(e => e.synced === false)).toBe(true);

      // Go back online and sync
      backendSync.setOfflineMode(false);
      const syncResult = await backendSync.syncQueuedEvents();

      expect(syncResult.successful).toBe(5);
      expect(syncResult.failed).toBe(0);

      // Verify backend received all events
      expect(apiClient.post).toHaveBeenCalledTimes(5);
    });
  });

  describe('Blockchain Integration', () => {
    it('should record reputation milestones on blockchain', async () => {
      const alice = testUsers[0];
      
      // Achieve reputation milestone
      await reputationService.processEvent({
        userId: alice.id,
        type: 'kyc_verified',
        points: 10,
        timestamp: Date.now()
      });

      // Reach Gold level (60+ score)
      for (let i = 0; i < 5; i++) {
        await reputationService.processEvent({
          userId: alice.id,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now() + i * 86400000
        });
      }

      // Check blockchain recording triggered
      const blockchainRecord = await blockchainService.getReputationRecord(
        alice.id
      );

      expect(blockchainRecord).toBeDefined();
      expect(blockchainRecord.milestones).toContainEqual(
        expect.objectContaining({
          type: 'level_achieved',
          level: 'gold',
          timestamp: expect.any(Number),
          txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/)
        })
      );

      // Verify on-chain data
      const onChainRep = await blockchainService.verifyReputation(
        alice.id,
        blockchainRecord.contractAddress
      );

      expect(onChainRep.score).toBeGreaterThanOrEqual(60);
      expect(onChainRep.level).toBe('gold');
      expect(onChainRep.verified).toBe(true);
    });

    it('should sync staking events with smart contracts', async () => {
      const bob = testUsers[1];
      
      // Stake tokens
      const stakeAmount = ethers.utils.parseEther('1000');
      const stakeTx = await blockchainService.stakeTokens(
        bob.address,
        stakeAmount
      );

      expect(stakeTx.status).toBe('success');

      // Verify reputation system updated
      const rep = await reputationService.getReputation(bob.id);
      expect(rep.stakedAmount).toBe(1000);
      expect(rep.stakeVerified).toBe(true);
      expect(rep.stakeTxHash).toBe(stakeTx.hash);

      // Simulate slashing event from smart contract
      const slashingEvent = {
        user: bob.address,
        amount: ethers.utils.parseEther('200'),
        reason: 'dispute_loss',
        timestamp: Date.now()
      };

      await blockchainService.emitSlashingEvent(slashingEvent);

      // Verify reputation updated
      const repAfterSlash = await reputationService.getReputation(bob.id);
      expect(repAfterSlash.stakedAmount).toBe(800);
      expect(repAfterSlash.slashingHistory).toHaveLength(1);
      expect(repAfterSlash.score).toBeLessThan(rep.score);
    });

    it('should maintain merkle tree proofs for reputation', async () => {
      const charlie = testUsers[2];
      
      // Generate reputation events
      const events = [];
      for (let i = 0; i < 10; i++) {
        const event = await reputationService.processEvent({
          userId: charlie.id,
          type: 'review_received',
          points: 2,
          timestamp: Date.now() + i * 3600000
        });
        events.push(event);
      }

      // Generate merkle proof
      const proof = await blockchainService.generateReputationProof(
        charlie.id,
        events
      );

      expect(proof.merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof.proof).toHaveLength(4); // For 10 leaves
      expect(proof.leaf).toBeDefined();

      // Verify proof on-chain
      const verificationTx = await blockchainService.verifyReputationProof(
        charlie.id,
        proof
      );

      expect(verificationTx.status).toBe('success');
      expect(verificationTx.verified).toBe(true);

      // Store root on-chain for future verification
      const storeTx = await blockchainService.storeReputationRoot(
        charlie.id,
        proof.merkleRoot,
        events.length
      );

      expect(storeTx.status).toBe('success');
    });
  });

  describe('Wallet Integration', () => {
    it('should link wallet reputation with user reputation', async () => {
      const alice = testUsers[0];
      
      // Connect multiple wallets
      const wallets = [
        { address: '0x1234...', type: 'metamask', primary: true },
        { address: '0x5678...', type: 'walletconnect', primary: false },
        { address: '0x9abc...', type: 'coinbase', primary: false }
      ];

      for (const wallet of wallets) {
        await walletService.connectWallet(alice.id, wallet);
      }

      // Perform on-chain activity
      const onChainActivity = [
        { wallet: wallets[0].address, type: 'nft_purchase', value: 1000 },
        { wallet: wallets[1].address, type: 'defi_stake', value: 5000 },
        { wallet: wallets[0].address, type: 'dao_vote', value: 1 }
      ];

      for (const activity of onChainActivity) {
        await walletService.recordActivity(activity);
      }

      // Calculate wallet-based reputation
      const walletRep = await reputationService.calculateWalletReputation(
        alice.id
      );

      expect(walletRep.walletScore).toBeGreaterThan(0);
      expect(walletRep.onChainActivity).toBe(3);
      expect(walletRep.totalValue).toBe(6001);
      expect(walletRep.walletAge).toBeDefined();

      // Integrate with overall reputation
      const overallRep = await reputationService.getReputation(alice.id);
      expect(overallRep.walletBonus).toBeGreaterThan(0);
      expect(overallRep.verifiedWallets).toBe(3);
      expect(overallRep.onChainVerified).toBe(true);
    });

    it('should detect wallet-based sybil attacks', async () => {
      // Create suspicious wallet patterns
      const sybilWallets = [];
      const baseAddress = '0xdead';
      
      for (let i = 0; i < 10; i++) {
        const user = await createTestUser({
          name: `SybilWallet${i}`,
          initialReputation: 0
        });
        
        // Sequential addresses (suspicious)
        const wallet = {
          address: `${baseAddress}${i.toString().padStart(36, '0')}`,
          type: 'metamask',
          createdAt: Date.now() + i * 60000 // Created in sequence
        };
        
        await walletService.connectWallet(user.id, wallet);
        sybilWallets.push({ user, wallet });
      }

      // Analyze wallet patterns
      const sybilAnalysis = await walletService.detectSybilWallets(
        sybilWallets.map(s => s.wallet.address)
      );

      expect(sybilAnalysis.suspicious).toBe(true);
      expect(sybilAnalysis.patterns).toContain('sequential_addresses');
      expect(sybilAnalysis.patterns).toContain('rapid_creation');
      expect(sybilAnalysis.riskScore).toBeGreaterThan(0.8);

      // Apply reputation penalties
      for (const { user } of sybilWallets) {
        const rep = await reputationService.getReputation(user.id);
        expect(rep.flags).toContain('sybil_wallet_detected');
        expect(rep.walletTrustScore).toBeLessThan(0.2);
      }

      // Cleanup
      await cleanupTestData(sybilWallets.map(s => s.user));
    });
  });

  describe('Notification System Integration', () => {
    it('should send reputation milestone notifications', async () => {
      const alice = testUsers[0];
      const notificationSpy = vi.spyOn(notificationService, 'send');
      
      // Trigger reputation milestones
      const milestones = [
        { event: 'first_transaction', points: 5 },
        { event: 'tenth_transaction', points: 10 },
        { event: 'level_upgrade', points: 15 },
        { event: 'trust_badge_earned', points: 5 }
      ];

      for (const milestone of milestones) {
        await reputationService.processEvent({
          userId: alice.id,
          type: 'milestone_achieved',
          points: milestone.points,
          metadata: { milestone: milestone.event },
          timestamp: Date.now()
        });
      }

      // Verify notifications sent
      expect(notificationSpy).toHaveBeenCalledTimes(4);
      
      const notifications = notificationSpy.mock.calls.map(call => call[1]);
      expect(notifications).toContainEqual(
        expect.objectContaining({
          type: 'reputation_milestone',
          title: expect.stringContaining('Achievement Unlocked'),
          priority: 'medium'
        })
      );

      // Check in-app notification preferences respected
      await notificationService.updatePreferences(alice.id, {
        reputationUpdates: false
      });

      await reputationService.processEvent({
        userId: alice.id,
        type: 'review_received',
        points: 5,
        timestamp: Date.now()
      });

      // Should not send notification
      expect(notificationSpy).toHaveBeenCalledTimes(4); // Same as before
    });

    it('should alert on reputation threats', async () => {
      const bob = testUsers[1];
      const alertSpy = vi.spyOn(notificationService, 'sendAlert');
      
      // Simulate reputation threats
      // Multiple disputes in short time
      for (let i = 0; i < 3; i++) {
        await reputationService.processEvent({
          userId: bob.id,
          type: 'dispute_created',
          points: 0,
          metadata: { disputeId: `dispute-${i}` },
          timestamp: Date.now() + i * 60000
        });
      }

      expect(alertSpy).toHaveBeenCalledWith(
        bob.id,
        expect.objectContaining({
          type: 'reputation_risk',
          severity: 'high',
          title: expect.stringContaining('Reputation at Risk'),
          action: expect.stringContaining('dispute')
        })
      );

      // Sybil attack detection
      await reputationService.flagSuspiciousActivity(bob.id, {
        type: 'potential_sybil',
        confidence: 0.85,
        evidence: ['ip_clustering', 'behavior_pattern']
      });

      expect(alertSpy).toHaveBeenCalledWith(
        bob.id,
        expect.objectContaining({
          type: 'security_alert',
          severity: 'critical',
          title: expect.stringContaining('Suspicious Activity')
        })
      );
    });
  });

  describe('Analytics Integration', () => {
    it('should track reputation metrics and trends', async () => {
      const analyticsSpy = vi.spyOn(analyticsService, 'track');
      
      // Perform various reputation actions
      for (const user of testUsers) {
        // Complete transactions
        for (let i = 0; i < 3; i++) {
          const partner = testUsers[(testUsers.indexOf(user) + 1) % 3];
          const tx = await transactionService.create({
            seller: user.id,
            buyer: partner.id,
            amount: 100 + i * 50,
            escrowType: 'standard'
          });
          await transactionService.complete(tx.id);
        }

        // Process reputation events
        await reputationService.processEvent({
          userId: user.id,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now()
        });
      }

      // Verify analytics tracked
      expect(analyticsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'reputation_updated',
          properties: expect.objectContaining({
            userId: expect.any(String),
            oldScore: expect.any(Number),
            newScore: expect.any(Number),
            change: expect.any(Number),
            eventType: 'transaction_complete'
          })
        })
      );

      // Generate reputation report
      const report = await analyticsService.generateReputationReport({
        timeframe: 'daily',
        metrics: ['average_score', 'level_distribution', 'activity_rate']
      });

      expect(report.averageScore).toBeDefined();
      expect(report.levelDistribution).toHaveProperty('bronze');
      expect(report.levelDistribution).toHaveProperty('silver');
      expect(report.activityRate).toBeGreaterThan(0);
      expect(report.trends).toBeDefined();
    });

    it('should provide reputation insights and predictions', async () => {
      const alice = testUsers[0];
      
      // Build reputation history
      const historicalEvents = [];
      for (let day = 30; day > 0; day--) {
        const event = {
          userId: alice.id,
          type: day % 7 === 0 ? 'dispute_lost' : 'transaction_complete',
          points: day % 7 === 0 ? -5 : 3,
          timestamp: Date.now() - day * 24 * 60 * 60 * 1000
        };
        
        await reputationService.processEvent(event);
        historicalEvents.push(event);
      }

      // Get insights
      const insights = await analyticsService.getReputationInsights(alice.id);

      expect(insights.trend).toBe('improving'); // More positive than negative
      expect(insights.volatility).toBeDefined();
      expect(insights.predictedScore30Days).toBeGreaterThan(70);
      expect(insights.riskFactors).toContain('periodic_disputes');
      expect(insights.recommendations).toContainEqual(
        expect.stringContaining('dispute resolution')
      );

      // Cohort analysis
      const cohortAnalysis = await analyticsService.analyzeCohort({
        users: testUsers.map(u => u.id),
        metric: 'reputation_growth',
        timeframe: 30
      });

      expect(cohortAnalysis.averageGrowth).toBeDefined();
      expect(cohortAnalysis.topPerformers).toHaveLength(1);
      expect(cohortAnalysis.bottomPerformers).toHaveLength(1);
      expect(cohortAnalysis.insights).toBeDefined();
    });
  });

  describe('Real-time Synchronization', () => {
    it('should maintain real-time reputation consistency', async () => {
      const charlie = testUsers[2];
      
      // Setup real-time listeners
      const reputationUpdates: any[] = [];
      reputationService.onReputationChange(charlie.id, (update) => {
        reputationUpdates.push(update);
      });

      // Simulate concurrent updates from multiple sources
      const updates = [
        { source: 'frontend', type: 'review_received', points: 5 },
        { source: 'backend', type: 'transaction_complete', points: 3 },
        { source: 'blockchain', type: 'stake_deposited', points: 10 },
        { source: 'admin', type: 'manual_adjustment', points: -2 }
      ];

      // Fire updates concurrently
      await Promise.all(
        updates.map(update =>
          reputationService.processEvent({
            userId: charlie.id,
            ...update,
            timestamp: Date.now()
          })
        )
      );

      // Verify all updates received
      expect(reputationUpdates).toHaveLength(4);
      
      // Check final consistency
      const finalRep = await reputationService.getReputation(charlie.id);
      const expectedScore = 30 + 5 + 3 + 10 - 2; // Initial + all updates
      expect(finalRep.score).toBe(expectedScore);
      
      // Verify event ordering
      const eventLog = await reputationService.getEventLog(charlie.id);
      expect(eventLog).toHaveLength(4);
      expect(eventLog.map(e => e.source)).toEqual([
        'frontend', 'backend', 'blockchain', 'admin'
      ]);
    });

    it('should handle websocket reputation broadcasts', async () => {
      // Setup WebSocket mock
      const wsMock = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn()
      };

      backendSync.setupWebSocket(wsMock);

      // Reputation update for all users
      const broadcastUpdate = {
        type: 'community_event',
        event: 'marketplace_anniversary',
        bonus: 5,
        affectedUsers: testUsers.map(u => u.id)
      };

      // Simulate broadcast
      await backendSync.handleBroadcast(broadcastUpdate);

      // Verify all users updated
      for (const user of testUsers) {
        const rep = await reputationService.getReputation(user.id);
        expect(rep.communityBonuses).toContainEqual(
          expect.objectContaining({
            event: 'marketplace_anniversary',
            points: 5
          })
        );
      }

      // Verify WebSocket messages sent
      expect(wsMock.send).toHaveBeenCalledWith(
        expect.stringContaining('reputation_update')
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      const alice = testUsers[0];
      
      // Mock service failures
      vi.spyOn(blockchainService, 'recordReputation')
        .mockRejectedValueOnce(new Error('Network error'));
      
      vi.spyOn(apiClient, 'post')
        .mockRejectedValueOnce(new Error('Backend unavailable'));

      // Process event despite failures
      const result = await reputationService.processEvent({
        userId: alice.id,
        type: 'transaction_complete',
        points: 5,
        timestamp: Date.now()
      });

      expect(result.localSuccess).toBe(true);
      expect(result.blockchainSuccess).toBe(false);
      expect(result.backendSuccess).toBe(false);
      expect(result.retryQueued).toBe(true);

      // Verify local reputation updated
      const localRep = await reputationService.getReputation(alice.id);
      expect(localRep.score).toBe(75); // Updated locally
      expect(localRep.syncStatus).toBe('partial');
      expect(localRep.pendingSyncs).toBe(2);

      // Simulate services recovery
      vi.spyOn(blockchainService, 'recordReputation')
        .mockResolvedValue({ success: true });
      vi.spyOn(apiClient, 'post')
        .mockResolvedValue({ data: { success: true } });

      // Retry sync
      const syncResult = await backendSync.retrySyncFailures();
      expect(syncResult.successful).toBe(2);
      expect(syncResult.failed).toBe(0);

      // Verify full sync achieved
      const finalRep = await reputationService.getReputation(alice.id);
      expect(finalRep.syncStatus).toBe('synced');
      expect(finalRep.pendingSyncs).toBe(0);
    });

    it('should maintain data integrity during system recovery', async () => {
      // Simulate system crash with pending operations
      const pendingOperations = [
        { userId: testUsers[0].id, type: 'stake_deposit', amount: 1000 },
        { userId: testUsers[1].id, type: 'dispute_resolution', winner: true },
        { userId: testUsers[2].id, type: 'reputation_update', points: 10 }
      ];

      // Store in recovery cache
      await backendSync.storePendingOperations(pendingOperations);

      // Simulate system restart
      const recoveredOps = await backendSync.recoverPendingOperations();
      expect(recoveredOps).toHaveLength(3);

      // Process recovered operations
      for (const op of recoveredOps) {
        await reputationService.processRecoveredOperation(op);
      }

      // Verify integrity maintained
      const integrityCheck = await reputationService.verifySystemIntegrity();
      expect(integrityCheck.valid).toBe(true);
      expect(integrityCheck.discrepancies).toHaveLength(0);
      expect(integrityCheck.dataComplete).toBe(true);
    });
  });
});