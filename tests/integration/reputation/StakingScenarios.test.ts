/**
 * @fileoverview Integration tests for staking and slashing scenarios
 * @module tests/integration/reputation/StakingScenarios.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ethers } from 'ethers';
import { createTestUser, cleanupTestData } from '@/tests/utils/testHelpers';
import { ReputationService } from '@/services/reputation/ReputationService';
import { StakingService } from '@/services/reputation/StakingService';
import { TransactionService } from '@/services/TransactionService';
import { DisputeService } from '@/services/DisputeService';
import { GovernanceService } from '@/services/GovernanceService';
import type { User, StakeInfo, SlashingEvent } from '@/types';

describe('Staking and Slashing Scenarios', () => {
  let reputationService: ReputationService;
  let stakingService: StakingService;
  let transactionService: TransactionService;
  let disputeService: DisputeService;
  let governanceService: GovernanceService;
  let testUsers: User[];
  let mockStakingToken: any;

  beforeEach(async () => {
    // Initialize services
    reputationService = new ReputationService();
    stakingService = new StakingService();
    transactionService = new TransactionService();
    disputeService = new DisputeService();
    governanceService = new GovernanceService();

    // Create test users
    testUsers = await Promise.all([
      createTestUser({ name: 'Alice', initialReputation: 60, balance: 10000 }),
      createTestUser({ name: 'Bob', initialReputation: 40, balance: 5000 }),
      createTestUser({ name: 'Charlie', initialReputation: 80, balance: 20000 }),
      createTestUser({ name: 'David', initialReputation: 20, balance: 2000 })
    ]);

    // Mock staking token
    mockStakingToken = {
      balanceOf: vi.fn().mockImplementation(async (address) => {
        const user = testUsers.find(u => u.address === address);
        return ethers.utils.parseEther(user?.balance.toString() || '0');
      }),
      approve: vi.fn().mockResolvedValue({ wait: async () => ({ status: 1 }) }),
      transfer: vi.fn().mockResolvedValue({ wait: async () => ({ status: 1 }) })
    };
  });

  afterEach(async () => {
    await cleanupTestData(testUsers);
    vi.clearAllMocks();
  });

  describe('Basic Staking Operations', () => {
    it('should handle progressive staking with reputation boost', async () => {
      const alice = testUsers[0];
      
      // Initial reputation
      const initialRep = await reputationService.getReputation(alice.id);
      expect(initialRep.score).toBe(60);
      expect(initialRep.stakedAmount).toBe(0);
      expect(initialRep.stakeMultiplier).toBe(1.0);

      // Progressive staking
      const stakeAmounts = [100, 400, 500, 1000]; // Total: 2000
      
      for (let i = 0; i < stakeAmounts.length; i++) {
        const amount = ethers.utils.parseEther(stakeAmounts[i].toString());
        
        await stakingService.stake(amount, alice.signer);
        
        const rep = await reputationService.getReputation(alice.id);
        const totalStaked = stakeAmounts.slice(0, i + 1).reduce((a, b) => a + b, 0);
        
        expect(rep.stakedAmount).toBe(totalStaked);
        expect(rep.stakeMultiplier).toBeGreaterThan(1.0);
        expect(rep.effectiveScore).toBe(Math.floor(60 * rep.stakeMultiplier));
        
        // Verify staking events
        const stakeInfo = await stakingService.getStakeInfo(alice.id);
        expect(stakeInfo.totalStaked).toBe(ethers.utils.parseEther(totalStaked.toString()));
        expect(stakeInfo.lastStakeTime).toBeDefined();
      }

      // Final state
      const finalRep = await reputationService.getReputation(alice.id);
      expect(finalRep.stakeMultiplier).toBeCloseTo(1.2, 1); // 20% boost for 2000 stake
      expect(finalRep.level).toBe('gold'); // Boosted to gold level
    });

    it('should enforce minimum stake for reputation levels', async () => {
      const bob = testUsers[1];
      
      // Try to achieve gold level without sufficient stake
      await expect(reputationService.upgradeLevel(bob.id, 'gold'))
        .rejects.toThrow('Insufficient stake for gold level');

      // Check requirements
      const requirements = await stakingService.getLevelRequirements('gold');
      expect(requirements.minimumStake).toBe(1000);
      expect(requirements.minimumReputation).toBe(60);

      // Stake required amount
      await stakingService.stake(
        ethers.utils.parseEther('1000'),
        bob.signer
      );

      // Build reputation to 60
      for (let i = 0; i < 4; i++) {
        await reputationService.processEvent({
          userId: bob.id,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now() + i * 86400000
        });
      }

      // Now upgrade should work
      const upgraded = await reputationService.upgradeLevel(bob.id, 'gold');
      expect(upgraded).toBe(true);
      
      const rep = await reputationService.getReputation(bob.id);
      expect(rep.level).toBe('gold');
    });

    it('should handle unstaking with timelock', async () => {
      const charlie = testUsers[2];
      
      // Stake tokens
      const stakeAmount = ethers.utils.parseEther('5000');
      await stakingService.stake(stakeAmount, charlie.signer);

      // Initiate unstaking
      const unstakeAmount = ethers.utils.parseEther('2000');
      const unstakeResult = await stakingService.initiateUnstake(
        unstakeAmount,
        charlie.signer
      );

      expect(unstakeResult.timelockPeriod).toBe(7 * 24 * 60 * 60); // 7 days
      expect(unstakeResult.unlockTime).toBeGreaterThan(Date.now() / 1000);

      // Check reputation during timelock
      const repDuringTimelock = await reputationService.getReputation(charlie.id);
      expect(repDuringTimelock.pendingUnstake).toBe(2000);
      expect(repDuringTimelock.effectiveStake).toBe(3000); // 5000 - 2000
      expect(repDuringTimelock.stakeMultiplier).toBeLessThan(1.5); // Reduced

      // Try to withdraw before timelock
      await expect(stakingService.withdrawUnstaked(charlie.signer))
        .rejects.toThrow('Tokens still locked');

      // Fast forward time
      vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);

      // Now withdrawal should work
      const withdrawResult = await stakingService.withdrawUnstaked(charlie.signer);
      expect(withdrawResult.amount).toEqual(unstakeAmount);

      // Final reputation check
      const finalRep = await reputationService.getReputation(charlie.id);
      expect(finalRep.stakedAmount).toBe(3000);
      expect(finalRep.pendingUnstake).toBe(0);
    });
  });

  describe('Slashing Scenarios', () => {
    it('should slash stake for terms violation', async () => {
      const alice = testUsers[0];
      
      // Stake tokens
      await stakingService.stake(ethers.utils.parseEther('2000'), alice.signer);
      
      const repBefore = await reputationService.getReputation(alice.id);
      const stakeBefore = await stakingService.getStakeInfo(alice.id);

      // Violation detected
      const slashingEvent = await governanceService.reportViolation({
        userId: alice.id,
        violationType: 'terms_violation',
        severity: 'medium',
        evidence: ['screenshot1.png', 'logs.txt']
      });

      // Execute slashing
      const slashResult = await stakingService.executeSlashing(slashingEvent);
      
      expect(slashResult.slashedAmount).toBe(ethers.utils.parseEther('400')); // 20%
      expect(slashResult.reason).toBe('terms_violation');

      // Check impacts
      const repAfter = await reputationService.getReputation(alice.id);
      const stakeAfter = await stakingService.getStakeInfo(alice.id);

      expect(stakeAfter.amount).toBe(ethers.utils.parseEther('1600'));
      expect(repAfter.score).toBeLessThan(repBefore.score);
      expect(repAfter.violations).toHaveLength(1);
      expect(repAfter.slashingHistory).toHaveLength(1);
    });

    it('should apply progressive slashing for repeat offenders', async () => {
      const bob = testUsers[1];
      
      // Stake tokens
      await stakingService.stake(ethers.utils.parseEther('3000'), bob.signer);

      // First violation - 10% slash
      await stakingService.slash(bob.id, 10, 'minor_violation');
      let stakeInfo = await stakingService.getStakeInfo(bob.id);
      expect(stakeInfo.amount).toBe(ethers.utils.parseEther('2700'));

      // Second violation - 20% slash (doubled)
      await stakingService.slash(bob.id, 10, 'minor_violation');
      stakeInfo = await stakingService.getStakeInfo(bob.id);
      expect(stakeInfo.amount).toBe(ethers.utils.parseEther('2160')); // 2700 * 0.8

      // Third violation - 40% slash (doubled again)
      await stakingService.slash(bob.id, 10, 'minor_violation');
      stakeInfo = await stakingService.getStakeInfo(bob.id);
      expect(stakeInfo.amount).toBe(ethers.utils.parseEther('1296')); // 2160 * 0.6

      // Check reputation severely impacted
      const rep = await reputationService.getReputation(bob.id);
      expect(rep.score).toBeLessThan(20);
      expect(rep.flags).toContain('repeat_offender');
      expect(rep.accountRestrictions).toContain('high_risk');
    });

    it('should slash for collusion detection', async () => {
      const [alice, bob, charlie] = testUsers;
      
      // All stake tokens
      await Promise.all([
        stakingService.stake(ethers.utils.parseEther('1000'), alice.signer),
        stakingService.stake(ethers.utils.parseEther('1000'), bob.signer),
        stakingService.stake(ethers.utils.parseEther('1000'), charlie.signer)
      ]);

      // Create circular trading pattern
      const transactions = [
        { from: alice.id, to: bob.id, amount: 500 },
        { from: bob.id, to: charlie.id, amount: 500 },
        { from: charlie.id, to: alice.id, amount: 500 }
      ];

      for (const tx of transactions) {
        await transactionService.create({
          seller: tx.from,
          buyer: tx.to,
          amount: tx.amount,
          escrowType: 'instant'
        });
      }

      // Collusion detection triggers
      const collusionReport = await reputationService.detectCollusion([
        alice.id, bob.id, charlie.id
      ]);

      expect(collusionReport.detected).toBe(true);
      expect(collusionReport.pattern).toBe('circular');

      // Execute coordinated slashing
      const slashingResults = await stakingService.slashColluders(
        collusionReport.participants,
        30 // 30% slash
      );

      // Verify all participants slashed
      for (const participant of [alice, bob, charlie]) {
        const stake = await stakingService.getStakeInfo(participant.id);
        expect(stake.amount).toBe(ethers.utils.parseEther('700'));
        
        const rep = await reputationService.getReputation(participant.id);
        expect(rep.flags).toContain('collusion_detected');
        expect(rep.tradingRestrictions).toBeDefined();
      }
    });

    it('should handle dispute-based slashing', async () => {
      const [seller, buyer] = testUsers;
      
      // Both stake
      await stakingService.stake(ethers.utils.parseEther('2000'), seller.signer);
      await stakingService.stake(ethers.utils.parseEther('1000'), buyer.signer);

      // Create high-value transaction
      const tx = await transactionService.create({
        seller: seller.id,
        buyer: buyer.id,
        amount: 5000,
        escrowType: 'standard'
      });

      // Dispute with fraud claim
      const dispute = await disputeService.create({
        transactionId: tx.id,
        initiator: buyer.id,
        reason: 'Fraudulent listing',
        evidence: ['proof1.pdf', 'proof2.pdf', 'proof3.pdf']
      });

      // Resolve with fraud finding
      await disputeService.resolve(dispute.id, {
        winner: buyer.id,
        finding: 'fraud',
        severity: 'high'
      });

      // Check seller's stake slashed
      const sellerStake = await stakingService.getStakeInfo(seller.id);
      expect(sellerStake.amount).toBeLessThan(ethers.utils.parseEther('2000'));
      expect(sellerStake.slashingHistory).toContainEqual(
        expect.objectContaining({
          reason: 'fraud_dispute_loss',
          percentage: expect.any(Number)
        })
      );

      // Buyer may receive portion of slashed amount
      const buyerStake = await stakingService.getStakeInfo(buyer.id);
      expect(buyerStake.amount).toBeGreaterThan(ethers.utils.parseEther('1000'));
      expect(buyerStake.rewardsEarned).toBeGreaterThan(0);
    });
  });

  describe('Staking Rewards', () => {
    it('should distribute staking rewards based on behavior', async () => {
      const users = testUsers;
      
      // All users stake
      await Promise.all(users.map((user, i) =>
        stakingService.stake(
          ethers.utils.parseEther((1000 * (i + 1)).toString()),
          user.signer
        )
      ));

      // Simulate 30 days of activity
      vi.setSystemTime(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Different behavior patterns
      // Alice: Good behavior
      for (let i = 0; i < 10; i++) {
        await reputationService.processEvent({
          userId: users[0].id,
          type: 'transaction_complete',
          points: 5,
          timestamp: Date.now() - i * 3 * 24 * 60 * 60 * 1000
        });
      }

      // Bob: Mixed behavior
      await reputationService.processEvent({
        userId: users[1].id,
        type: 'dispute_lost',
        points: -10,
        timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000
      });

      // Charlie: Excellent behavior
      for (let i = 0; i < 20; i++) {
        await reputationService.processEvent({
          userId: users[2].id,
          type: 'community_service',
          points: 3,
          timestamp: Date.now() - i * 24 * 60 * 60 * 1000
        });
      }

      // David: Inactive

      // Calculate and distribute rewards
      const rewardsDistribution = await stakingService.distributeMonthlyRewards();

      // Check rewards based on behavior
      const rewards = await Promise.all(users.map(user =>
        stakingService.getRewards(user.id)
      ));

      expect(rewards[2]).toBeGreaterThan(rewards[0]); // Charlie > Alice
      expect(rewards[0]).toBeGreaterThan(rewards[1]); // Alice > Bob
      expect(rewards[3]).toBe(0); // David gets nothing (inactive)

      // Verify reputation bonuses
      for (let i = 0; i < users.length; i++) {
        const rep = await reputationService.getReputation(users[i].id);
        if (rewards[i] > 0) {
          expect(rep.stakingRewardsEarned).toBeGreaterThan(0);
          expect(rep.score).toBeGreaterThan(rep.baseScore); // Bonus applied
        }
      }
    });

    it('should compound staking rewards automatically', async () => {
      const alice = testUsers[0];
      
      // Initial stake
      await stakingService.stake(ethers.utils.parseEther('1000'), alice.signer);

      // Enable auto-compound
      await stakingService.setAutoCompound(alice.id, true);

      // Simulate multiple reward periods
      for (let month = 0; month < 6; month++) {
        // Good behavior
        for (let i = 0; i < 5; i++) {
          await reputationService.processEvent({
            userId: alice.id,
            type: 'transaction_complete',
            points: 5,
            timestamp: Date.now() + i * 86400000
          });
        }

        // Fast forward 30 days
        vi.setSystemTime(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // Distribute rewards
        await stakingService.distributeMonthlyRewards();
      }

      // Check compounded stake
      const finalStake = await stakingService.getStakeInfo(alice.id);
      expect(finalStake.amount).toBeGreaterThan(ethers.utils.parseEther('1000'));
      expect(finalStake.compoundedRewards).toBeGreaterThan(0);
      
      // Higher stake = higher reputation multiplier
      const rep = await reputationService.getReputation(alice.id);
      expect(rep.stakeMultiplier).toBeGreaterThan(1.1);
    });
  });

  describe('Emergency Scenarios', () => {
    it('should handle emergency withdrawal with penalties', async () => {
      const david = testUsers[3];
      
      // Stake and lock tokens
      await stakingService.stake(ethers.utils.parseEther('2000'), david.signer);
      
      // Create a locked position (e.g., for governance)
      await stakingService.lockForGovernance(
        david.id,
        ethers.utils.parseEther('1000'),
        30 // 30 days
      );

      const repBefore = await reputationService.getReputation(david.id);

      // Emergency withdrawal request
      const emergencyResult = await stakingService.emergencyWithdraw(
        david.signer,
        'Medical emergency'
      );

      expect(emergencyResult.penalty).toBe(0.3); // 30% penalty
      expect(emergencyResult.received).toBe(ethers.utils.parseEther('1400')); // 70% of 2000

      // Check reputation impact
      const repAfter = await reputationService.getReputation(david.id);
      expect(repAfter.score).toBeLessThan(repBefore.score);
      expect(repAfter.emergencyWithdrawals).toBe(1);
      expect(repAfter.trustScore).toBeLessThan(repBefore.trustScore);
    });

    it('should handle protocol pause and recovery', async () => {
      // Stake for all users
      await Promise.all(testUsers.map(user =>
        stakingService.stake(ethers.utils.parseEther('1000'), user.signer)
      ));

      // Simulate protocol emergency
      await governanceService.declareEmergency('Critical vulnerability detected');

      // Check staking paused
      const stakingStatus = await stakingService.getProtocolStatus();
      expect(stakingStatus.paused).toBe(true);
      expect(stakingStatus.reason).toBe('Critical vulnerability detected');

      // New stakes should fail
      await expect(
        stakingService.stake(ethers.utils.parseEther('100'), testUsers[0].signer)
      ).rejects.toThrow('Protocol is paused');

      // But emergency withdrawals should work
      const emergencyWithdrawals = await Promise.all(
        testUsers.map(user => stakingService.emergencyWithdraw(user.signer))
      );

      emergencyWithdrawals.forEach(withdrawal => {
        expect(withdrawal.success).toBe(true);
        expect(withdrawal.penalty).toBeLessThan(0.5); // Reduced penalty during emergency
      });

      // Resume protocol
      await governanceService.resolveEmergency('Vulnerability patched');

      // Verify recovery
      const statusAfter = await stakingService.getProtocolStatus();
      expect(statusAfter.paused).toBe(false);

      // Users who withdrew during emergency get reputation penalty waived
      for (const user of testUsers) {
        const rep = await reputationService.getReputation(user.id);
        expect(rep.emergencyWithdrawalPenaltyWaived).toBe(true);
      }
    });
  });

  describe('Advanced Staking Strategies', () => {
    it('should support tiered staking with different lock periods', async () => {
      const alice = testUsers[0];
      
      // Create multiple staking tiers
      const tiers = [
        { amount: 500, lockDays: 0, apy: 0.05 },    // Flexible
        { amount: 1000, lockDays: 30, apy: 0.08 },  // 1 month
        { amount: 1500, lockDays: 90, apy: 0.12 },  // 3 months
        { amount: 2000, lockDays: 180, apy: 0.15 }  // 6 months
      ];

      for (const tier of tiers) {
        await stakingService.stakeWithLock(
          ethers.utils.parseEther(tier.amount.toString()),
          tier.lockDays,
          alice.signer
        );
      }

      // Check positions
      const positions = await stakingService.getStakingPositions(alice.id);
      expect(positions).toHaveLength(4);

      positions.forEach((pos, i) => {
        expect(pos.amount).toBe(ethers.utils.parseEther(tiers[i].amount.toString()));
        expect(pos.lockPeriod).toBe(tiers[i].lockDays * 86400);
        expect(pos.apy).toBe(tiers[i].apy);
      });

      // Calculate total effective stake
      const effectiveStake = await stakingService.calculateEffectiveStake(alice.id);
      expect(effectiveStake).toBeGreaterThan(
        ethers.utils.parseEther('5000') // Sum of amounts
      );

      // Longer locks give higher weight
      const rep = await reputationService.getReputation(alice.id);
      expect(rep.stakeMultiplier).toBeGreaterThan(1.5);
      expect(rep.commitmentScore).toBeGreaterThan(0.8);
    });

    it('should enable delegation and reputation sharing', async () => {
      const [alice, bob] = testUsers;
      
      // Alice has high stake and reputation
      await stakingService.stake(ethers.utils.parseEther('10000'), alice.signer);
      
      // Bob delegates to Alice
      await stakingService.delegate(
        alice.id,
        ethers.utils.parseEther('2000'),
        bob.signer
      );

      // Check delegation status
      const aliceStake = await stakingService.getStakeInfo(alice.id);
      expect(aliceStake.delegatedTo).toBe(ethers.utils.parseEther('2000'));
      expect(aliceStake.totalInfluence).toBe(ethers.utils.parseEther('12000'));

      const bobStake = await stakingService.getStakeInfo(bob.id);
      expect(bobStake.delegatedAmount).toBe(ethers.utils.parseEther('2000'));
      expect(bobStake.delegatedTo).toBe(alice.id);

      // Bob gets partial reputation benefit
      const bobRep = await reputationService.getReputation(bob.id);
      expect(bobRep.delegationBonus).toBeGreaterThan(0);
      expect(bobRep.effectiveScore).toBeGreaterThan(bobRep.baseScore);

      // Alice's actions affect Bob's reputation (reduced impact)
      await reputationService.processEvent({
        userId: alice.id,
        type: 'dispute_lost',
        points: -10,
        timestamp: Date.now()
      });

      const bobRepAfter = await reputationService.getReputation(bob.id);
      expect(bobRepAfter.score).toBeLessThan(bobRep.score);
      expect(bobRepAfter.delegationImpact).toBeLessThan(-2); // Reduced impact
    });
  });
});