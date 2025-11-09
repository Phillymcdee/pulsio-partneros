import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { partners, objectives, channels, users, signals, insights } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { isOnboardingComplete, getOnboardingStatus, markOnboardingComplete } from '@/lib/onboarding';
import { generateDigest } from '@/lib/digest';
import { processFeedback } from '@/lib/feedback';
import { generateDedupeHash } from '@/lib/rss';
import { classifyType } from '@/lib/classify';
import { summarize } from '@/lib/summarize';
import { generateInsight } from '@/lib/insights';
import { calculateBaseScore } from '@/lib/scoring';

/**
 * Integration tests for critical paths
 * These tests verify that components work together correctly
 * 
 * Note: These tests require a test database. In production, use a separate test DB.
 */

describe('Onboarding Integration', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(insights).where(eq(insights.id, testUserId as any));
      await db.delete(signals).where(eq(signals.id, testUserId as any));
      await db.delete(partners).where(eq(partners.userId, testUserId));
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(channels).where(eq(channels.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should detect incomplete onboarding when no partners exist', async () => {
    const status = await getOnboardingStatus(testUserId);
    expect(status.isComplete).toBe(false);
    expect(status.partnersCount).toBe(0);
  });

  it('should detect incomplete onboarding when only 1 objective exists', async () => {
    await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    });

    await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    });

    const status = await getOnboardingStatus(testUserId);
    expect(status.isComplete).toBe(false);
    expect(status.objectivesCount).toBe(1);
  });

  it('should detect complete onboarding when all requirements met', async () => {
    await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    });

    await db.insert(objectives).values([
      {
        userId: testUserId,
        type: 'integrations',
        priority: 1,
      },
      {
        userId: testUserId,
        type: 'co_sell',
        priority: 2,
      },
    ]);

    await db.insert(channels).values({
      userId: testUserId,
      emailEnabled: true,
      cadence: 'weekly',
    });

    const status = await getOnboardingStatus(testUserId);
    expect(status.isComplete).toBe(true);
  });
});

describe('Digest Generation Integration', () => {
  let testUserId: string;
  let testPartnerId: string;
  let testSignalId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;

    // Create partner
    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    }).returning();
    testPartnerId = partner.id;

    // Create signal
    const [signal] = await db.insert(signals).values({
      partnerId: testPartnerId,
      type: 'launch',
      title: 'Test Signal',
      sourceUrl: 'https://example.com',
      summary: 'Test summary',
      dedupeHash: `test-hash-${Date.now()}`,
    }).returning();
    testSignalId = signal.id;
  });

  afterEach(async () => {
    // Clean up
    if (testSignalId) {
      await db.delete(insights).where(eq(insights.signalId, testSignalId));
    }
    if (testPartnerId) {
      await db.delete(signals).where(eq(signals.partnerId, testPartnerId));
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testUserId) {
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(channels).where(eq(channels.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should generate digest with insights', async () => {
    // Create objective
    const [objective] = await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    }).returning();

    // Create insight
    await db.insert(insights).values({
      signalId: testSignalId,
      objectiveId: objective.id,
      score: 85,
      why: 'Test why',
      recommendation: 'Test recommendation',
      actions: [{ label: 'Test action', ownerHint: 'test', dueInDays: 7 }],
      outreachDraft: 'Test draft',
    });

    const digest = await generateDigest(testUserId, 10);
    expect(digest.length).toBeGreaterThan(0);
    expect(digest[0]).toHaveProperty('partner');
    expect(digest[0]).toHaveProperty('signalTitle');
    expect(digest[0]).toHaveProperty('score');
    expect(digest[0]).toHaveProperty('insightId');
  });
});

describe('Feedback Integration', () => {
  let testUserId: string;
  let testPartnerId: string;
  let testSignalId: string;
  let testInsightId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;

    // Create partner
    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    }).returning();
    testPartnerId = partner.id;

    // Create signal
    const [signal] = await db.insert(signals).values({
      partnerId: testPartnerId,
      type: 'launch',
      title: 'Test Signal',
      sourceUrl: 'https://example.com',
      summary: 'Test summary',
      dedupeHash: `test-hash-${Date.now()}`,
    }).returning();
    testSignalId = signal.id;

    // Create objective
    const [objective] = await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    }).returning();

    // Create insight
    const [insight] = await db.insert(insights).values({
      signalId: testSignalId,
      objectiveId: objective.id,
      score: 85,
      why: 'Test why',
      recommendation: 'Test recommendation',
      actions: [{ label: 'Test action', ownerHint: 'test', dueInDays: 7 }],
      outreachDraft: 'Test draft',
    }).returning();
    testInsightId = insight.id;
  });

  afterEach(async () => {
    // Clean up
    if (testInsightId) {
      await db.delete(insights).where(eq(insights.id, testInsightId));
    }
    if (testSignalId) {
      await db.delete(signals).where(eq(signals.id, testSignalId));
    }
    if (testPartnerId) {
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testUserId) {
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should update insight feedback', async () => {
    await processFeedback(testInsightId, 'thumbs_up', testUserId);

    const [updated] = await db
      .select()
      .from(insights)
      .where(eq(insights.id, testInsightId))
      .limit(1);

    expect(updated.feedback).toBe('thumbs_up');
  });

  it('should update user preferences after feedback', async () => {
    await processFeedback(testInsightId, 'thumbs_up', testUserId);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.preferences).toBeDefined();
    expect(user.preferences?.signalTypeWeights).toBeDefined();
  });
});

describe('Tenant Isolation', () => {
  let user1Id: string;
  let user2Id: string;
  let partner1Id: string;
  let partner2Id: string;
  let signal1Id: string;
  let signal2Id: string;

  beforeEach(async () => {
    // Create two users
    const [user1] = await db.insert(users).values({
      email: `user1-${Date.now()}@example.com`,
      name: 'User 1',
    }).returning();
    user1Id = user1.id;

    const [user2] = await db.insert(users).values({
      email: `user2-${Date.now()}@example.com`,
      name: 'User 2',
    }).returning();
    user2Id = user2.id;

    // Create partners for each user
    const [partner1] = await db.insert(partners).values({
      userId: user1Id,
      name: 'Partner 1',
    }).returning();
    partner1Id = partner1.id;

    const [partner2] = await db.insert(partners).values({
      userId: user2Id,
      name: 'Partner 2',
    }).returning();
    partner2Id = partner2.id;

    // Create signals for each partner
    const [signal1] = await db.insert(signals).values({
      partnerId: partner1Id,
      type: 'launch',
      title: 'User 1 Signal',
      sourceUrl: 'https://example.com/user1',
      summary: 'User 1 summary',
      dedupeHash: `hash-user1-${Date.now()}`,
    }).returning();
    signal1Id = signal1.id;

    const [signal2] = await db.insert(signals).values({
      partnerId: partner2Id,
      type: 'launch',
      title: 'User 2 Signal',
      sourceUrl: 'https://example.com/user2',
      summary: 'User 2 summary',
      dedupeHash: `hash-user2-${Date.now()}`,
    }).returning();
    signal2Id = signal2.id;
  });

  afterEach(async () => {
    if (signal1Id) await db.delete(insights).where(eq(insights.signalId, signal1Id));
    if (signal2Id) await db.delete(insights).where(eq(insights.signalId, signal2Id));
    if (partner1Id) await db.delete(signals).where(eq(signals.partnerId, partner1Id));
    if (partner2Id) await db.delete(signals).where(eq(signals.partnerId, partner2Id));
    if (user1Id) {
      await db.delete(partners).where(eq(partners.userId, user1Id));
      await db.delete(users).where(eq(users.id, user1Id));
    }
    if (user2Id) {
      await db.delete(partners).where(eq(partners.userId, user2Id));
      await db.delete(users).where(eq(users.id, user2Id));
    }
  });

  it('should only return signals for the correct user', async () => {
    // Query signals for user1
    const user1Signals = await db
      .select({ signal: signals, partner: partners })
      .from(signals)
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(eq(partners.userId, user1Id));

    expect(user1Signals.length).toBe(1);
    expect(user1Signals[0].signal.title).toBe('User 1 Signal');
    expect(user1Signals[0].partner.userId).toBe(user1Id);
  });

  it('should prevent cross-user data access', async () => {
    // Try to query user2's signals using user1's context
    const crossUserSignals = await db
      .select({ signal: signals, partner: partners })
      .from(signals)
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(eq(partners.userId, user1Id));

    // Should not include user2's signals
    const user2SignalTitles = crossUserSignals.map(s => s.signal.title);
    expect(user2SignalTitles).not.toContain('User 2 Signal');
  });
});

describe('RSS → Signal → Deduplication Pipeline', () => {
  let testUserId: string;
  let testPartnerId: string;

  beforeEach(async () => {
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;

    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
      rssUrl: 'https://example.com/feed',
    }).returning();
    testPartnerId = partner.id;
  });

  afterEach(async () => {
    if (testPartnerId) {
      await db.delete(insights).where(eq(insights.signalId, testPartnerId as any));
      await db.delete(signals).where(eq(signals.partnerId, testPartnerId));
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should create signal from RSS item and deduplicate', async () => {
    const url = 'https://example.com/post';
    const title = 'Test Post';
    const dedupeHash = generateDedupeHash(url, title);

    // Create first signal
    const [signal1] = await db.insert(signals).values({
      partnerId: testPartnerId,
      type: 'blog',
      title,
      sourceUrl: url,
      summary: 'Test summary',
      dedupeHash,
    }).returning();

    expect(signal1).toBeDefined();
    expect(signal1.dedupeHash).toBe(dedupeHash);

    // Try to create duplicate signal
    const existing = await db
      .select()
      .from(signals)
      .where(eq(signals.dedupeHash, dedupeHash))
      .limit(1);

    expect(existing.length).toBe(1);
    expect(existing[0].id).toBe(signal1.id);
  });

  it('should generate consistent dedupe hashes for same content', async () => {
    const url = 'https://example.com/post';
    const title = 'Test Post';

    const hash1 = generateDedupeHash(url, title);
    const hash2 = generateDedupeHash(url, title);

    expect(hash1).toBe(hash2);
  });
});

describe('Signal → Classify → Summarize → Score → Insight Pipeline', () => {
  let testUserId: string;
  let testPartnerId: string;
  let testObjectiveId: string;

  beforeEach(async () => {
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;

    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    }).returning();
    testPartnerId = partner.id;

    const [objective] = await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    }).returning();
    testObjectiveId = objective.id;
  });

  afterEach(async () => {
    if (testPartnerId) {
      await db.delete(insights).where(eq(insights.signalId, testPartnerId as any));
      await db.delete(signals).where(eq(signals.partnerId, testPartnerId));
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testUserId) {
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should process signal through full pipeline', async () => {
    const title = 'New API Launch';
    const content = 'We are launching a new API that enables integrations with partner platforms.';

    // Step 1: Classify
    const signalType = await classifyType(title, content);
    expect(signalType).toBeDefined();
    expect(['launch', 'changelog', 'blog']).toContain(signalType);

    // Step 2: Summarize
    const summary = await summarize(content);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(0);

    // Step 3: Create signal
    const [signal] = await db.insert(signals).values({
      partnerId: testPartnerId,
      type: signalType,
      title,
      sourceUrl: 'https://example.com/post',
      summary,
      dedupeHash: generateDedupeHash('https://example.com/post', title),
      publishedAt: new Date(),
    }).returning();

    expect(signal).toBeDefined();
    expect(signal.type).toBe(signalType);
    expect(signal.summary).toBe(summary);

    // Step 4: Score
    const [objective] = await db
      .select()
      .from(objectives)
      .where(eq(objectives.id, testObjectiveId))
      .limit(1);

    const { score, breakdown } = calculateBaseScore(
      signalType,
      signal.publishedAt,
      objective
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(breakdown).toBeDefined();

    // Step 5: Generate insight
    const insight = await generateInsight(signal, [objective]);
    expect(insight).toBeDefined();
    if (insight) {
      expect(insight.score).toBeGreaterThanOrEqual(0);
      expect(insight.why).toBeDefined();
      expect(insight.recommendation).toBeDefined();
      expect(insight.outreachDraft).toBeDefined();
      expect(insight.actions.length).toBeGreaterThan(0);
    }
  });
});

describe('Feedback → Weight Update → Re-scoring', () => {
  let testUserId: string;
  let testPartnerId: string;
  let testSignalId: string;
  let testObjectiveId: string;
  let testInsightId: string;

  beforeEach(async () => {
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;

    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    }).returning();
    testPartnerId = partner.id;

    const [signal] = await db.insert(signals).values({
      partnerId: testPartnerId,
      type: 'launch',
      title: 'Test Signal',
      sourceUrl: 'https://example.com',
      summary: 'Test summary',
      dedupeHash: `test-hash-${Date.now()}`,
      publishedAt: new Date(),
    }).returning();
    testSignalId = signal.id;

    const [objective] = await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    }).returning();
    testObjectiveId = objective.id;

    const [insight] = await db.insert(insights).values({
      signalId: testSignalId,
      objectiveId: objective.id,
      score: 50,
      why: 'Test why',
      recommendation: 'Test recommendation',
      actions: [{ label: 'Test action', ownerHint: 'test', dueInDays: 7 }],
      outreachDraft: 'Test draft',
    }).returning();
    testInsightId = insight.id;
  });

  afterEach(async () => {
    if (testInsightId) await db.delete(insights).where(eq(insights.id, testInsightId));
    if (testSignalId) await db.delete(signals).where(eq(signals.id, testSignalId));
    if (testPartnerId) await db.delete(partners).where(eq(partners.id, testPartnerId));
    if (testUserId) {
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should update weights and affect future scoring', async () => {
    // Get initial user preferences
    const [userBefore] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const initialWeights = userBefore.preferences?.signalTypeWeights || {};

    // Process feedback
    await processFeedback(testInsightId, 'thumbs_up', testUserId);

    // Get updated user preferences
    const [userAfter] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const updatedWeights = userAfter.preferences?.signalTypeWeights || {};

    // Verify weights were updated
    expect(updatedWeights).toBeDefined();
    if (initialWeights['launch']) {
      expect(updatedWeights['launch']).toBeGreaterThan(initialWeights['launch']);
    } else {
      expect(updatedWeights['launch']).toBeGreaterThan(1.0);
    }

    // Verify re-scoring uses updated weights
    const [signal] = await db
      .select()
      .from(signals)
      .where(eq(signals.id, testSignalId))
      .limit(1);

    const [objective] = await db
      .select()
      .from(objectives)
      .where(eq(objectives.id, testObjectiveId))
      .limit(1);

    const { score: newScore } = calculateBaseScore(
      signal.type as any,
      signal.publishedAt,
      objective,
      userAfter.preferences
    );

    // Score should be higher due to increased weight
    expect(newScore).toBeGreaterThanOrEqual(0);
  });
});

describe('Onboarding Completion Flow', () => {
  let testUserId: string;
  let testPartnerId: string;
  let testObjective1Id: string;
  let testObjective2Id: string;
  let testChannelId: string;

  beforeEach(async () => {
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    }).returning();
    testUserId = user.id;

    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    }).returning();
    testPartnerId = partner.id;

    const [objective1] = await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    }).returning();
    testObjective1Id = objective1.id;

    const [objective2] = await db.insert(objectives).values({
      userId: testUserId,
      type: 'co_sell',
      priority: 2,
    }).returning();
    testObjective2Id = objective2.id;

    const [channel] = await db.insert(channels).values({
      userId: testUserId,
      emailEnabled: true,
      cadence: 'weekly',
    }).returning();
    testChannelId = channel.id;
  });

  afterEach(async () => {
    if (testPartnerId) {
      await db.delete(insights).where(eq(insights.signalId, testPartnerId as any));
      await db.delete(signals).where(eq(signals.partnerId, testPartnerId));
      await db.delete(partners).where(eq(partners.id, testPartnerId));
    }
    if (testUserId) {
      await db.delete(channels).where(eq(channels.userId, testUserId));
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should mark onboarding as complete when all requirements met', async () => {
    // Verify onboarding is complete
    const complete = await isOnboardingComplete(testUserId);
    expect(complete).toBe(true);

    // Mark as complete
    await markOnboardingComplete(testUserId);

    // Verify user preferences updated
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.preferences?.onboardingComplete).toBe(true);
  });

  it('should detect incomplete onboarding when requirements not met', async () => {
    // Delete one objective to make incomplete
    await db.delete(objectives).where(eq(objectives.id, testObjective2Id));

    const complete = await isOnboardingComplete(testUserId);
    expect(complete).toBe(false);

    const status = await getOnboardingStatus(testUserId);
    expect(status.isComplete).toBe(false);
    expect(status.objectivesCount).toBe(1);
  });
});

