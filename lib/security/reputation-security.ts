/**
 * @fileoverview Reputation System Security Utilities
 * @module lib/security/reputation-security
 * @description Comprehensive security utilities for preventing reputation manipulation
 */

import crypto from 'crypto';
import { z } from 'zod';
import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'js-sha3';
import { differentialPrivacy } from '@/lib/security/privacy-protection';

// ====== TYPES & INTERFACES ======

export interface ReputationEvent {
  id: string;
  userId: string;
  type: ReputationEventType;
  points: number;
  timestamp: number;
  evidence?: Evidence;
  metadata?: Record<string, any>;
}

export enum ReputationEventType {
  TRANSACTION_COMPLETE = 'transaction_complete',
  DISPUTE_WON = 'dispute_won',
  DISPUTE_LOST = 'dispute_lost',
  REVIEW_RECEIVED = 'review_received',
  KYC_VERIFIED = 'kyc_verified',
  STAKE_DEPOSITED = 'stake_deposited',
  COMMUNITY_SERVICE = 'community_service'
}

export interface Evidence {
  type: 'transaction_hash' | 'document' | 'signature' | 'witness';
  data: string;
  hash: string;
  signature?: string;
}

export interface SybilRiskScore {
  score: number; // 0-1, where 1 is highest risk
  factors: {
    ipClustering: number;
    deviceFingerprint: number;
    behaviorPattern: number;
    transactionGraph: number;
    timingAnalysis: number;
  };
  recommendation: 'allow' | 'review' | 'block';
}

export interface ReputationProof {
  merkleRoot: string;
  eventHash: string;
  proof: string[];
  signature: string;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
}

// ====== SCHEMAS ======

const ReputationEventSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(ReputationEventType),
  points: z.number().min(-20).max(20),
  timestamp: z.number().positive(),
  evidence: z.optional(z.object({
    type: z.enum(['transaction_hash', 'document', 'signature', 'witness']),
    data: z.string(),
    hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    signature: z.optional(z.string())
  })),
  metadata: z.optional(z.record(z.any()))
});

// ====== ANTI-SYBIL DETECTION ======

export class SybilDetectionService {
  private readonly ipCache = new Map<string, Set<string>>();
  private readonly deviceCache = new Map<string, Set<string>>();
  private readonly behaviorProfiles = new Map<string, BehaviorProfile>();

  async detectSybilPatterns(userId: string, context: UserContext): Promise<SybilRiskScore> {
    const factors = await Promise.all([
      this.checkIPClustering(userId, context.ip),
      this.analyzeDeviceFingerprint(userId, context.deviceId),
      this.detectBehaviorPatterns(userId, context),
      this.analyzeTransactionGraph(userId),
      this.checkTimingPatterns(userId)
    ]);

    const score = this.calculateRiskScore(factors);
    
    return {
      score,
      factors: {
        ipClustering: factors[0],
        deviceFingerprint: factors[1],
        behaviorPattern: factors[2],
        transactionGraph: factors[3],
        timingAnalysis: factors[4]
      },
      recommendation: this.getRecommendation(score)
    };
  }

  private async checkIPClustering(userId: string, ip: string): Promise<number> {
    // Get IP subnet
    const subnet = this.getSubnet(ip);
    
    // Check how many accounts share this subnet
    if (!this.ipCache.has(subnet)) {
      this.ipCache.set(subnet, new Set());
    }
    
    const subnetUsers = this.ipCache.get(subnet)!;
    subnetUsers.add(userId);
    
    // Calculate clustering score
    const clusterSize = subnetUsers.size;
    if (clusterSize === 1) return 0;
    if (clusterSize <= 3) return 0.3;
    if (clusterSize <= 5) return 0.6;
    return 0.9;
  }

  private async analyzeDeviceFingerprint(userId: string, deviceId: string): Promise<number> {
    if (!this.deviceCache.has(deviceId)) {
      this.deviceCache.set(deviceId, new Set());
    }
    
    const deviceUsers = this.deviceCache.get(deviceId)!;
    deviceUsers.add(userId);
    
    // Multiple accounts on same device is suspicious
    const accountCount = deviceUsers.size;
    if (accountCount === 1) return 0;
    if (accountCount === 2) return 0.5;
    return 0.95;
  }

  private async detectBehaviorPatterns(userId: string, context: UserContext): Promise<number> {
    const profile = this.getBehaviorProfile(userId);
    
    // Analyze typing patterns, mouse movements, etc.
    const consistency = this.calculateBehaviorConsistency(profile, context);
    
    // Low consistency might indicate automated behavior
    return 1 - consistency;
  }

  private async analyzeTransactionGraph(userId: string): Promise<number> {
    // This would connect to a graph database in production
    // For now, return a mock score
    return 0.2;
  }

  private async checkTimingPatterns(userId: string): Promise<number> {
    // Analyze action timing for bot-like patterns
    return 0.1;
  }

  private calculateRiskScore(factors: number[]): number {
    // Weighted average with higher weight on device and IP clustering
    const weights = [0.25, 0.35, 0.2, 0.15, 0.05];
    return factors.reduce((sum, factor, i) => sum + factor * weights[i], 0);
  }

  private getRecommendation(score: number): 'allow' | 'review' | 'block' {
    if (score < 0.3) return 'allow';
    if (score < 0.7) return 'review';
    return 'block';
  }

  private getSubnet(ip: string): string {
    // Extract /24 subnet
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }

  private getBehaviorProfile(userId: string): BehaviorProfile {
    if (!this.behaviorProfiles.has(userId)) {
      this.behaviorProfiles.set(userId, {
        typingSpeed: [],
        mousePatterns: [],
        sessionDurations: [],
        actionSequences: []
      });
    }
    return this.behaviorProfiles.get(userId)!;
  }

  private calculateBehaviorConsistency(profile: BehaviorProfile, context: UserContext): number {
    // Simplified consistency calculation
    return 0.8;
  }
}

// ====== COLLUSION DETECTION ======

export class CollusionDetectionService {
  private readonly transactionGraph = new Map<string, Set<string>>();
  private readonly reciprocalThreshold = 0.2;
  private readonly timeWindow = 30 * 24 * 60 * 60 * 1000; // 30 days

  async detectCollusion(userIds: string[]): Promise<CollusionReport> {
    const patterns = await Promise.all([
      this.detectReciprocal(userIds),
      this.detectCircular(userIds),
      this.detectTiming(userIds),
      this.detectVolumeAnomalies(userIds)
    ]);

    const severity = this.calculateSeverity(patterns);
    
    return {
      detected: patterns.some(p => p.detected),
      patterns: patterns.filter(p => p.detected),
      severity,
      affectedUsers: this.getAffectedUsers(patterns),
      recommendations: this.getRecommendations(patterns, severity)
    };
  }

  private async detectReciprocal(userIds: string[]): Promise<PatternResult> {
    const reciprocalPairs: Array<[string, string]> = [];
    
    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        const user1 = userIds[i];
        const user2 = userIds[j];
        
        const transactions12 = this.getTransactions(user1, user2);
        const transactions21 = this.getTransactions(user2, user1);
        
        if (transactions12 > 0 && transactions21 > 0) {
          const reciprocity = Math.min(transactions12, transactions21) / 
                            Math.max(transactions12, transactions21);
          
          if (reciprocity > this.reciprocalThreshold) {
            reciprocalPairs.push([user1, user2]);
          }
        }
      }
    }
    
    return {
      type: 'reciprocal',
      detected: reciprocalPairs.length > 0,
      confidence: reciprocalPairs.length / (userIds.length * (userIds.length - 1) / 2),
      evidence: reciprocalPairs
    };
  }

  private async detectCircular(userIds: string[]): Promise<PatternResult> {
    // Detect circular trading patterns using DFS
    const cycles: string[][] = [];
    
    for (const startUser of userIds) {
      const visited = new Set<string>();
      const path: string[] = [];
      
      this.findCycles(startUser, startUser, visited, path, cycles, userIds);
    }
    
    return {
      type: 'circular',
      detected: cycles.length > 0,
      confidence: cycles.length > 2 ? 0.9 : cycles.length > 0 ? 0.6 : 0,
      evidence: cycles
    };
  }

  private async detectTiming(userIds: string[]): Promise<PatternResult> {
    // Detect coordinated timing patterns
    const timestamps = userIds.map(userId => this.getActionTimestamps(userId)).flat();
    
    // Look for clustering in time
    const clusters = this.findTimeClusters(timestamps);
    const suspiciousClusters = clusters.filter(c => c.size > userIds.length * 0.5);
    
    return {
      type: 'timing',
      detected: suspiciousClusters.length > 0,
      confidence: suspiciousClusters.length / clusters.length,
      evidence: suspiciousClusters
    };
  }

  private async detectVolumeAnomalies(userIds: string[]): Promise<PatternResult> {
    // Detect unusual transaction volumes between colluding parties
    return {
      type: 'volume',
      detected: false,
      confidence: 0,
      evidence: []
    };
  }

  private getTransactions(from: string, to: string): number {
    // In production, this would query the database
    return 0;
  }

  private findCycles(
    current: string,
    start: string,
    visited: Set<string>,
    path: string[],
    cycles: string[][],
    userIds: string[]
  ): void {
    // Simplified cycle detection
  }

  private getActionTimestamps(userId: string): number[] {
    // In production, query user action timestamps
    return [];
  }

  private findTimeClusters(timestamps: number[]): TimeCluster[] {
    // Cluster timestamps using DBSCAN or similar
    return [];
  }

  private calculateSeverity(patterns: PatternResult[]): 'low' | 'medium' | 'high' | 'critical' {
    const detectedCount = patterns.filter(p => p.detected).length;
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    
    if (detectedCount >= 3 && avgConfidence > 0.8) return 'critical';
    if (detectedCount >= 2 && avgConfidence > 0.6) return 'high';
    if (detectedCount >= 1 && avgConfidence > 0.4) return 'medium';
    return 'low';
  }

  private getAffectedUsers(patterns: PatternResult[]): string[] {
    const users = new Set<string>();
    patterns.forEach(p => {
      if (p.detected && Array.isArray(p.evidence)) {
        p.evidence.flat().forEach(u => users.add(u));
      }
    });
    return Array.from(users);
  }

  private getRecommendations(patterns: PatternResult[], severity: string): string[] {
    const recommendations: string[] = [];
    
    if (severity === 'critical') {
      recommendations.push('Freeze all affected accounts immediately');
      recommendations.push('Initiate full investigation');
    }
    
    if (patterns.some(p => p.type === 'circular' && p.detected)) {
      recommendations.push('Review all transactions in detected cycles');
    }
    
    if (patterns.some(p => p.type === 'timing' && p.detected)) {
      recommendations.push('Analyze IP addresses and device fingerprints');
    }
    
    return recommendations;
  }
}

// ====== REPUTATION EVENT VALIDATION ======

export class ReputationValidationService {
  private readonly maxPointsPerEvent = 20;
  private readonly eventCooldowns = new Map<string, number>();

  validateReputationEvent(event: any): ValidationResult {
    try {
      // Schema validation
      const parsed = ReputationEventSchema.parse(event);
      
      // Business logic validation
      if (!this.validatePointRange(parsed.points, parsed.type)) {
        return { valid: false, error: 'Invalid point value for event type' };
      }
      
      if (!this.validateEventTiming(parsed.userId, parsed.type, parsed.timestamp)) {
        return { valid: false, error: 'Event cooldown not met' };
      }
      
      if (parsed.evidence && !this.validateEvidence(parsed.evidence)) {
        return { valid: false, error: 'Invalid evidence provided' };
      }
      
      // Sanitize metadata
      if (parsed.metadata) {
        parsed.metadata = this.sanitizeMetadata(parsed.metadata);
      }
      
      return { valid: true, sanitized: parsed };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, error: `Schema validation failed: ${error.message}` };
      }
      return { valid: false, error: 'Unknown validation error' };
    }
  }

  private validatePointRange(points: number, type: ReputationEventType): boolean {
    const ranges: Record<ReputationEventType, [number, number]> = {
      [ReputationEventType.TRANSACTION_COMPLETE]: [1, 10],
      [ReputationEventType.DISPUTE_WON]: [3, 5],
      [ReputationEventType.DISPUTE_LOST]: [-10, -5],
      [ReputationEventType.REVIEW_RECEIVED]: [-5, 5],
      [ReputationEventType.KYC_VERIFIED]: [10, 10],
      [ReputationEventType.STAKE_DEPOSITED]: [1, 15],
      [ReputationEventType.COMMUNITY_SERVICE]: [1, 5]
    };
    
    const [min, max] = ranges[type] || [-20, 20];
    return points >= min && points <= max;
  }

  private validateEventTiming(userId: string, type: ReputationEventType, timestamp: number): boolean {
    const key = `${userId}:${type}`;
    const lastEvent = this.eventCooldowns.get(key) || 0;
    
    const cooldowns: Partial<Record<ReputationEventType, number>> = {
      [ReputationEventType.REVIEW_RECEIVED]: 3600000, // 1 hour
      [ReputationEventType.TRANSACTION_COMPLETE]: 300000, // 5 minutes
      [ReputationEventType.COMMUNITY_SERVICE]: 86400000 // 24 hours
    };
    
    const cooldown = cooldowns[type] || 0;
    
    if (timestamp - lastEvent < cooldown) {
      return false;
    }
    
    this.eventCooldowns.set(key, timestamp);
    return true;
  }

  private validateEvidence(evidence: Evidence): boolean {
    // Verify hash matches data
    const calculatedHash = this.calculateHash(evidence.data);
    if (calculatedHash !== evidence.hash) {
      return false;
    }
    
    // Verify signature if provided
    if (evidence.signature) {
      return this.verifySignature(evidence.data, evidence.signature);
    }
    
    return true;
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const allowedKeys = ['transactionId', 'category', 'subcategory', 'tags'];
    
    for (const key of allowedKeys) {
      if (key in metadata) {
        sanitized[key] = this.sanitizeValue(metadata[key]);
      }
    }
    
    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential XSS vectors
      return value.replace(/<[^>]*>/g, '').substring(0, 1000);
    }
    if (Array.isArray(value)) {
      return value.map(v => this.sanitizeValue(v)).slice(0, 100);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      Object.keys(value).slice(0, 50).forEach(k => {
        sanitized[k] = this.sanitizeValue(value[k]);
      });
      return sanitized;
    }
    return value;
  }

  private calculateHash(data: string): string {
    return '0x' + keccak256(data);
  }

  private verifySignature(data: string, signature: string): boolean {
    // In production, verify against known public keys
    return true;
  }
}

// ====== MERKLE TREE PROOFS ======

export class ReputationProofService {
  private readonly trees = new Map<string, MerkleTree>();
  private readonly privateKey = process.env.REPUTATION_SIGNING_KEY!;

  generateReputationProof(userId: string, event: ReputationEvent): ReputationProof {
    // Get or create tree for user
    const tree = this.getUserTree(userId);
    
    // Add event to tree
    const eventHash = this.hashEvent(event);
    const leaves = tree.getLeaves();
    leaves.push(Buffer.from(eventHash.slice(2), 'hex'));
    
    // Rebuild tree with new event
    const newTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    this.trees.set(userId, newTree);
    
    // Generate proof
    const proof = newTree.getProof(eventHash);
    const proofHex = proof.map(p => '0x' + p.data.toString('hex'));
    
    // Sign the proof
    const message = this.createProofMessage(newTree.getRoot().toString('hex'), eventHash);
    const signature = this.signMessage(message);
    
    return {
      merkleRoot: '0x' + newTree.getRoot().toString('hex'),
      eventHash,
      proof: proofHex,
      signature,
      timestamp: Date.now()
    };
  }

  verifyReputationProof(proof: ReputationProof): boolean {
    // Check timestamp
    const age = Date.now() - proof.timestamp;
    if (age > 3600000) return false; // 1 hour expiry
    
    // Verify signature
    const message = this.createProofMessage(proof.merkleRoot, proof.eventHash);
    if (!this.verifyProofSignature(message, proof.signature)) {
      return false;
    }
    
    // Verify Merkle proof
    const proofBuffers = proof.proof.map(p => Buffer.from(p.slice(2), 'hex'));
    const verified = MerkleTree.verify(
      proofBuffers,
      proof.eventHash,
      proof.merkleRoot,
      keccak256,
      { sortPairs: true }
    );
    
    return verified;
  }

  private getUserTree(userId: string): MerkleTree {
    if (!this.trees.has(userId)) {
      this.trees.set(userId, new MerkleTree([], keccak256, { sortPairs: true }));
    }
    return this.trees.get(userId)!;
  }

  private hashEvent(event: ReputationEvent): string {
    const data = JSON.stringify({
      id: event.id,
      userId: event.userId,
      type: event.type,
      points: event.points,
      timestamp: event.timestamp
    });
    return '0x' + keccak256(data);
  }

  private createProofMessage(root: string, eventHash: string): string {
    return `Reputation Proof: root=${root}, event=${eventHash}, time=${Date.now()}`;
  }

  private signMessage(message: string): string {
    const hash = crypto.createHash('sha256').update(message).digest();
    const sign = crypto.createSign('SHA256');
    sign.update(hash);
    return sign.sign(this.privateKey, 'hex');
  }

  private verifyProofSignature(message: string, signature: string): boolean {
    try {
      const hash = crypto.createHash('sha256').update(message).digest();
      const verify = crypto.createVerify('SHA256');
      verify.update(hash);
      
      // In production, use public key from key management service
      const publicKey = this.getPublicKey();
      return verify.verify(publicKey, signature, 'hex');
    } catch {
      return false;
    }
  }

  private getPublicKey(): string {
    // In production, retrieve from secure storage
    return process.env.REPUTATION_PUBLIC_KEY!;
  }
}

// ====== FRAUD DETECTION ALGORITHMS ======

export class ReputationFraudDetector {
  private readonly anomalyThreshold = 0.8;
  private readonly patterns: FraudPattern[] = [];

  async detectFraud(userId: string, recentEvents: ReputationEvent[]): Promise<FraudDetectionResult> {
    const analyses = await Promise.all([
      this.analyzeVelocity(userId, recentEvents),
      this.analyzePatterns(userId, recentEvents),
      this.analyzeBehavior(userId, recentEvents),
      this.analyzeNetwork(userId)
    ]);

    const overallScore = this.calculateFraudScore(analyses);
    
    return {
      fraudScore: overallScore,
      detected: overallScore > this.anomalyThreshold,
      analyses,
      recommendations: this.getRecommendations(overallScore, analyses)
    };
  }

  private async analyzeVelocity(userId: string, events: ReputationEvent[]): Promise<Analysis> {
    // Group events by time buckets
    const hourlyBuckets = new Map<number, number>();
    
    events.forEach(event => {
      const hour = Math.floor(event.timestamp / 3600000);
      hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    });
    
    // Calculate velocity metrics
    const maxHourly = Math.max(...hourlyBuckets.values());
    const avgHourly = Array.from(hourlyBuckets.values()).reduce((a, b) => a + b, 0) / hourlyBuckets.size;
    
    const velocityScore = maxHourly > avgHourly * 3 ? 0.9 : maxHourly > avgHourly * 2 ? 0.6 : 0.2;
    
    return {
      type: 'velocity',
      score: velocityScore,
      details: {
        maxHourlyEvents: maxHourly,
        avgHourlyEvents: avgHourly,
        timespan: hourlyBuckets.size
      }
    };
  }

  private async analyzePatterns(userId: string, events: ReputationEvent[]): Promise<Analysis> {
    // Look for suspicious patterns
    const patterns = [
      this.checkRepeatingSequence(events),
      this.checkUnusualTiming(events),
      this.checkEventDistribution(events)
    ];
    
    const maxPatternScore = Math.max(...patterns);
    
    return {
      type: 'pattern',
      score: maxPatternScore,
      details: {
        repeatingSequence: patterns[0],
        unusualTiming: patterns[1],
        eventDistribution: patterns[2]
      }
    };
  }

  private async analyzeBehavior(userId: string, events: ReputationEvent[]): Promise<Analysis> {
    // Analyze behavioral consistency
    const eventTypes = events.map(e => e.type);
    const uniqueTypes = new Set(eventTypes).size;
    const diversity = uniqueTypes / ReputationEventType.length;
    
    // Low diversity might indicate automated behavior
    const behaviorScore = diversity < 0.2 ? 0.8 : diversity < 0.4 ? 0.5 : 0.2;
    
    return {
      type: 'behavior',
      score: behaviorScore,
      details: {
        eventDiversity: diversity,
        uniqueEventTypes: uniqueTypes,
        totalEvents: events.length
      }
    };
  }

  private async analyzeNetwork(userId: string): Promise<Analysis> {
    // Network analysis would use graph database in production
    return {
      type: 'network',
      score: 0.3,
      details: {
        networkSize: 10,
        centrality: 0.5,
        clustering: 0.2
      }
    };
  }

  private checkRepeatingSequence(events: ReputationEvent[]): number {
    // Detect repeating patterns in event sequences
    const sequence = events.map(e => e.type).join(',');
    
    for (let len = 2; len <= events.length / 2; len++) {
      for (let i = 0; i <= events.length - len * 2; i++) {
        const pattern = sequence.substring(i, i + len);
        const repeatIndex = sequence.indexOf(pattern, i + len);
        
        if (repeatIndex !== -1) {
          return 0.7; // Found repeating pattern
        }
      }
    }
    
    return 0.1;
  }

  private checkUnusualTiming(events: ReputationEvent[]): number {
    // Check for bot-like timing patterns
    const intervals = [];
    
    for (let i = 1; i < events.length; i++) {
      intervals.push(events[i].timestamp - events[i - 1].timestamp);
    }
    
    // Calculate standard deviation
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Low standard deviation suggests automated behavior
    const coefficient = stdDev / avg;
    return coefficient < 0.1 ? 0.9 : coefficient < 0.3 ? 0.6 : 0.2;
  }

  private checkEventDistribution(events: ReputationEvent[]): number {
    // Check if events are distributed naturally
    const typeCounts = new Map<ReputationEventType, number>();
    
    events.forEach(event => {
      typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
    });
    
    // Chi-square test would be used in production
    return 0.3;
  }

  private calculateFraudScore(analyses: Analysis[]): number {
    // Weighted average of all analyses
    const weights = { velocity: 0.3, pattern: 0.35, behavior: 0.25, network: 0.1 };
    
    return analyses.reduce((sum, analysis) => {
      return sum + analysis.score * (weights[analysis.type] || 0.1);
    }, 0);
  }

  private getRecommendations(score: number, analyses: Analysis[]): string[] {
    const recommendations: string[] = [];
    
    if (score > 0.9) {
      recommendations.push('Immediately freeze account and investigate');
    } else if (score > 0.7) {
      recommendations.push('Flag for manual review');
      recommendations.push('Temporarily limit reputation gains');
    }
    
    // Specific recommendations based on analyses
    analyses.forEach(analysis => {
      if (analysis.score > 0.7) {
        switch (analysis.type) {
          case 'velocity':
            recommendations.push('Implement stricter rate limiting');
            break;
          case 'pattern':
            recommendations.push('Review transaction history for automation');
            break;
          case 'behavior':
            recommendations.push('Require additional identity verification');
            break;
          case 'network':
            recommendations.push('Investigate connected accounts');
            break;
        }
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }
}

// ====== ANTI-GAMING SCORE CALCULATIONS ======

export class AntiGamingCalculator {
  private readonly diminishingReturns = new Map<string, DRState>();
  
  calculateAdjustedScore(
    userId: string,
    basePoints: number,
    eventType: ReputationEventType,
    context: ScoreContext
  ): number {
    // Apply multiple adjustment factors
    const factors = [
      this.applyDiminishingReturns(userId, eventType),
      this.applyDiversityBonus(context),
      this.applyVolumeAdjustment(context),
      this.applyTimeDecay(context),
      this.applyNetworkEffect(context)
    ];
    
    // Calculate final score
    const adjustmentFactor = factors.reduce((product, factor) => product * factor, 1);
    const adjustedScore = basePoints * adjustmentFactor;
    
    // Ensure minimum points for legitimate actions
    const minPoints = this.getMinimumPoints(eventType);
    return Math.max(adjustedScore, minPoints);
  }

  private applyDiminishingReturns(userId: string, eventType: ReputationEventType): number {
    const key = `${userId}:${eventType}`;
    
    if (!this.diminishingReturns.has(key)) {
      this.diminishingReturns.set(key, {
        count: 0,
        lastReset: Date.now()
      });
    }
    
    const state = this.diminishingReturns.get(key)!;
    
    // Reset counter after 24 hours
    if (Date.now() - state.lastReset > 86400000) {
      state.count = 0;
      state.lastReset = Date.now();
    }
    
    state.count++;
    
    // Exponential decay formula
    return Math.pow(0.9, Math.max(0, state.count - 1));
  }

  private applyDiversityBonus(context: ScoreContext): number {
    const uniqueCounterparties = new Set(context.recentTransactions.map(t => t.counterparty)).size;
    const totalTransactions = context.recentTransactions.length;
    
    if (totalTransactions === 0) return 1;
    
    const diversity = uniqueCounterparties / totalTransactions;
    return 0.5 + (diversity * 0.5); // 50% to 100% based on diversity
  }

  private applyVolumeAdjustment(context: ScoreContext): number {
    const volume = context.transactionVolume;
    
    // Logarithmic scaling to prevent gaming with large volumes
    if (volume <= 1000) return 1;
    if (volume <= 10000) return 1.1;
    if (volume <= 100000) return 1.2;
    return 1.3; // Cap at 30% bonus
  }

  private applyTimeDecay(context: ScoreContext): number {
    const hoursSinceLastEvent = (Date.now() - context.lastEventTime) / 3600000;
    
    // Encourage spacing between events
    if (hoursSinceLastEvent < 1) return 0.5;
    if (hoursSinceLastEvent < 6) return 0.8;
    if (hoursSinceLastEvent < 24) return 1;
    return 1.1; // Small bonus for patient users
  }

  private applyNetworkEffect(context: ScoreContext): number {
    // Reward users who interact with high-reputation users
    const avgCounterpartyRep = context.counterpartyReputations.reduce((a, b) => a + b, 0) / 
                              context.counterpartyReputations.length || 0;
    
    if (avgCounterpartyRep >= 80) return 1.2;
    if (avgCounterpartyRep >= 60) return 1.1;
    if (avgCounterpartyRep >= 40) return 1;
    return 0.9; // Penalty for interacting with low-rep users
  }

  private getMinimumPoints(eventType: ReputationEventType): number {
    const minimums: Partial<Record<ReputationEventType, number>> = {
      [ReputationEventType.TRANSACTION_COMPLETE]: 0.1,
      [ReputationEventType.KYC_VERIFIED]: 10, // Always full points for KYC
      [ReputationEventType.STAKE_DEPOSITED]: 1
    };
    
    return minimums[eventType] || 0;
  }
}

// ====== TYPES ======

interface UserContext {
  ip: string;
  deviceId: string;
  userAgent: string;
  timestamp: number;
}

interface BehaviorProfile {
  typingSpeed: number[];
  mousePatterns: Array<{ x: number; y: number; time: number }>;
  sessionDurations: number[];
  actionSequences: string[];
}

interface CollusionReport {
  detected: boolean;
  patterns: PatternResult[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: string[];
  recommendations: string[];
}

interface PatternResult {
  type: 'reciprocal' | 'circular' | 'timing' | 'volume';
  detected: boolean;
  confidence: number;
  evidence: any;
}

interface TimeCluster {
  center: number;
  size: number;
  members: number[];
}

interface FraudPattern {
  name: string;
  detection: (events: ReputationEvent[]) => number;
}

interface FraudDetectionResult {
  fraudScore: number;
  detected: boolean;
  analyses: Analysis[];
  recommendations: string[];
}

interface Analysis {
  type: string;
  score: number;
  details: Record<string, any>;
}

interface ScoreContext {
  recentTransactions: Array<{ counterparty: string; amount: number }>;
  transactionVolume: number;
  lastEventTime: number;
  counterpartyReputations: number[];
}

interface DRState {
  count: number;
  lastReset: number;
}

// ====== EXPORTS ======

export const reputationSecurity = {
  sybilDetection: new SybilDetectionService(),
  collusionDetection: new CollusionDetectionService(),
  validation: new ReputationValidationService(),
  proofService: new ReputationProofService(),
  fraudDetector: new ReputationFraudDetector(),
  antiGaming: new AntiGamingCalculator()
};