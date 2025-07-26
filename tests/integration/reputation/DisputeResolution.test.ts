/**
 * @fileoverview Integration tests for dispute resolution impact on reputation
 * @module tests/integration/reputation/DisputeResolution.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser, cleanupTestData } from '@/tests/utils/testHelpers';
import { ReputationService } from '@/services/reputation/ReputationService';
import { DisputeService } from '@/services/DisputeService';
import { TransactionService } from '@/services/TransactionService';
import { StakingService } from '@/services/reputation/StakingService';
import { ethers } from 'ethers';
import type { User, Transaction, Dispute, DisputeResolution } from '@/types';

describe('Dispute Resolution Impact on Reputation', () => {
  let reputationService: ReputationService;
  let disputeService: DisputeService;
  let transactionService: TransactionService;
  let stakingService: StakingService;
  let testUsers: User[];
  let mockTransaction: Transaction;

  beforeEach(async () => {
    // Initialize services
    reputationService = new ReputationService();
    disputeService = new DisputeService();
    transactionService = new TransactionService();
    stakingService = new StakingService();

    // Create test users with different reputation levels
    testUsers = await Promise.all([
      createTestUser({ name: 'HighRepSeller', initialReputation: 85 }),
      createTestUser({ name: 'MedRepBuyer', initialReputation: 50 }),
      createTestUser({ name: 'LowRepUser', initialReputation: 20 }),
      createTestUser({ name: 'NewUser', initialReputation: 10 })
    ]);

    // Create a mock transaction
    mockTransaction = await transactionService.create({
      seller: testUsers[0].id,
      buyer: testUsers[1].id,
      amount: 5000,
      escrowType: 'standard'
    });
  });

  afterEach(async () => {
    await cleanupTestData(testUsers);
    vi.clearAllMocks();
  });

  describe('Simple Dispute Resolution', () => {
    it('should handle seller winning dispute', async () => {
      const [seller, buyer] = testUsers;
      
      // Record initial reputations
      const sellerInitial = await reputationService.getReputation(seller.id);
      const buyerInitial = await reputationService.getReputation(buyer.id);

      // Create and resolve dispute
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: buyer.id,
        reason: 'Item not as described',
        evidence: []
      });

      await disputeService.resolve(dispute.id, {
        winner: seller.id,
        reasoning: 'Buyer claims unsubstantiated'
      });

      // Check reputation changes
      const sellerAfter = await reputationService.getReputation(seller.id);
      const buyerAfter = await reputationService.getReputation(buyer.id);

      expect(sellerAfter.score).toBeGreaterThan(sellerInitial.score);
      expect(sellerAfter.disputesWon).toBe(sellerInitial.disputesWon + 1);
      expect(sellerAfter.disputeWinRate).toBeGreaterThan(0);

      expect(buyerAfter.score).toBeLessThan(buyerInitial.score);
      expect(buyerAfter.disputesLost).toBe(buyerInitial.disputesLost + 1);
      expect(buyerAfter.frivolousDisputes).toBe(1);
    });

    it('should handle buyer winning dispute', async () => {
      const [seller, buyer] = testUsers;
      
      const sellerInitial = await reputationService.getReputation(seller.id);
      const buyerInitial = await reputationService.getReputation(buyer.id);

      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: buyer.id,
        reason: 'Item not delivered',
        evidence: ['tracking.pdf', 'communication.png']
      });

      await disputeService.resolve(dispute.id, {
        winner: buyer.id,
        refundAmount: mockTransaction.amount,
        reasoning: 'Seller failed to provide delivery proof'
      });

      const sellerAfter = await reputationService.getReputation(seller.id);
      const buyerAfter = await reputationService.getReputation(buyer.id);

      expect(sellerAfter.score).toBeLessThan(sellerInitial.score);
      expect(sellerAfter.disputesLost).toBe(sellerInitial.disputesLost + 1);
      expect(sellerAfter.failureToDeliver).toBe(1);

      expect(buyerAfter.score).toBeGreaterThan(buyerInitial.score);
      expect(buyerAfter.disputesWon).toBe(buyerInitial.disputesWon + 1);
    });

    it('should handle partial resolution', async () => {
      const [seller, buyer] = testUsers;
      
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: buyer.id,
        reason: 'Partial delivery',
        evidence: ['invoice.pdf', 'photos.zip']
      });

      await disputeService.resolve(dispute.id, {
        winner: 'partial',
        refundAmount: mockTransaction.amount * 0.3,
        reasoning: 'Both parties partially at fault'
      });

      const sellerAfter = await reputationService.getReputation(seller.id);
      const buyerAfter = await reputationService.getReputation(buyer.id);

      // Both should have minor reputation impact
      expect(Math.abs(sellerAfter.score - 85)).toBeLessThan(5);
      expect(Math.abs(buyerAfter.score - 50)).toBeLessThan(5);
    });
  });

  describe('Reputation-Weighted Dispute Resolution', () => {
    it('should consider reputation difference in resolution impact', async () => {
      const [highRepSeller, , lowRepUser] = testUsers;
      
      // Create transaction between high and low rep users
      const tx = await transactionService.create({
        seller: highRepSeller.id,
        buyer: lowRepUser.id,
        amount: 1000,
        escrowType: 'standard'
      });

      const dispute = await disputeService.create({
        transactionId: tx.id,
        initiator: lowRepUser.id,
        reason: 'Quality issue',
        evidence: []
      });

      // Low rep user wins against high rep (surprising outcome)
      await disputeService.resolve(dispute.id, {
        winner: lowRepUser.id,
        reasoning: 'Clear evidence of quality issues'
      });

      const highRepAfter = await reputationService.getReputation(highRepSeller.id);
      const lowRepAfter = await reputationService.getReputation(lowRepUser.id);

      // High rep user loses more for losing to low rep user
      expect(highRepAfter.score).toBeLessThan(80); // Significant loss
      
      // Low rep user gains more for winning against high rep
      expect(lowRepAfter.score).toBeGreaterThan(30); // Significant gain
    });

    it('should apply credibility weights to dispute evidence', async () => {
      const [highRepSeller, medRepBuyer] = testUsers;
      
      // Both submit evidence
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: medRepBuyer.id,
        reason: 'Misrepresentation',
        evidence: ['buyer_evidence.pdf']
      });

      await disputeService.submitEvidence(dispute.id, highRepSeller.id, [
        'seller_evidence.pdf',
        'expert_report.pdf'
      ]);

      // Get evidence credibility scores
      const evidenceAnalysis = await disputeService.analyzeEvidence(dispute.id);
      
      expect(evidenceAnalysis.sellerCredibility).toBeGreaterThan(
        evidenceAnalysis.buyerCredibility
      );
      expect(evidenceAnalysis.reputationWeight).toBeCloseTo(0.63, 1); // 85/(85+50)
    });
  });

  describe('Multiple Concurrent Disputes', () => {
    it('should handle user with multiple active disputes', async () => {
      const [seller] = testUsers;
      const buyers = testUsers.slice(1);
      
      // Create multiple transactions and disputes
      const disputes = await Promise.all(
        buyers.map(async buyer => {
          const tx = await transactionService.create({
            seller: seller.id,
            buyer: buyer.id,
            amount: 1000,
            escrowType: 'standard'
          });

          return disputeService.create({
            transactionId: tx.id,
            initiator: buyer.id,
            reason: 'Various issues',
            evidence: []
          });
        })
      );

      // Check reputation during multiple disputes
      const repDuringDisputes = await reputationService.getReputation(seller.id);
      expect(repDuringDisputes.pendingDisputes).toBe(3);
      expect(repDuringDisputes.reputationFrozen).toBe(true);
      expect(repDuringDisputes.riskScore).toBeGreaterThan(0.7);

      // Resolve disputes with mixed outcomes
      await disputeService.resolve(disputes[0].id, { winner: seller.id });
      await disputeService.resolve(disputes[1].id, { winner: buyers[1].id });
      await disputeService.resolve(disputes[2].id, { winner: 'partial' });

      const repAfter = await reputationService.getReputation(seller.id);
      expect(repAfter.disputeRate).toBeGreaterThan(0.5); // High dispute rate
      expect(repAfter.score).toBeLessThan(85); // Reputation damaged
      expect(repAfter.flags).toContain('high_dispute_rate');
    });

    it('should detect dispute patterns and fraud', async () => {
      const [, , , scammer] = testUsers;
      
      // Create pattern of disputes
      for (let i = 0; i < 5; i++) {
        const victim = await createTestUser({ 
          name: `Victim${i}`, 
          initialReputation: 40 
        });

        const tx = await transactionService.create({
          seller: victim.id,
          buyer: scammer.id,
          amount: 500,
          escrowType: 'standard'
        });

        const dispute = await disputeService.create({
          transactionId: tx.id,
          initiator: scammer.id,
          reason: 'Not received',
          evidence: []
        });

        // Scammer keeps winning disputes
        await disputeService.resolve(dispute.id, {
          winner: scammer.id,
          reasoning: 'No delivery proof'
        });
      }

      const scammerRep = await reputationService.getReputation(scammer.id);
      
      // System should detect the pattern
      expect(scammerRep.flags).toContain('dispute_abuse_suspected');
      expect(scammerRep.accountRestrictions).toContain('dispute_creation_blocked');
      expect(scammerRep.fraudRiskScore).toBeGreaterThan(0.8);
    });
  });

  describe('Staking Impact on Disputes', () => {
    it('should slash stake for dispute loss', async () => {
      const [seller] = testUsers;
      
      // Seller stakes tokens
      await stakingService.stake(ethers.utils.parseEther('2000'), seller.signer);
      
      const stakeBefore = await stakingService.getStakeInfo(seller.id);
      const repBefore = await reputationService.getReputation(seller.id);

      // Create and lose dispute
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: testUsers[1].id,
        reason: 'Fraud',
        evidence: ['proof1.pdf', 'proof2.pdf']
      });

      await disputeService.resolve(dispute.id, {
        winner: testUsers[1].id,
        reasoning: 'Clear evidence of fraud',
        severityLevel: 'high'
      });

      const stakeAfter = await stakingService.getStakeInfo(seller.id);
      const repAfter = await reputationService.getReputation(seller.id);

      // Stake should be slashed
      expect(stakeAfter.amount).toBeLessThan(stakeBefore.amount);
      expect(stakeAfter.slashingHistory).toHaveLength(1);
      expect(stakeAfter.slashingHistory[0].reason).toContain('dispute');

      // Reputation heavily impacted
      expect(repAfter.score).toBeLessThan(repBefore.score - 20);
      expect(repAfter.stakeMultiplier).toBeLessThan(repBefore.stakeMultiplier);
    });

    it('should require stake for high-value dispute initiation', async () => {
      const [, buyer] = testUsers;
      
      // Try to create dispute without stake
      await expect(disputeService.create({
        transactionId: mockTransaction.id,
        initiator: buyer.id,
        reason: 'Major fraud',
        evidence: [],
        claimAmount: 10000 // High value
      })).rejects.toThrow('Insufficient stake for dispute value');

      // Stake required amount
      await stakingService.stake(ethers.utils.parseEther('500'), buyer.signer);

      // Now should work
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: buyer.id,
        reason: 'Major fraud',
        evidence: [],
        claimAmount: 10000
      });

      expect(dispute).toBeDefined();
      expect(dispute.stakeRequired).toBe(true);
    });
  });

  describe('Dispute Resolution Incentives', () => {
    it('should reward accurate dispute predictions', async () => {
      const [seller, buyer, observer1, observer2] = testUsers;
      
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: buyer.id,
        reason: 'Not delivered',
        evidence: ['tracking_failed.pdf']
      });

      // Community members predict outcome
      await disputeService.submitPrediction(dispute.id, observer1.id, {
        predictedWinner: buyer.id,
        confidence: 0.8,
        stake: ethers.utils.parseEther('100')
      });

      await disputeService.submitPrediction(dispute.id, observer2.id, {
        predictedWinner: seller.id,
        confidence: 0.6,
        stake: ethers.utils.parseEther('50')
      });

      // Resolve dispute
      await disputeService.resolve(dispute.id, {
        winner: buyer.id,
        reasoning: 'Evidence supports non-delivery'
      });

      // Check reputation impacts
      const observer1Rep = await reputationService.getReputation(observer1.id);
      const observer2Rep = await reputationService.getReputation(observer2.id);

      expect(observer1Rep.score).toBeGreaterThan(50); // Gained reputation
      expect(observer1Rep.disputePredictionAccuracy).toBe(1.0);
      expect(observer1Rep.earnedFromPredictions).toBeGreaterThan(0);

      expect(observer2Rep.score).toBeLessThan(50); // Lost some reputation
      expect(observer2Rep.disputePredictionAccuracy).toBe(0);
    });

    it('should build arbitrator reputation', async () => {
      // Create arbitrator user
      const arbitrator = await createTestUser({
        name: 'Arbitrator',
        initialReputation: 70,
        roles: ['arbitrator']
      });

      // Arbitrate multiple disputes
      const disputeOutcomes = [
        { fair: true, overturned: false },
        { fair: true, overturned: false },
        { fair: false, overturned: true }, // Bad decision
        { fair: true, overturned: false },
        { fair: true, overturned: false }
      ];

      for (const outcome of disputeOutcomes) {
        const tx = await transactionService.create({
          seller: testUsers[0].id,
          buyer: testUsers[1].id,
          amount: 1000,
          escrowType: 'standard'
        });

        const dispute = await disputeService.create({
          transactionId: tx.id,
          initiator: testUsers[1].id,
          reason: 'Test dispute',
          evidence: []
        });

        await disputeService.assignArbitrator(dispute.id, arbitrator.id);
        
        const resolution = await disputeService.resolve(dispute.id, {
          winner: testUsers[0].id,
          arbitrator: arbitrator.id,
          reasoning: 'Test resolution'
        });

        if (outcome.overturned) {
          await disputeService.appeal(dispute.id, {
            reason: 'Unfair resolution',
            evidence: ['new_evidence.pdf']
          });
          
          await disputeService.overturnResolution(dispute.id, {
            newWinner: testUsers[1].id,
            reasoning: 'Original decision was incorrect'
          });
        }
      }

      const arbitratorRep = await reputationService.getReputation(arbitrator.id);
      
      expect(arbitratorRep.arbitratorScore).toBeDefined();
      expect(arbitratorRep.arbitratorScore).toBe(80); // 4/5 correct
      expect(arbitratorRep.disputesArbitrated).toBe(5);
      expect(arbitratorRep.arbitratorLevel).toBe('experienced');
    });
  });

  describe('Long-term Dispute Impact', () => {
    it('should track dispute history impact on reputation', async () => {
      const [seller] = testUsers;
      
      // Simulate dispute history over time
      const disputes = [];
      
      for (let month = 0; month < 6; month++) {
        const buyer = await createTestUser({ 
          name: `Buyer${month}`, 
          initialReputation: 40 
        });

        const tx = await transactionService.create({
          seller: seller.id,
          buyer: buyer.id,
          amount: 1000,
          escrowType: 'standard'
        });

        const dispute = await disputeService.create({
          transactionId: tx.id,
          initiator: buyer.id,
          reason: 'Issue',
          evidence: []
        });

        // Seller wins most but loses some
        const sellerWins = month !== 2 && month !== 4;
        
        await disputeService.resolve(dispute.id, {
          winner: sellerWins ? seller.id : buyer.id
        });

        disputes.push({
          month,
          won: sellerWins,
          timestamp: Date.now() - (6 - month) * 30 * 24 * 60 * 60 * 1000
        });

        // Simulate time passing
        vi.setSystemTime(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const finalRep = await reputationService.getReputation(seller.id);
      
      expect(finalRep.disputeHistory).toBeDefined();
      expect(finalRep.disputeHistory.total).toBe(6);
      expect(finalRep.disputeHistory.won).toBe(4);
      expect(finalRep.disputeHistory.winRate).toBeCloseTo(0.67, 2);
      
      // Recent disputes should have more impact
      expect(finalRep.recentDisputeRate).toBeDefined();
      expect(finalRep.disputeTrend).toBe('improving'); // Won recent ones
    });

    it('should apply reputation recovery after dispute-free period', async () => {
      const [, buyer] = testUsers;
      
      // Lose a dispute
      const dispute = await disputeService.create({
        transactionId: mockTransaction.id,
        initiator: testUsers[0].id,
        reason: 'Fraud',
        evidence: ['evidence.pdf']
      });

      await disputeService.resolve(dispute.id, {
        winner: testUsers[0].id,
        reasoning: 'Buyer committed fraud'
      });

      const repAfterLoss = await reputationService.getReputation(buyer.id);
      expect(repAfterLoss.score).toBeLessThan(40);
      expect(repAfterLoss.inRecovery).toBe(true);

      // Simulate good behavior for 90 days
      vi.setSystemTime(Date.now() + 90 * 24 * 60 * 60 * 1000);

      // Complete successful transactions
      for (let i = 0; i < 10; i++) {
        await reputationService.processEvent({
          userId: buyer.id,
          type: 'transaction_complete',
          points: 3,
          timestamp: Date.now() - i * 7 * 24 * 60 * 60 * 1000
        });
      }

      const repAfterRecovery = await reputationService.getReputation(buyer.id);
      
      expect(repAfterRecovery.score).toBeGreaterThan(repAfterLoss.score);
      expect(repAfterRecovery.inRecovery).toBe(false);
      expect(repAfterRecovery.disputeImpactDecayed).toBe(true);
    });
  });
});