/**
 * @fileoverview Integration tests for multi-user reputation interactions
 * @module tests/integration/reputation/MultiUserInteractions.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser, cleanupTestData } from '@/tests/utils/testHelpers';
import { ReputationService } from '@/services/reputation/ReputationService';
import { TransactionService } from '@/services/TransactionService';
import { NetworkAnalysisService } from '@/services/reputation/NetworkAnalysisService';
import { CollusionDetectionService } from '@/lib/security/reputation-security';
import { CommunityService } from '@/services/CommunityService';
import type { User, ReputationNetwork, TrustGraph } from '@/types';

describe('Multi-User Reputation Interactions', () => {
  let reputationService: ReputationService;
  let transactionService: TransactionService;
  let networkAnalysis: NetworkAnalysisService;
  let collusionDetection: CollusionDetectionService;
  let communityService: CommunityService;
  let testUsers: User[];
  let testCommunity: any;

  beforeEach(async () => {
    // Initialize services
    reputationService = new ReputationService();
    transactionService = new TransactionService();
    networkAnalysis = new NetworkAnalysisService();
    collusionDetection = new CollusionDetectionService();
    communityService = new CommunityService();

    // Create diverse user network
    testUsers = await Promise.all([
      // Hub users (high connectivity)
      createTestUser({ name: 'HubAlice', initialReputation: 85, type: 'merchant' }),
      createTestUser({ name: 'HubBob', initialReputation: 75, type: 'merchant' }),
      
      // Regular users
      createTestUser({ name: 'User1', initialReputation: 50 }),
      createTestUser({ name: 'User2', initialReputation: 45 }),
      createTestUser({ name: 'User3', initialReputation: 55 }),
      createTestUser({ name: 'User4', initialReputation: 40 }),
      
      // New users
      createTestUser({ name: 'NewUser1', initialReputation: 10 }),
      createTestUser({ name: 'NewUser2', initialReputation: 10 }),
      
      // Suspicious users
      createTestUser({ name: 'SusUser1', initialReputation: 30 }),
      createTestUser({ name: 'SusUser2', initialReputation: 30 })
    ]);

    // Create test community
    testCommunity = await communityService.create({
      name: 'Test Marketplace',
      type: 'marketplace',
      members: testUsers.map(u => u.id)
    });
  });

  afterEach(async () => {
    await cleanupTestData(testUsers);
    vi.clearAllMocks();
  });

  describe('Network Effects and Trust Propagation', () => {
    it('should build trust network through successful transactions', async () => {
      const [hubAlice, hubBob, ...regularUsers] = testUsers;
      
      // Create hub-spoke transaction pattern
      // Hub users transact with many others
      for (const user of regularUsers.slice(0, 4)) {
        // Alice sells to regular users
        const tx1 = await transactionService.create({
          seller: hubAlice.id,
          buyer: user.id,
          amount: 1000,
          escrowType: 'standard'
        });
        await transactionService.complete(tx1.id);

        // Regular users buy from Bob
        const tx2 = await transactionService.create({
          seller: hubBob.id,
          buyer: user.id,
          amount: 800,
          escrowType: 'standard'
        });
        await transactionService.complete(tx2.id);
      }

      // Analyze network structure
      const network = await networkAnalysis.buildTrustNetwork(testCommunity.id);
      
      expect(network.nodes).toHaveLength(10);
      expect(network.edges.length).toBeGreaterThan(8);
      
      // Check hub centrality
      const aliceCentrality = network.centrality[hubAlice.id];
      const bobCentrality = network.centrality[hubBob.id];
      
      expect(aliceCentrality).toBeGreaterThan(0.5);
      expect(bobCentrality).toBeGreaterThan(0.4);

      // Regular users should have lower centrality
      regularUsers.forEach(user => {
        expect(network.centrality[user.id]).toBeLessThan(0.3);
      });

      // Trust propagation
      const trustPaths = await networkAnalysis.findTrustPaths(
        regularUsers[0].id,
        regularUsers[1].id
      );
      
      expect(trustPaths.length).toBeGreaterThan(0);
      expect(trustPaths[0].path).toContain(hubAlice.id); // Through hub
    });

    it('should calculate network-based reputation bonuses', async () => {
      const [hubAlice, , user1, user2] = testUsers;
      
      // Build network connections
      const transactions = [
        { seller: hubAlice.id, buyer: user1.id },
        { seller: user1.id, buyer: user2.id },
        { seller: hubAlice.id, buyer: user2.id }
      ];

      for (const tx of transactions) {
        const transaction = await transactionService.create({
          ...tx,
          amount: 1000,
          escrowType: 'standard'
        });
        await transactionService.complete(transaction.id);
      }

      // Calculate network bonuses
      const user1Rep = await reputationService.getReputation(user1.id);
      const user2Rep = await reputationService.getReputation(user2.id);

      // User1 connected to high-rep hub should get bonus
      expect(user1Rep.networkBonus).toBeGreaterThan(0);
      expect(user1Rep.trustedConnections).toContain(hubAlice.id);
      
      // User2 has multiple paths to trust
      expect(user2Rep.trustPaths).toBeGreaterThan(1);
      expect(user2Rep.networkStrength).toBeGreaterThan(user1Rep.networkStrength);
    });

    it('should detect and reward bridge users', async () => {
      // Create two separate clusters
      const cluster1 = testUsers.slice(0, 3);
      const cluster2 = testUsers.slice(3, 6);
      const bridgeUser = testUsers[6]; // NewUser1 will bridge

      // Build cluster 1
      for (let i = 0; i < cluster1.length - 1; i++) {
        const tx = await transactionService.create({
          seller: cluster1[i].id,
          buyer: cluster1[i + 1].id,
          amount: 500,
          escrowType: 'standard'
        });
        await transactionService.complete(tx.id);
      }

      // Build cluster 2
      for (let i = 0; i < cluster2.length - 1; i++) {
        const tx = await transactionService.create({
          seller: cluster2[i].id,
          buyer: cluster2[i + 1].id,
          amount: 500,
          escrowType: 'standard'
        });
        await transactionService.complete(tx.id);
      }

      // Bridge user connects both clusters
      const bridge1 = await transactionService.create({
        seller: cluster1[2].id,
        buyer: bridgeUser.id,
        amount: 1000,
        escrowType: 'standard'
      });
      await transactionService.complete(bridge1.id);

      const bridge2 = await transactionService.create({
        seller: bridgeUser.id,
        buyer: cluster2[0].id,
        amount: 1000,
        escrowType: 'standard'
      });
      await transactionService.complete(bridge2.id);

      // Analyze bridge importance
      const network = await networkAnalysis.buildTrustNetwork(testCommunity.id);
      const bridgeMetrics = await networkAnalysis.calculateBridgeScore(bridgeUser.id);

      expect(bridgeMetrics.isBridge).toBe(true);
      expect(bridgeMetrics.connectedClusters).toBe(2);
      expect(bridgeMetrics.bridgeImportance).toBeGreaterThan(0.5);

      // Bridge users get reputation bonus
      const bridgeRep = await reputationService.getReputation(bridgeUser.id);
      expect(bridgeRep.bridgeBonus).toBeGreaterThan(0);
      expect(bridgeRep.communityRole).toBe('connector');
    });
  });

  describe('Collusion and Manipulation Detection', () => {
    it('should detect wash trading rings', async () => {
      const suspiciousUsers = testUsers.slice(-4); // Last 4 users
      
      // Create circular trading pattern with high frequency
      const ringTransactions = [];
      
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < suspiciousUsers.length; i++) {
          const seller = suspiciousUsers[i];
          const buyer = suspiciousUsers[(i + 1) % suspiciousUsers.length];
          
          const tx = await transactionService.create({
            seller: seller.id,
            buyer: buyer.id,
            amount: 100 + round * 10, // Varying amounts
            escrowType: 'instant'
          });
          
          await transactionService.complete(tx.id);
          ringTransactions.push({
            seller: seller.id,
            buyer: buyer.id,
            timestamp: Date.now()
          });
        }
      }

      // Run collusion detection
      const collusionReport = await collusionDetection.detectCollusion(
        suspiciousUsers.map(u => u.id)
      );

      expect(collusionReport.detected).toBe(true);
      expect(collusionReport.patterns).toContainEqual(
        expect.objectContaining({ type: 'circular' })
      );
      expect(collusionReport.severity).toBe('high');

      // Check reputation impacts
      for (const user of suspiciousUsers) {
        const rep = await reputationService.getReputation(user.id);
        expect(rep.flags).toContain('wash_trading_suspected');
        expect(rep.trustScore).toBeLessThan(0.3);
        expect(rep.tradingRestrictions).toBeDefined();
      }

      // Network should isolate suspicious cluster
      const network = await networkAnalysis.buildTrustNetwork(testCommunity.id);
      const suspiciousCluster = network.clusters.find(c => 
        c.members.includes(suspiciousUsers[0].id)
      );
      
      expect(suspiciousCluster?.isolated).toBe(true);
      expect(suspiciousCluster?.trustScore).toBeLessThan(0.2);
    });

    it('should detect reputation farming through micro-transactions', async () => {
      const [farmer1, farmer2] = testUsers.slice(-2);
      
      // Create many small reciprocal transactions
      const microTransactions = [];
      
      for (let i = 0; i < 50; i++) {
        const tx1 = await transactionService.create({
          seller: farmer1.id,
          buyer: farmer2.id,
          amount: 1, // Minimum amount
          escrowType: 'instant'
        });
        
        const tx2 = await transactionService.create({
          seller: farmer2.id,
          buyer: farmer1.id,
          amount: 1,
          escrowType: 'instant'
        });
        
        await transactionService.complete(tx1.id);
        await transactionService.complete(tx2.id);
        
        microTransactions.push(tx1.id, tx2.id);
      }

      // Check anti-gaming measures applied
      const farmer1Rep = await reputationService.getReputation(farmer1.id);
      const farmer2Rep = await reputationService.getReputation(farmer2.id);

      // Should not have gained much reputation despite 50 transactions
      expect(farmer1Rep.score).toBeLessThan(40);
      expect(farmer2Rep.score).toBeLessThan(40);
      
      // Should be flagged
      expect(farmer1Rep.flags).toContain('micro_transaction_abuse');
      expect(farmer2Rep.flags).toContain('reciprocal_trading');
      
      // Diminishing returns applied
      expect(farmer1Rep.diminishingReturnsActive).toBe(true);
      expect(farmer1Rep.effectivePointsMultiplier).toBeLessThan(0.1);
    });

    it('should detect sybil networks', async () => {
      // Create sybil accounts
      const sybilController = testUsers[8];
      const sybilAccounts = await Promise.all(
        Array(5).fill(null).map((_, i) => 
          createTestUser({
            name: `Sybil${i}`,
            initialReputation: 0,
            ip: '192.168.1.100', // Same IP
            deviceId: 'device-123' // Same device
          })
        )
      );

      // Sybil accounts boost controller's reputation
      for (const sybil of sybilAccounts) {
        // Give positive reviews
        await reputationService.submitReview({
          reviewer: sybil.id,
          reviewed: sybilController.id,
          rating: 5,
          transactionId: null, // Fake review
          comment: 'Great seller!'
        });

        // Small transactions
        const tx = await transactionService.create({
          seller: sybilController.id,
          buyer: sybil.id,
          amount: 10,
          escrowType: 'instant'
        });
        await transactionService.complete(tx.id);
      }

      // Run sybil detection
      const sybilAnalysis = await networkAnalysis.detectSybilClusters(
        testCommunity.id
      );

      expect(sybilAnalysis.suspectedSybils).toContain(sybilController.id);
      sybilAccounts.forEach(sybil => {
        expect(sybilAnalysis.suspectedSybils).toContain(sybil.id);
      });

      // Check reputation nullified
      const controllerRep = await reputationService.getReputation(
        sybilController.id
      );
      
      expect(controllerRep.sybilRiskScore).toBeGreaterThan(0.8);
      expect(controllerRep.validReviews).toBe(0); // Reviews invalidated
      expect(controllerRep.flags).toContain('sybil_network_detected');
    });
  });

  describe('Community Dynamics', () => {
    it('should track community reputation trends', async () => {
      // Simulate community activity over time
      const timeSlots = 5;
      const communityMetrics = [];

      for (let slot = 0; slot < timeSlots; slot++) {
        // Different activity levels
        const transactions = slot * 10; // Increasing activity
        
        for (let i = 0; i < transactions; i++) {
          const seller = testUsers[i % 6];
          const buyer = testUsers[(i + 1) % 6];
          
          const tx = await transactionService.create({
            seller: seller.id,
            buyer: buyer.id,
            amount: 100 + Math.random() * 900,
            escrowType: 'standard'
          });
          
          // Most complete successfully
          if (Math.random() > 0.1) {
            await transactionService.complete(tx.id);
          } else {
            // Some disputes
            await disputeService.create({
              transactionId: tx.id,
              initiator: buyer.id,
              reason: 'Issue'
            });
          }
        }

        // Collect metrics
        const metrics = await communityService.calculateMetrics(testCommunity.id);
        communityMetrics.push({
          slot,
          ...metrics
        });

        // Advance time
        vi.setSystemTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      // Analyze trends
      const trends = await communityService.analyzeTrends(
        testCommunity.id,
        communityMetrics
      );

      expect(trends.activityTrend).toBe('increasing');
      expect(trends.trustTrend).toBe('stable');
      expect(trends.growthRate).toBeGreaterThan(0);
      expect(trends.healthScore).toBeGreaterThan(0.7);

      // Community reputation affects individuals
      for (const user of testUsers.slice(0, 6)) {
        const rep = await reputationService.getReputation(user.id);
        expect(rep.communityBonus).toBeGreaterThan(0);
        expect(rep.communityHealth).toBeGreaterThan(0.7);
      }
    });

    it('should identify and reward community leaders', async () => {
      const [hubAlice, hubBob] = testUsers;
      
      // Leaders help new users
      const newUsers = testUsers.slice(6, 8);
      
      for (const newUser of newUsers) {
        // Mentorship transactions
        await transactionService.create({
          seller: hubAlice.id,
          buyer: newUser.id,
          amount: 50,
          type: 'mentorship',
          escrowType: 'standard'
        });

        // Endorsements
        await reputationService.endorse({
          endorser: hubAlice.id,
          endorsed: newUser.id,
          skill: 'trading',
          stake: 100
        });
      }

      // Community service
      await communityService.recordContribution({
        userId: hubAlice.id,
        type: 'guide_created',
        value: 10
      });

      await communityService.recordContribution({
        userId: hubAlice.id,
        type: 'dispute_mediation',
        value: 5
      });

      // Calculate leadership scores
      const leaderboard = await communityService.getLeaderboard(
        testCommunity.id
      );

      expect(leaderboard[0].userId).toBe(hubAlice.id);
      expect(leaderboard[0].leadershipScore).toBeGreaterThan(0.8);
      expect(leaderboard[0].contributions).toBeGreaterThan(15);

      // Leaders get reputation bonuses
      const aliceRep = await reputationService.getReputation(hubAlice.id);
      expect(aliceRep.leadershipBonus).toBeGreaterThan(0);
      expect(aliceRep.communityRole).toBe('leader');
      expect(aliceRep.influence).toBeGreaterThan(1.5);
    });

    it('should handle reputation contagion in disputes', async () => {
      // Create interconnected transaction network
      const group = testUsers.slice(2, 6);
      const transactions = [];
      
      // Everyone transacts with everyone
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const tx = await transactionService.create({
            seller: group[i].id,
            buyer: group[j].id,
            amount: 1000,
            escrowType: 'standard'
          });
          await transactionService.complete(tx.id);
          transactions.push(tx);
        }
      }

      // One member has major dispute
      const badActor = group[1];
      const victim = testUsers[0]; // High rep user
      
      const disputeTx = await transactionService.create({
        seller: badActor.id,
        buyer: victim.id,
        amount: 10000,
        escrowType: 'standard'
      });

      const dispute = await disputeService.create({
        transactionId: disputeTx.id,
        initiator: victim.id,
        reason: 'Fraud',
        evidence: ['proof.pdf']
      });

      await disputeService.resolve(dispute.id, {
        winner: victim.id,
        finding: 'fraud',
        severity: 'high'
      });

      // Check contagion effects
      const groupReps = await Promise.all(
        group.map(user => reputationService.getReputation(user.id))
      );

      // Bad actor severely impacted
      const badActorRep = groupReps[1];
      expect(badActorRep.score).toBeLessThan(20);
      expect(badActorRep.flags).toContain('fraud_confirmed');

      // Others partially affected based on connection strength
      groupReps.forEach((rep, i) => {
        if (i !== 1) { // Not the bad actor
          expect(rep.contagionImpact).toBeLessThan(0);
          expect(rep.warnings).toContain('connected_to_fraudulent_user');
          expect(rep.trustScore).toBeLessThan(1.0);
        }
      });

      // Network analysis shows risk
      const riskAnalysis = await networkAnalysis.assessNetworkRisk(
        group.map(u => u.id)
      );
      
      expect(riskAnalysis.overallRisk).toBe('high');
      expect(riskAnalysis.recommendations).toContain(
        'Review all transactions with flagged user'
      );
    });
  });

  describe('Reputation Recovery and Rehabilitation', () => {
    it('should support reputation recovery programs', async () => {
      const recoveryUser = testUsers[9]; // Start with low rep
      
      // User enters recovery program after violation
      await reputationService.enterRecoveryProgram(recoveryUser.id, {
        reason: 'dispute_abuse',
        duration: 90, // 90 days
        requirements: {
          minTransactions: 20,
          noDisputes: true,
          communityService: 10,
          educationModules: ['trading_ethics', 'dispute_resolution']
        }
      });

      // Complete education
      await communityService.completeEducation(recoveryUser.id, 'trading_ethics');
      await communityService.completeEducation(recoveryUser.id, 'dispute_resolution');

      // Perform good transactions
      for (let i = 0; i < 20; i++) {
        const partner = testUsers[i % 5];
        const tx = await transactionService.create({
          seller: i % 2 === 0 ? recoveryUser.id : partner.id,
          buyer: i % 2 === 0 ? partner.id : recoveryUser.id,
          amount: 100 + i * 10,
          escrowType: 'standard'
        });
        await transactionService.complete(tx.id);
        
        // Add delays to show consistent behavior
        vi.setSystemTime(Date.now() + 4 * 24 * 60 * 60 * 1000);
      }

      // Community service
      for (let i = 0; i < 10; i++) {
        await communityService.recordContribution({
          userId: recoveryUser.id,
          type: 'help_newbie',
          value: 1
        });
      }

      // Check recovery progress
      const progress = await reputationService.getRecoveryProgress(
        recoveryUser.id
      );

      expect(progress.completed).toBe(true);
      expect(progress.transactionsCompleted).toBe(20);
      expect(progress.disputesCreated).toBe(0);
      expect(progress.communityServiceHours).toBe(10);
      expect(progress.educationCompleted).toBe(2);

      // Graduate from program
      const finalRep = await reputationService.graduateRecovery(recoveryUser.id);
      
      expect(finalRep.score).toBeGreaterThan(50);
      expect(finalRep.flags).not.toContain('dispute_abuse');
      expect(finalRep.badges).toContain('rehabilitation_complete');
      expect(finalRep.trustScore).toBeGreaterThan(0.6);
    });

    it('should handle reputation insurance and guarantees', async () => {
      const [insurer, insured] = testUsers;
      
      // High rep user provides reputation insurance
      await reputationService.provideInsurance({
        insurer: insurer.id,
        insured: insured.id,
        amount: 1000,
        coverage: 0.8, // 80% coverage
        duration: 30, // 30 days
        premium: 50
      });

      // Insured user has dispute
      const tx = await transactionService.create({
        seller: insured.id,
        buyer: testUsers[2].id,
        amount: 800,
        escrowType: 'standard'
      });

      const dispute = await disputeService.create({
        transactionId: tx.id,
        initiator: testUsers[2].id,
        reason: 'Not delivered'
      });

      // Insured loses dispute
      await disputeService.resolve(dispute.id, {
        winner: testUsers[2].id,
        refundAmount: 800
      });

      // Check insurance activation
      const claim = await reputationService.processInsuranceClaim({
        disputeId: dispute.id,
        insuredId: insured.id
      });

      expect(claim.paid).toBe(true);
      expect(claim.amount).toBe(640); // 80% of 800
      expect(claim.reputationProtected).toBe(true);

      // Insured reputation partially protected
      const insuredRep = await reputationService.getReputation(insured.id);
      expect(insuredRep.score).toBeGreaterThan(35); // Protected from full loss
      expect(insuredRep.insuranceUsed).toBe(1);

      // Insurer reputation affected but rewarded for providing insurance
      const insurerRep = await reputationService.getReputation(insurer.id);
      expect(insurerRep.score).toBeGreaterThan(80); // Small impact
      expect(insurerRep.insuranceProvided).toBe(1);
      expect(insurerRep.premiumsEarned).toBe(50);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large-scale reputation calculations efficiently', async () => {
      // Create large user base
      const largeUserSet = await Promise.all(
        Array(100).fill(null).map((_, i) =>
          createTestUser({
            name: `User${i}`,
            initialReputation: 20 + Math.random() * 60
          })
        )
      );

      // Generate random transaction network
      const start = performance.now();
      const transactions = [];
      
      for (let i = 0; i < 500; i++) {
        const seller = largeUserSet[Math.floor(Math.random() * 100)];
        const buyer = largeUserSet[Math.floor(Math.random() * 100)];
        
        if (seller.id !== buyer.id) {
          const tx = await transactionService.create({
            seller: seller.id,
            buyer: buyer.id,
            amount: Math.floor(Math.random() * 1000) + 100,
            escrowType: 'instant'
          });
          transactions.push(tx);
        }
      }

      // Complete transactions concurrently
      await Promise.all(
        transactions.map(tx => transactionService.complete(tx.id))
      );

      const transactionTime = performance.now() - start;
      expect(transactionTime).toBeLessThan(10000); // Under 10 seconds

      // Calculate network metrics
      const metricsStart = performance.now();
      
      const networkAnalysisResult = await networkAnalysis.analyzeFullNetwork(
        largeUserSet.map(u => u.id)
      );
      
      const metricsTime = performance.now() - metricsStart;
      expect(metricsTime).toBeLessThan(5000); // Under 5 seconds

      expect(networkAnalysisResult.nodes).toBe(100);
      expect(networkAnalysisResult.edges).toBeGreaterThan(400);
      expect(networkAnalysisResult.averageDegree).toBeGreaterThan(4);

      // Bulk reputation updates
      const updateStart = performance.now();
      
      const reputationUpdates = await Promise.all(
        largeUserSet.map(user => 
          reputationService.recalculateReputation(user.id)
        )
      );
      
      const updateTime = performance.now() - updateStart;
      expect(updateTime).toBeLessThan(3000); // Under 3 seconds

      // Cleanup
      await cleanupTestData(largeUserSet);
    });
  });
});