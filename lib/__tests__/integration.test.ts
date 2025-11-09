import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { partners, objectives, channels, users, signals, insights } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { isOnboardingComplete, getOnboardingStatus } from '@/lib/onboarding';
import { generateDigest } from '@/lib/digest';
import { processFeedback } from '@/lib/feedback';

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

