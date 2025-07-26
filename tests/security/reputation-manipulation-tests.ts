/**
 * @fileoverview Security testing scenarios for reputation manipulation
 * @module tests/security/reputation-manipulation-tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'hardhat';
import type { Contract, Signer } from 'ethers';

describe('Reputation System Security Tests', () => {
  let reputationSystem: Contract;
  let stakingToken: Contract;
  let owner: Signer;
  let attacker: Signer;
  let users: Signer[];
  
  beforeEach(async () => {
    [owner, attacker, ...users] = await ethers.getSigners();
    
    // Deploy contracts
    const Token = await ethers.getContractFactory('MockERC20');
    stakingToken = await Token.deploy('Stake Token', 'STK', 18);
    
    const Reputation = await ethers.getContractFactory('ReputationSystemV1');
    reputationSystem = await Reputation.deploy();
    await reputationSystem.initialize(
      stakingToken.address,
      await owner.getAddress(),
      '0x0000000000000000000000000000000000000000' // Mock price feed
    );
  });

  describe('Sybil Attack Prevention', () => {
    it('should prevent multiple accounts from same source boosting reputation', async () => {
      // Create multiple accounts controlled by attacker
      const sybilAccounts = await Promise.all(
        Array(10).fill(0).map(async () => {
          const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
          await owner.sendTransaction({
            to: wallet.address,
            value: ethers.utils.parseEther('1')
          });
          return wallet;
        })
      );

      // Try to boost main account reputation through sybil accounts
      for (const sybil of sybilAccounts) {
        // Attempt to create fake positive interactions
        await expect(
          reputationSystem.connect(sybil).submitReputationEvent(
            await attacker.getAddress(),
            10, // High score boost
            'positive_review',
            ethers.utils.toUtf8Bytes('fake review'),
            '0x' + '00'.repeat(65) // Mock signature
          )
        ).to.be.revertedWith('Insufficient stake for reputation level');
      }
    });

    it('should detect and prevent wash trading patterns', async () => {
      // Setup circular trading between accounts
      const [user1, user2, user3] = users;
      
      // User1 -> User2
      await submitTransaction(user1, user2, 1000);
      
      // User2 -> User3
      await submitTransaction(user2, user3, 1000);
      
      // User3 -> User1 (completing circle)
      await expect(
        submitTransaction(user3, user1, 1000)
      ).to.be.revertedWith('Suspicious interaction pattern');
    });

    it('should enforce minimum stake requirements for reputation levels', async () => {
      const user = users[0];
      
      // Try to gain reputation without staking
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          15,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.be.revertedWith('Insufficient stake for reputation level');
      
      // Stake minimum amount
      await stakingToken.mint(await user.getAddress(), ethers.utils.parseEther('100'));
      await stakingToken.connect(user).approve(
        reputationSystem.address,
        ethers.utils.parseEther('100')
      );
      await reputationSystem.connect(user).stake(ethers.utils.parseEther('100'));
      
      // Now reputation update should work
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.not.be.reverted;
    });
  });

  describe('Collusion Detection', () => {
    it('should detect reciprocal reputation boosting', async () => {
      const [user1, user2] = users;
      
      // Setup stakes
      await setupStake(user1, 500);
      await setupStake(user2, 500);
      
      // Reciprocal boosting attempts
      await submitReputationEvent(user1, user2, 10);
      await submitReputationEvent(user2, user1, 10);
      
      // Third reciprocal should be detected
      await expect(
        submitReputationEvent(user1, user2, 10)
      ).to.be.revertedWith('Rate limit exceeded');
    });

    it('should prevent coordinated timing attacks', async () => {
      const colluders = users.slice(0, 5);
      
      // Setup stakes for all colluders
      await Promise.all(colluders.map(u => setupStake(u, 500)));
      
      // Attempt synchronized reputation updates
      const promises = colluders.map((user, i) => 
        submitReputationEvent(
          user,
          colluders[(i + 1) % colluders.length],
          5
        )
      );
      
      // Some should fail due to rate limiting
      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).to.be.greaterThan(0);
    });

    it('should limit reputation gains from small groups', async () => {
      const group = users.slice(0, 3);
      await Promise.all(group.map(u => setupStake(u, 1000)));
      
      // Create many interactions within small group
      let totalGain = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await submitReputationEvent(
            group[i % 3],
            group[(i + 1) % 3],
            5
          );
          totalGain += 5;
        } catch (e) {
          // Expected to fail after pattern detection
        }
      }
      
      // Total gain should be limited
      expect(totalGain).to.be.lessThan(25); // Less than 5 successful transactions
    });
  });

  describe('Data Integrity Attacks', () => {
    it('should prevent replay attacks', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Capture a valid transaction
      const eventData = {
        user: await user.getAddress(),
        scoreChange: 5,
        eventType: 'transaction_complete',
        evidence: ethers.utils.toUtf8Bytes('valid evidence'),
        signature: '0x' + '00'.repeat(65)
      };
      
      // First submission should succeed
      await reputationSystem.submitReputationEvent(
        eventData.user,
        eventData.scoreChange,
        eventData.eventType,
        eventData.evidence,
        eventData.signature
      );
      
      // Replay attempt should fail
      await expect(
        reputationSystem.submitReputationEvent(
          eventData.user,
          eventData.scoreChange,
          eventData.eventType,
          eventData.evidence,
          eventData.signature
        )
      ).to.be.revertedWith('Rate limit exceeded');
    });

    it('should validate evidence hashes', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Submit event
      await reputationSystem.submitReputationEvent(
        await user.getAddress(),
        5,
        'transaction_complete',
        ethers.utils.toUtf8Bytes('original evidence'),
        '0x' + '00'.repeat(65)
      );
      
      // Get the event and verify evidence hash
      const events = await reputationSystem.queryFilter(
        reputationSystem.filters.ReputationUpdated()
      );
      
      expect(events.length).to.be.greaterThan(0);
      const evidenceHash = events[0].args.evidenceHash;
      
      // Verify hash matches original evidence
      const expectedHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes('original evidence')
      );
      expect(evidenceHash).to.equal(expectedHash);
    });

    it('should maintain merkle tree integrity', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Submit multiple events
      const merkleRoots: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        await reputationSystem.submitReputationEvent(
          await user.getAddress(),
          2,
          'small_transaction',
          ethers.utils.toUtf8Bytes(`evidence ${i}`),
          '0x' + '00'.repeat(65)
        );
        
        const proof = await reputationSystem.getReputationProof(
          await user.getAddress()
        );
        merkleRoots.push(proof.merkleRoot);
        
        // Wait to avoid rate limiting
        await ethers.provider.send('evm_increaseTime', [3600]);
        await ethers.provider.send('evm_mine', []);
      }
      
      // Verify each root is different and builds on previous
      for (let i = 1; i < merkleRoots.length; i++) {
        expect(merkleRoots[i]).to.not.equal(merkleRoots[i - 1]);
      }
    });
  });

  describe('Slashing Security', () => {
    it('should prevent unauthorized slashing', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Attacker tries to slash without role
      await expect(
        reputationSystem.connect(attacker).slash(
          await user.getAddress(),
          50,
          'fake violation'
        )
      ).to.be.revertedWith('AccessControl');
    });

    it('should enforce slashing limits', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Grant slasher role
      await reputationSystem.grantRole(
        await reputationSystem.SLASHER_ROLE(),
        await owner.getAddress()
      );
      
      // Try to slash more than 100%
      await expect(
        reputationSystem.slash(
          await user.getAddress(),
          150,
          'excessive slash'
        )
      ).to.be.revertedWith('Invalid percentage');
    });

    it('should properly update reputation after slashing', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Give user some reputation
      await reputationSystem.submitReputationEvent(
        await user.getAddress(),
        20,
        'initial_reputation',
        ethers.utils.toUtf8Bytes('evidence'),
        '0x' + '00'.repeat(65)
      );
      
      const repBefore = await reputationSystem.getReputation(
        await user.getAddress()
      );
      
      // Slash 50%
      await reputationSystem.grantRole(
        await reputationSystem.SLASHER_ROLE(),
        await owner.getAddress()
      );
      await reputationSystem.slash(
        await user.getAddress(),
        50,
        'violation'
      );
      
      const repAfter = await reputationSystem.getReputation(
        await user.getAddress()
      );
      
      // Reputation should decrease
      expect(repAfter.score).to.be.lessThan(repBefore.score);
      expect(repAfter.stakedAmount).to.equal(
        repBefore.stakedAmount.div(2)
      );
    });
  });

  describe('Rate Limiting and Gaming Prevention', () => {
    it('should enforce rate limits per event type', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // First event should succeed
      await reputationSystem.submitReputationEvent(
        await user.getAddress(),
        5,
        'review_received',
        ethers.utils.toUtf8Bytes('review 1'),
        '0x' + '00'.repeat(65)
      );
      
      // Immediate second event should fail
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          'review_received',
          ethers.utils.toUtf8Bytes('review 2'),
          '0x' + '00'.repeat(65)
        )
      ).to.be.revertedWith('Rate limit exceeded');
      
      // Different event type should work
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          3,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('transaction'),
          '0x' + '00'.repeat(65)
        )
      ).to.not.be.reverted;
    });

    it('should prevent rapid score increases', async () => {
      const user = users[0];
      await setupStake(user, 5000); // High stake for high reputation
      
      // Try large increase on new account
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          15,
          'large_transaction',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.be.revertedWith('Insufficient history for large increase');
    });

    it('should cap maximum reputation score', async () => {
      const user = users[0];
      await setupStake(user, 10000);
      
      // Build history
      for (let i = 0; i < 20; i++) {
        await reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          `event_${i}`,
          ethers.utils.toUtf8Bytes(`evidence ${i}`),
          '0x' + '00'.repeat(65)
        );
        
        await ethers.provider.send('evm_increaseTime', [3600]);
        await ethers.provider.send('evm_mine', []);
      }
      
      const finalRep = await reputationSystem.getReputation(
        await user.getAddress()
      );
      
      expect(finalRep.score).to.equal(100); // MAX_SCORE
    });
  });

  describe('Privacy and Compliance', () => {
    it('should allow reputation freezing for investigation', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Freeze reputation
      await reputationSystem.freezeReputation(
        await user.getAddress(),
        'Suspicious activity detected'
      );
      
      // Try to update frozen reputation
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.be.revertedWith('Reputation frozen');
      
      // Unfreeze
      await reputationSystem.unfreezeReputation(
        await user.getAddress()
      );
      
      // Should work now
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.not.be.reverted;
    });

    it('should maintain audit trail through events', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Create several events
      const eventTypes = ['kyc_verified', 'transaction_complete', 'review_received'];
      
      for (const eventType of eventTypes) {
        await reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          eventType,
          ethers.utils.toUtf8Bytes(`${eventType} evidence`),
          '0x' + '00'.repeat(65)
        );
        
        await ethers.provider.send('evm_increaseTime', [3600]);
        await ethers.provider.send('evm_mine', []);
      }
      
      // Check events are logged
      const filter = reputationSystem.filters.ReputationUpdated(
        await user.getAddress()
      );
      const events = await reputationSystem.queryFilter(filter);
      
      expect(events.length).to.equal(eventTypes.length + 1); // +1 for stake
      
      // Verify event types are recorded
      const recordedTypes = events.map(e => e.args.eventType);
      eventTypes.forEach(type => {
        expect(recordedTypes).to.include(type);
      });
    });
  });

  describe('Emergency Scenarios', () => {
    it('should handle pause/unpause correctly', async () => {
      const user = users[0];
      await setupStake(user, 1000);
      
      // Pause system
      await reputationSystem.pause();
      
      // Operations should fail
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.be.revertedWith('Pausable: paused');
      
      // Unpause
      await reputationSystem.unpause();
      
      // Should work again
      await expect(
        reputationSystem.submitReputationEvent(
          await user.getAddress(),
          5,
          'transaction_complete',
          ethers.utils.toUtf8Bytes('evidence'),
          '0x' + '00'.repeat(65)
        )
      ).to.not.be.reverted;
    });

    it('should allow emergency withdrawal only when paused', async () => {
      // Try emergency withdrawal when not paused
      await expect(
        reputationSystem.emergencyWithdraw(
          stakingToken.address,
          ethers.utils.parseEther('100')
        )
      ).to.be.revertedWith('Must be paused');
      
      // Pause and try again
      await reputationSystem.pause();
      
      // Mint tokens to contract
      await stakingToken.mint(
        reputationSystem.address,
        ethers.utils.parseEther('100')
      );
      
      const treasuryBalanceBefore = await stakingToken.balanceOf(
        await owner.getAddress()
      );
      
      await reputationSystem.emergencyWithdraw(
        stakingToken.address,
        ethers.utils.parseEther('100')
      );
      
      const treasuryBalanceAfter = await stakingToken.balanceOf(
        await owner.getAddress()
      );
      
      expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(
        ethers.utils.parseEther('100')
      );
    });
  });

  // Helper functions
  async function setupStake(user: Signer, amount: number) {
    const amountWei = ethers.utils.parseEther(amount.toString());
    await stakingToken.mint(await user.getAddress(), amountWei);
    await stakingToken.connect(user).approve(reputationSystem.address, amountWei);
    await reputationSystem.connect(user).stake(amountWei);
  }

  async function submitReputationEvent(
    from: Signer,
    to: Signer | string,
    points: number
  ) {
    const toAddress = typeof to === 'string' ? to : await to.getAddress();
    
    return reputationSystem.submitReputationEvent(
      toAddress,
      points,
      'peer_transaction',
      ethers.utils.toUtf8Bytes(`transaction from ${await from.getAddress()}`),
      '0x' + '00'.repeat(65)
    );
  }

  async function submitTransaction(from: Signer, to: Signer, amount: number) {
    // Simulate a transaction that affects reputation
    const toAddress = await to.getAddress();
    
    return reputationSystem.submitReputationEvent(
      toAddress,
      5,
      'transaction_received',
      ethers.utils.toUtf8Bytes(`${amount} from ${await from.getAddress()}`),
      '0x' + '00'.repeat(65)
    );
  }
});