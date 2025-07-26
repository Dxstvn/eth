/**
 * @fileoverview Integration tests for full reputation lifecycle
 * @module tests/integration/reputation/ReputationLifecycle.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser, cleanupTestData } from '@/tests/utils/testHelpers';
import { ReputationService } from '@/services/reputation/ReputationService';
import { TransactionService } from '@/services/TransactionService';
import { DisputeService } from '@/services/DisputeService';
import { StakingService } from '@/services/reputation/StakingService';
import { apiClient } from '@/services/api/client';
import { ReputationEventType } from '@/lib/security/reputation-security';
import type { User, Transaction, Dispute } from '@/types';

describe('Reputation Lifecycle Integration', () => {
  let reputationService: ReputationService;
  let transactionService: TransactionService;
  let disputeService: DisputeService;
  let stakingService: StakingService;
  let testUsers: User[];

  beforeEach(async () => {
    // Initialize services
    reputationService = new ReputationService();
    transactionService = new TransactionService();
    disputeService = new DisputeService();
    stakingService = new StakingService();

    // Create test users
    testUsers = await Promise.all([
      createTestUser({ name: 'Alice', initialReputation: 0 }),
      createTestUser({ name: 'Bob', initialReputation: 0 }),
      createTestUser({ name: 'Charlie', initialReputation: 0 }),
      createTestUser({ name: 'David', initialReputation: 0 })
    ]);

    // Mock API responses
    vi.spyOn(apiClient, 'post').mockImplementation(async (url, data) => {
      if (url.includes('/reputation/event')) {
        return { data: { success: true, newScore: 50 } };
      }
      return { data: {} };
    });
  });

  afterEach(async () => {
    await cleanupTestData(testUsers);
    vi.clearAllMocks();
  });

  describe('New User Journey', () => {
    it('should handle complete new user reputation building', async () => {
      const alice = testUsers[0];
      
      // Step 1: Initial state verification
      const initialRep = await reputationService.getReputation(alice.id);
      expect(initialRep.score).toBe(0);
      expect(initialRep.level).toBe('unverified');
      expect(initialRep.canTransact).toBe(false);

      // Step 2: KYC verification
      await reputationService.processEvent({
        userId: alice.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      const afterKyc = await reputationService.getReputation(alice.id);
      expect(afterKyc.score).toBe(10);
      expect(afterKyc.level).toBe('bronze');
      expect(afterKyc.canTransact).toBe(true);
      expect(afterKyc.transactionLimits.maxAmount).toBe(1000);

      // Step 3: Stake tokens
      const stakeAmount = ethers.utils.parseEther('500');
      await stakingService.stake(stakeAmount, alice.signer);
      
      const afterStake = await reputationService.getReputation(alice.id);
      expect(afterStake.score).toBeGreaterThan(10);
      expect(afterStake.stakeMultiplier).toBe(1.05);

      // Step 4: Complete first transaction
      const tx1 = await transactionService.create({
        seller: alice.id,
        buyer: testUsers[1].id,
        amount: 500,
        escrowType: 'standard'
      });

      await transactionService.complete(tx1.id);

      const afterFirstTx = await reputationService.getReputation(alice.id);
      expect(afterFirstTx.score).toBeGreaterThan(afterStake.score);
      expect(afterFirstTx.transactionCount).toBe(1);
      expect(afterFirstTx.successRate).toBe(100);

      // Step 5: Receive positive review
      await reputationService.processEvent({
        userId: alice.id,
        type: ReputationEventType.REVIEW_RECEIVED,
        points: 5,
        timestamp: Date.now(),
        metadata: { rating: 5, reviewer: testUsers[1].id }
      });

      const afterReview = await reputationService.getReputation(alice.id);
      expect(afterReview.score).toBeGreaterThan(afterFirstTx.score);
      expect(afterReview.reviewCount).toBe(1);
      expect(afterReview.averageRating).toBe(5);

      // Verify progression
      expect(afterReview.level).toBe('bronze');
      expect(afterReview.nextLevelProgress).toBeGreaterThan(0);
    });

    it('should enforce gradual trust building for new users', async () => {
      const bob = testUsers[1];
      
      // Try to make large transaction as new user
      await expect(transactionService.create({
        seller: bob.id,
        buyer: testUsers[0].id,
        amount: 10000, // Large amount
        escrowType: 'standard'
      })).rejects.toThrow('Transaction amount exceeds reputation limits');

      // Complete KYC
      await reputationService.processEvent({
        userId: bob.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      // Should still have limits
      const rep = await reputationService.getReputation(bob.id);
      expect(rep.transactionLimits.maxAmount).toBe(1000);
      expect(rep.transactionLimits.dailyLimit).toBe(3000);
    });
  });

  describe('Transaction Impact on Reputation', () => {
    it('should update reputation through transaction lifecycle', async () => {
      const [seller, buyer] = testUsers;
      
      // Setup initial reputation
      await reputationService.processEvent({
        userId: seller.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      await reputationService.processEvent({
        userId: buyer.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      // Create transaction
      const tx = await transactionService.create({
        seller: seller.id,
        buyer: buyer.id,
        amount: 1000,
        escrowType: 'standard'
      });

      // Check reputation during active transaction
      const sellerRepDuring = await reputationService.getReputation(seller.id);
      expect(sellerRepDuring.activeTransactions).toBe(1);
      expect(sellerRepDuring.reputationAtRisk).toBe(true);

      // Complete transaction successfully
      await transactionService.depositFunds(tx.id, buyer.id);
      await transactionService.confirmDelivery(tx.id, buyer.id);
      await transactionService.releaseFunds(tx.id);

      // Check reputation after completion
      const sellerRepAfter = await reputationService.getReputation(seller.id);
      const buyerRepAfter = await reputationService.getReputation(buyer.id);

      expect(sellerRepAfter.score).toBeGreaterThan(10);
      expect(sellerRepAfter.transactionCount).toBe(1);
      expect(sellerRepAfter.volumeTraded).toBe(1000);
      expect(sellerRepAfter.activeTransactions).toBe(0);

      expect(buyerRepAfter.score).toBeGreaterThan(10);
      expect(buyerRepAfter.transactionCount).toBe(1);
    });

    it('should apply network effects for high-reputation counterparties', async () => {
      const [alice, bob] = testUsers;
      
      // Give Bob high reputation
      for (let i = 0; i < 20; i++) {
        await reputationService.processEvent({
          userId: bob.id,
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now() - i * 86400000
        });
      }

      const bobRep = await reputationService.getReputation(bob.id);
      expect(bobRep.score).toBeGreaterThan(80);
      expect(bobRep.level).toBe('platinum');

      // Alice transacts with high-rep Bob
      const aliceInitial = await reputationService.getReputation(alice.id);
      
      const tx = await transactionService.create({
        seller: alice.id,
        buyer: bob.id,
        amount: 1000,
        escrowType: 'standard'
      });

      await transactionService.complete(tx.id);

      const aliceAfter = await reputationService.getReputation(alice.id);
      const reputationGain = aliceAfter.score - aliceInitial.score;

      // Should get bonus for transacting with high-rep user
      expect(reputationGain).toBeGreaterThan(5); // More than base points
      expect(aliceAfter.trustedCounterparties).toContain(bob.id);
    });
  });

  describe('Dispute Resolution Impact', () => {
    it('should handle reputation changes through dispute lifecycle', async () => {
      const [seller, buyer] = testUsers;
      
      // Setup transaction
      const tx = await transactionService.create({
        seller: seller.id,
        buyer: buyer.id,
        amount: 2000,
        escrowType: 'standard'
      });

      await transactionService.depositFunds(tx.id, buyer.id);

      // Create dispute
      const dispute = await disputeService.create({
        transactionId: tx.id,
        initiator: buyer.id,
        reason: 'Item not as described',
        evidence: ['photo1.jpg', 'photo2.jpg']
      });

      // Check reputation during dispute
      const sellerRepDuring = await reputationService.getReputation(seller.id);
      const buyerRepDuring = await reputationService.getReputation(buyer.id);

      expect(sellerRepDuring.pendingDisputes).toBe(1);
      expect(sellerRepDuring.reputationFrozen).toBe(true);
      expect(buyerRepDuring.pendingDisputes).toBe(1);

      // Resolve dispute in buyer's favor
      await disputeService.submitEvidence(dispute.id, seller.id, ['response.pdf']);
      await disputeService.resolve(dispute.id, {
        winner: buyer.id,
        refundAmount: 2000,
        reasoning: 'Evidence supports buyer claim'
      });

      // Check reputation after resolution
      const sellerRepAfter = await reputationService.getReputation(seller.id);
      const buyerRepAfter = await reputationService.getReputation(buyer.id);

      expect(sellerRepAfter.score).toBeLessThan(sellerRepDuring.score);
      expect(sellerRepAfter.disputesLost).toBe(1);
      expect(sellerRepAfter.disputeRate).toBeGreaterThan(0);
      expect(sellerRepAfter.reputationFrozen).toBe(false);

      expect(buyerRepAfter.score).toBeGreaterThan(buyerRepDuring.score);
      expect(buyerRepAfter.disputesWon).toBe(1);
    });

    it('should apply penalties for frivolous disputes', async () => {
      const [seller, buyer] = testUsers;
      
      // Create valid transaction
      const tx = await transactionService.create({
        seller: seller.id,
        buyer: buyer.id,
        amount: 1000,
        escrowType: 'standard'
      });

      // Create dispute without merit
      const dispute = await disputeService.create({
        transactionId: tx.id,
        initiator: buyer.id,
        reason: 'Changed mind',
        evidence: []
      });

      // Resolve in seller's favor
      await disputeService.resolve(dispute.id, {
        winner: seller.id,
        reasoning: 'No valid grounds for dispute'
      });

      const buyerRep = await reputationService.getReputation(buyer.id);
      expect(buyerRep.score).toBeLessThan(10); // Lost reputation
      expect(buyerRep.frivolousDisputes).toBe(1);
    });
  });

  describe('Staking Integration', () => {
    it('should integrate staking with reputation calculations', async () => {
      const alice = testUsers[0];
      
      // Base reputation
      await reputationService.processEvent({
        userId: alice.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      const baseRep = await reputationService.getReputation(alice.id);

      // Stake increasing amounts and check multiplier
      const stakeAmounts = [100, 500, 1000, 5000];
      
      for (const amount of stakeAmounts) {
        await stakingService.stake(
          ethers.utils.parseEther(amount.toString()),
          alice.signer
        );

        const rep = await reputationService.getReputation(alice.id);
        expect(rep.stakedAmount).toBe(amount);
        expect(rep.stakeMultiplier).toBeGreaterThan(1);
        expect(rep.effectiveScore).toBe(Math.floor(rep.baseScore * rep.stakeMultiplier));
      }
    });

    it('should handle slashing impact on reputation', async () => {
      const bob = testUsers[1];
      
      // Setup reputation and stake
      await reputationService.processEvent({
        userId: bob.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      await stakingService.stake(ethers.utils.parseEther('1000'), bob.signer);

      const beforeSlash = await reputationService.getReputation(bob.id);

      // Slash for violation
      await stakingService.slash(bob.id, 20, 'Collusion detected');

      const afterSlash = await reputationService.getReputation(bob.id);

      expect(afterSlash.stakedAmount).toBe(800); // 20% slashed
      expect(afterSlash.score).toBeLessThan(beforeSlash.score);
      expect(afterSlash.slashingHistory).toHaveLength(1);
      expect(afterSlash.level).toBe('bronze'); // Might drop level
    });
  });

  describe('Multi-User Interactions', () => {
    it('should handle complex multi-party reputation updates', async () => {
      // Setup initial reputation for all users
      await Promise.all(testUsers.map(user =>
        reputationService.processEvent({
          userId: user.id,
          type: ReputationEventType.KYC_VERIFIED,
          points: 10,
          timestamp: Date.now()
        })
      ));

      // Create transaction chain
      const transactions = [
        { seller: testUsers[0], buyer: testUsers[1], amount: 1000 },
        { seller: testUsers[1], buyer: testUsers[2], amount: 1500 },
        { seller: testUsers[2], buyer: testUsers[3], amount: 2000 },
        { seller: testUsers[3], buyer: testUsers[0], amount: 1200 }
      ];

      for (const { seller, buyer, amount } of transactions) {
        const tx = await transactionService.create({
          seller: seller.id,
          buyer: buyer.id,
          amount,
          escrowType: 'standard'
        });

        await transactionService.complete(tx.id);
      }

      // Check network effects
      const reputations = await Promise.all(
        testUsers.map(user => reputationService.getReputation(user.id))
      );

      // All should have increased reputation
      reputations.forEach(rep => {
        expect(rep.score).toBeGreaterThan(10);
        expect(rep.transactionCount).toBeGreaterThan(0);
      });

      // Check for circular trading detection
      const collusionCheck = await reputationService.checkCollusionRisk(
        testUsers.map(u => u.id)
      );
      expect(collusionCheck.detected).toBe(true);
      expect(collusionCheck.pattern).toBe('circular');
    });

    it('should detect and prevent reputation manipulation', async () => {
      const [alice, bob] = testUsers;
      
      // Attempt rapid reciprocal transactions
      for (let i = 0; i < 5; i++) {
        const tx1 = await transactionService.create({
          seller: alice.id,
          buyer: bob.id,
          amount: 100,
          escrowType: 'standard'
        });

        const tx2 = await transactionService.create({
          seller: bob.id,
          buyer: alice.id,
          amount: 100,
          escrowType: 'standard'
        });

        await transactionService.complete(tx1.id);
        await transactionService.complete(tx2.id);
      }

      // Check for diminishing returns
      const aliceRep = await reputationService.getReputation(alice.id);
      const bobRep = await reputationService.getReputation(bob.id);

      // Should not have gained full points due to anti-gaming
      expect(aliceRep.score).toBeLessThan(50); // Less than 5 * 10 points
      expect(bobRep.score).toBeLessThan(50);

      // Should be flagged for review
      expect(aliceRep.flags).toContain('reciprocal_trading');
      expect(bobRep.flags).toContain('reciprocal_trading');
    });
  });

  describe('Cross-System Integration', () => {
    it('should synchronize reputation across all systems', async () => {
      const alice = testUsers[0];
      
      // Perform various activities
      await reputationService.processEvent({
        userId: alice.id,
        type: ReputationEventType.KYC_VERIFIED,
        points: 10,
        timestamp: Date.now()
      });

      await stakingService.stake(ethers.utils.parseEther('1000'), alice.signer);

      const tx = await transactionService.create({
        seller: alice.id,
        buyer: testUsers[1].id,
        amount: 500,
        escrowType: 'standard'
      });
      await transactionService.complete(tx.id);

      // Check consistency across services
      const repFromService = await reputationService.getReputation(alice.id);
      const repFromProfile = await apiClient.get(`/users/${alice.id}/reputation`);
      const repFromTransaction = await transactionService.getUserReputation(alice.id);

      expect(repFromService.score).toBe(repFromProfile.data.score);
      expect(repFromService.score).toBe(repFromTransaction.score);
      expect(repFromService.level).toBe(repFromProfile.data.level);
    });

    it('should maintain reputation history and audit trail', async () => {
      const bob = testUsers[1];
      
      // Perform series of activities
      const activities = [
        { type: ReputationEventType.KYC_VERIFIED, points: 10 },
        { type: ReputationEventType.STAKE_DEPOSITED, points: 5 },
        { type: ReputationEventType.TRANSACTION_COMPLETE, points: 5 },
        { type: ReputationEventType.REVIEW_RECEIVED, points: 3 },
        { type: ReputationEventType.DISPUTE_WON, points: 10 }
      ];

      for (const activity of activities) {
        await reputationService.processEvent({
          userId: bob.id,
          ...activity,
          timestamp: Date.now()
        });

        // Add delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Fetch history
      const history = await reputationService.getReputationHistory(bob.id, 30);

      expect(history.events).toHaveLength(5);
      expect(history.events[0].type).toBe(ReputationEventType.KYC_VERIFIED);
      expect(history.scoreProgression).toHaveLength(5);
      expect(history.scoreProgression[4]).toBe(33); // Sum of all points

      // Verify audit trail
      const auditTrail = await reputationService.getAuditTrail(bob.id);
      expect(auditTrail).toHaveLength(5);
      expect(auditTrail[0]).toHaveProperty('timestamp');
      expect(auditTrail[0]).toHaveProperty('eventHash');
      expect(auditTrail[0]).toHaveProperty('merkleProof');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle reputation recovery after penalties', async () => {
      const charlie = testUsers[2];
      
      // Build up reputation
      for (let i = 0; i < 10; i++) {
        await reputationService.processEvent({
          userId: charlie.id,
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 5,
          timestamp: Date.now() - i * 86400000
        });
      }

      const highRep = await reputationService.getReputation(charlie.id);
      expect(highRep.score).toBeGreaterThan(40);

      // Lose dispute causing reputation loss
      await reputationService.processEvent({
        userId: charlie.id,
        type: ReputationEventType.DISPUTE_LOST,
        points: -20,
        timestamp: Date.now()
      });

      const lowRep = await reputationService.getReputation(charlie.id);
      expect(lowRep.score).toBeLessThan(highRep.score);

      // Recovery through good behavior
      for (let i = 0; i < 5; i++) {
        await reputationService.processEvent({
          userId: charlie.id,
          type: ReputationEventType.TRANSACTION_COMPLETE,
          points: 3, // Reduced points during recovery
          timestamp: Date.now() + i * 86400000
        });
      }

      const recoveredRep = await reputationService.getReputation(charlie.id);
      expect(recoveredRep.score).toBeGreaterThan(lowRep.score);
      expect(recoveredRep.inRecovery).toBe(true);
      expect(recoveredRep.recoveryMultiplier).toBe(0.6); // Reduced gains
    });

    it('should handle concurrent reputation updates', async () => {
      const david = testUsers[3];
      
      // Simulate concurrent events
      const promises = [];
      
      // Multiple transactions completing at once
      for (let i = 0; i < 10; i++) {
        promises.push(
          reputationService.processEvent({
            userId: david.id,
            type: ReputationEventType.TRANSACTION_COMPLETE,
            points: 5,
            timestamp: Date.now(),
            transactionId: `tx-${i}`
          })
        );
      }

      // Wait for all to complete
      await Promise.all(promises);

      const finalRep = await reputationService.getReputation(david.id);
      
      // Should have processed all events correctly
      expect(finalRep.transactionCount).toBe(10);
      
      // But score should reflect anti-gaming (not full 50 points)
      expect(finalRep.score).toBeLessThan(50);
      expect(finalRep.score).toBeGreaterThan(20);
    });

    it('should handle service failures gracefully', async () => {
      const alice = testUsers[0];
      
      // Mock service failure
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error'));

      // Attempt to process event
      const result = await reputationService.processEvent({
        userId: alice.id,
        type: ReputationEventType.TRANSACTION_COMPLETE,
        points: 5,
        timestamp: Date.now()
      });

      // Should queue for retry
      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);

      // Verify queued event is processed when service recovers
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { success: true } });
      
      await reputationService.processQueuedEvents();
      
      const rep = await reputationService.getReputation(alice.id);
      expect(rep.score).toBe(5); // Event eventually processed
    });
  });
});