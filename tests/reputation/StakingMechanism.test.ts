/**
 * @fileoverview Unit tests for Staking Mechanism
 * @module tests/reputation/StakingMechanism.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StakingService } from '@/services/reputation/StakingService';
import { ethers } from 'ethers';
import type { StakeInfo, StakingEvent, SlashingReason } from '@/types/staking';

describe('StakingMechanism', () => {
  let stakingService: StakingService;
  let mockProvider: any;
  let mockContract: any;
  let mockSigner: any;

  beforeEach(() => {
    // Mock ethers provider and contract
    mockProvider = {
      getBalance: vi.fn(),
      getBlockNumber: vi.fn().mockResolvedValue(1000000),
      getBlock: vi.fn().mockResolvedValue({ timestamp: Date.now() / 1000 })
    };

    mockContract = {
      stake: vi.fn().mockResolvedValue({ wait: () => Promise.resolve({ status: 1 }) }),
      unstake: vi.fn().mockResolvedValue({ wait: () => Promise.resolve({ status: 1 }) }),
      getStakeInfo: vi.fn(),
      slash: vi.fn().mockResolvedValue({ wait: () => Promise.resolve({ status: 1 }) }),
      getMinimumStake: vi.fn().mockResolvedValue(ethers.utils.parseEther('100')),
      getTotalStaked: vi.fn().mockResolvedValue(ethers.utils.parseEther('10000')),
      connect: vi.fn().mockReturnThis()
    };

    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    };

    stakingService = new StakingService(mockContract, mockProvider);
  });

  describe('Staking Operations', () => {
    it('should stake tokens successfully', async () => {
      const amount = ethers.utils.parseEther('500');
      
      const result = await stakingService.stake(amount, mockSigner);
      
      expect(mockContract.stake).toHaveBeenCalledWith(amount);
      expect(result.success).toBe(true);
      expect(result.amount).toEqual(amount);
    });

    it('should enforce minimum stake requirements', async () => {
      const amount = ethers.utils.parseEther('50'); // Below minimum
      
      await expect(stakingService.stake(amount, mockSigner))
        .rejects.toThrow('Amount below minimum stake requirement');
    });

    it('should calculate stake multiplier correctly', () => {
      const testCases = [
        { stake: 0, expected: 1.0 },
        { stake: 100, expected: 1.0 },
        { stake: 500, expected: 1.05 },
        { stake: 1000, expected: 1.1 },
        { stake: 5000, expected: 1.25 },
        { stake: 10000, expected: 1.5 }
      ];

      testCases.forEach(({ stake, expected }) => {
        const multiplier = stakingService.calculateStakeMultiplier(
          ethers.utils.parseEther(stake.toString())
        );
        expect(multiplier).toBeCloseTo(expected, 2);
      });
    });

    it('should handle stake updates', async () => {
      const initialStake = ethers.utils.parseEther('500');
      const additionalStake = ethers.utils.parseEther('300');
      
      mockContract.getStakeInfo.mockResolvedValueOnce({
        amount: initialStake,
        timestamp: Date.now() / 1000,
        locked: false
      });

      const result = await stakingService.increaseStake(additionalStake, mockSigner);
      
      expect(result.newTotal).toEqual(initialStake.add(additionalStake));
      expect(result.success).toBe(true);
    });

    it('should validate stake amount limits', async () => {
      const maxStake = ethers.utils.parseEther('100000');
      
      await expect(
        stakingService.stake(maxStake.add(1), mockSigner)
      ).rejects.toThrow('Amount exceeds maximum stake limit');
    });
  });

  describe('Unstaking Operations', () => {
    it('should unstake tokens with timelock', async () => {
      const amount = ethers.utils.parseEther('200');
      const stakeInfo: StakeInfo = {
        amount: ethers.utils.parseEther('500'),
        timestamp: Date.now() / 1000 - 86400 * 30, // 30 days ago
        locked: false,
        unlockTime: 0
      };

      mockContract.getStakeInfo.mockResolvedValue(stakeInfo);

      const result = await stakingService.unstake(amount, mockSigner);
      
      expect(result.success).toBe(true);
      expect(result.unlockTime).toBeGreaterThan(Date.now() / 1000);
      expect(result.timelockPeriod).toBe(7 * 24 * 60 * 60); // 7 days
    });

    it('should prevent unstaking locked stakes', async () => {
      const stakeInfo: StakeInfo = {
        amount: ethers.utils.parseEther('500'),
        timestamp: Date.now() / 1000,
        locked: true,
        unlockTime: Date.now() / 1000 + 86400
      };

      mockContract.getStakeInfo.mockResolvedValue(stakeInfo);

      await expect(
        stakingService.unstake(ethers.utils.parseEther('100'), mockSigner)
      ).rejects.toThrow('Stake is currently locked');
    });

    it('should calculate early unstaking penalties', () => {
      const testCases = [
        { daysStaked: 7, penalty: 0.2 },   // 20% penalty
        { daysStaked: 14, penalty: 0.15 }, // 15% penalty
        { daysStaked: 30, penalty: 0.1 },  // 10% penalty
        { daysStaked: 90, penalty: 0.05 }, // 5% penalty
        { daysStaked: 180, penalty: 0 }    // No penalty
      ];

      testCases.forEach(({ daysStaked, penalty }) => {
        const calculatedPenalty = stakingService.calculateUnstakingPenalty(daysStaked);
        expect(calculatedPenalty).toBe(penalty);
      });
    });

    it('should handle partial unstaking', async () => {
      const totalStaked = ethers.utils.parseEther('1000');
      const unstakeAmount = ethers.utils.parseEther('300');
      
      mockContract.getStakeInfo.mockResolvedValue({
        amount: totalStaked,
        timestamp: Date.now() / 1000 - 86400 * 90,
        locked: false
      });

      const result = await stakingService.unstake(unstakeAmount, mockSigner);
      
      expect(result.remainingStake).toEqual(totalStaked.sub(unstakeAmount));
      expect(result.penalty).toBe(0.05); // 5% for 90 days
    });

    it('should enforce minimum remaining stake', async () => {
      const totalStaked = ethers.utils.parseEther('150');
      const unstakeAmount = ethers.utils.parseEther('100');
      
      mockContract.getStakeInfo.mockResolvedValue({
        amount: totalStaked,
        timestamp: Date.now() / 1000,
        locked: false
      });

      await expect(
        stakingService.unstake(unstakeAmount, mockSigner)
      ).rejects.toThrow('Remaining stake would be below minimum');
    });
  });

  describe('Slashing Mechanism', () => {
    it('should slash stake for violations', async () => {
      const stakeAmount = ethers.utils.parseEther('1000');
      const slashPercentage = 20; // 20%
      
      mockContract.getStakeInfo.mockResolvedValue({
        amount: stakeAmount,
        timestamp: Date.now() / 1000,
        locked: false
      });

      const result = await stakingService.slash(
        '0x1234567890123456789012345678901234567890',
        slashPercentage,
        SlashingReason.COLLUSION_DETECTED
      );

      expect(mockContract.slash).toHaveBeenCalled();
      expect(result.amountSlashed).toEqual(stakeAmount.mul(20).div(100));
      expect(result.reason).toBe(SlashingReason.COLLUSION_DETECTED);
    });

    it('should enforce slashing limits', async () => {
      await expect(
        stakingService.slash(
          '0x1234567890123456789012345678901234567890',
          101, // > 100%
          SlashingReason.FRAUD_DETECTED
        )
      ).rejects.toThrow('Invalid slash percentage');
    });

    it('should calculate reputation impact from slashing', () => {
      const testCases = [
        { slashPercent: 10, reputationLoss: 5 },
        { slashPercent: 20, reputationLoss: 10 },
        { slashPercent: 50, reputationLoss: 25 },
        { slashPercent: 100, reputationLoss: 50 }
      ];

      testCases.forEach(({ slashPercent, reputationLoss }) => {
        const impact = stakingService.calculateReputationImpact(slashPercent);
        expect(impact).toBe(reputationLoss);
      });
    });

    it('should track slashing history', async () => {
      const userId = '0x1234567890123456789012345678901234567890';
      
      // First slash
      await stakingService.slash(userId, 10, SlashingReason.DISPUTE_LOST);
      
      // Second slash - should have increased severity
      const secondSlash = await stakingService.slash(
        userId, 
        10, 
        SlashingReason.DISPUTE_LOST
      );
      
      expect(secondSlash.severityMultiplier).toBeGreaterThan(1);
    });

    it('should prevent slashing below minimum stake', async () => {
      const stakeAmount = ethers.utils.parseEther('120');
      
      mockContract.getStakeInfo.mockResolvedValue({
        amount: stakeAmount,
        timestamp: Date.now() / 1000,
        locked: false
      });

      await expect(
        stakingService.slash(
          '0x1234567890123456789012345678901234567890',
          30, // Would bring stake below 100
          SlashingReason.TERMS_VIOLATION
        )
      ).rejects.toThrow('Slashing would bring stake below minimum');
    });
  });

  describe('Stake Rewards', () => {
    it('should calculate staking rewards correctly', () => {
      const testCases = [
        { amount: 1000, days: 30, apy: 0.1, expected: 8.219 },  // ~8.22
        { amount: 5000, days: 365, apy: 0.12, expected: 600 },   // 600
        { amount: 10000, days: 90, apy: 0.08, expected: 197.26 } // ~197.26
      ];

      testCases.forEach(({ amount, days, apy, expected }) => {
        const rewards = stakingService.calculateRewards(
          ethers.utils.parseEther(amount.toString()),
          days,
          apy
        );
        
        const rewardsInEther = parseFloat(ethers.utils.formatEther(rewards));
        expect(rewardsInEther).toBeCloseTo(expected, 1);
      });
    });

    it('should apply bonus APY for long-term stakers', () => {
      const amount = ethers.utils.parseEther('1000');
      
      const rewards30Days = stakingService.calculateRewards(amount, 30, 0.1);
      const rewards365Days = stakingService.calculateRewards(amount, 365, 0.1);
      
      // Long-term stakers should get bonus APY
      const effectiveApy365 = (parseFloat(ethers.utils.formatEther(rewards365Days)) / 1000);
      expect(effectiveApy365).toBeGreaterThan(0.1);
    });

    it('should compound rewards automatically', async () => {
      const principal = ethers.utils.parseEther('1000');
      const rewards = ethers.utils.parseEther('50');
      
      mockContract.getStakeInfo.mockResolvedValue({
        amount: principal,
        timestamp: Date.now() / 1000 - 86400 * 30,
        locked: false,
        pendingRewards: rewards
      });

      const result = await stakingService.compoundRewards(mockSigner);
      
      expect(result.newPrincipal).toEqual(principal.add(rewards));
      expect(result.compoundedAmount).toEqual(rewards);
    });
  });

  describe('Emergency Functions', () => {
    it('should allow emergency withdrawal with penalty', async () => {
      const stakeAmount = ethers.utils.parseEther('1000');
      
      mockContract.getStakeInfo.mockResolvedValue({
        amount: stakeAmount,
        timestamp: Date.now() / 1000,
        locked: true,
        unlockTime: Date.now() / 1000 + 86400 * 7
      });

      const result = await stakingService.emergencyWithdraw(mockSigner);
      
      expect(result.penalty).toBe(0.5); // 50% emergency penalty
      expect(result.amountReceived).toEqual(stakeAmount.div(2));
    });

    it('should pause staking during emergencies', async () => {
      await stakingService.pauseStaking();
      
      await expect(
        stakingService.stake(ethers.utils.parseEther('100'), mockSigner)
      ).rejects.toThrow('Staking is currently paused');
    });

    it('should allow recovery of stuck tokens', async () => {
      const tokenAddress = '0x1111111111111111111111111111111111111111';
      const amount = ethers.utils.parseEther('100');
      
      const result = await stakingService.recoverTokens(
        tokenAddress,
        amount,
        mockSigner
      );
      
      expect(result.success).toBe(true);
      expect(result.recovered).toEqual(amount);
    });
  });

  describe('Integration with Reputation', () => {
    it('should boost reputation based on stake amount', () => {
      const testCases = [
        { stake: 0, boost: 0 },
        { stake: 100, boost: 0 },
        { stake: 500, boost: 2.5 },
        { stake: 1000, boost: 5 },
        { stake: 5000, boost: 12.5 },
        { stake: 10000, boost: 20 }
      ];

      testCases.forEach(({ stake, boost }) => {
        const reputationBoost = stakingService.calculateReputationBoost(
          ethers.utils.parseEther(stake.toString())
        );
        expect(reputationBoost).toBe(boost);
      });
    });

    it('should require minimum stake for reputation levels', () => {
      const levels = {
        bronze: ethers.utils.parseEther('100'),
        silver: ethers.utils.parseEther('500'),
        gold: ethers.utils.parseEther('1000'),
        platinum: ethers.utils.parseEther('5000')
      };

      Object.entries(levels).forEach(([level, requiredStake]) => {
        const hasRequiredStake = stakingService.meetsStakeRequirement(
          requiredStake,
          level as any
        );
        expect(hasRequiredStake).toBe(true);

        const insufficientStake = stakingService.meetsStakeRequirement(
          requiredStake.sub(1),
          level as any
        );
        expect(insufficientStake).toBe(false);
      });
    });
  });

  describe('Events and Monitoring', () => {
    it('should emit staking events', async () => {
      const amount = ethers.utils.parseEther('500');
      const eventListener = vi.fn();
      
      stakingService.on('Staked', eventListener);
      
      await stakingService.stake(amount, mockSigner);
      
      expect(eventListener).toHaveBeenCalledWith({
        user: await mockSigner.getAddress(),
        amount,
        timestamp: expect.any(Number)
      });
    });

    it('should track staking metrics', async () => {
      const metrics = await stakingService.getStakingMetrics();
      
      expect(metrics).toHaveProperty('totalStaked');
      expect(metrics).toHaveProperty('averageStake');
      expect(metrics).toHaveProperty('activeStakers');
      expect(metrics).toHaveProperty('totalRewardsPaid');
    });

    it('should monitor unusual staking patterns', async () => {
      const suspiciousPatterns = await stakingService.detectAnomalies();
      
      expect(suspiciousPatterns).toHaveProperty('rapidStakeChanges');
      expect(suspiciousPatterns).toHaveProperty('concentratedStaking');
      expect(suspiciousPatterns).toHaveProperty('coordinatedActions');
    });
  });

  describe('Gas Optimization', () => {
    it('should batch stake operations efficiently', async () => {
      const operations = [
        { user: '0x1111', amount: ethers.utils.parseEther('100') },
        { user: '0x2222', amount: ethers.utils.parseEther('200') },
        { user: '0x3333', amount: ethers.utils.parseEther('300') }
      ];

      const gasEstimate = await stakingService.estimateBatchGas(operations);
      const individualGas = await stakingService.estimateGas(operations[0]);
      
      expect(gasEstimate).toBeLessThan(individualGas.mul(3));
    });
  });
});