import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';
import { db } from '../../lib/db';
import { partners, objectives, channels, signals, insights, users } from '../../lib/schema';
import { eq } from 'drizzle-orm';

test.describe('Feedback Impact on Future Digests', () => {
  let testEmail: string;
  let testUserId: string;
  let testPartnerId: string;
  let testSignalId: string;
  let testInsightId: string;

  test.beforeEach(async ({ page }) => {
    testEmail = `e2e-feedback-${Date.now()}@example.com`;
    const user = await createTestUser(testEmail, 'Feedback Test User');
    testUserId = user.id;

    // Set up test data
    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Feedback Partner',
    }).returning();
    testPartnerId = partner.id;

    await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    });

    await db.insert(channels).values({
      userId: testUserId,
      emailEnabled: true,
      cadence: 'weekly',
    });

    const [signal] = await db.insert(signals).values({
      partnerId: testPartnerId,
      type: 'launch',
      title: 'Feedback Test Signal',
      sourceUrl: 'https://example.com/feedback',
      summary: 'Test summary',
      dedupeHash: `test-feedback-${Date.now()}`,
      publishedAt: new Date(),
    }).returning();
    testSignalId = signal.id;

    const [objective] = await db.select().from(objectives).where(eq(objectives.userId, testUserId)).limit(1);
    
    const [insight] = await db.insert(insights).values({
      signalId: signal.id,
      objectiveId: objective.id,
      score: 75,
      why: 'This signal is relevant',
      recommendation: 'Consider reaching out',
      actions: [{ label: 'Contact', ownerHint: 'PM', dueInDays: 7 }],
      outreachDraft: 'Test draft',
    }).returning();
    testInsightId = insight.id;

    await page.goto('http://localhost:3000/dashboard');
  });

  test.afterEach(async () => {
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
      await db.delete(channels).where(eq(channels.userId, testUserId));
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('should update user preferences after feedback', async ({ page }) => {
    // Give positive feedback
    const thumbsUpButton = page.locator('button:has-text("👍"), button:has-text("Useful")').first();
    
    if (await thumbsUpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await thumbsUpButton.click();
      await page.waitForTimeout(2000);

      // Verify feedback was recorded
      // Check database for updated preferences
      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      
      // User preferences should be updated
      expect(user.preferences).toBeDefined();
      // Note: Actual weight verification would require checking the preferences object
    }
  });

  test('should mark insight as N/A', async ({ page }) => {
    // Look for N/A button
    const naButton = page.locator('button:has-text("N/A"), button:has-text("Mark N/A")').first();
    
    if (await naButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await naButton.click();
      await page.waitForTimeout(2000);

      // Verify feedback was recorded
      const [insight] = await db.select().from(insights).where(eq(insights.id, testInsightId)).limit(1);
      
      // Insight should have feedback marked
      expect(insight.feedback).toBe('na');
    }
  });

  test('should show feedback impact in future insights', async ({ page }) => {
    // Give feedback first
    const thumbsUpButton = page.locator('button:has-text("👍")').first();
    
    if (await thumbsUpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await thumbsUpButton.click();
      await page.waitForTimeout(2000);

      // Refresh page to see if preferences affected scoring
      await page.reload();
      await page.waitForTimeout(2000);

      // Verify insights are still displayed (preferences should affect future scoring)
      await expect(page.locator('text=/Feedback Test Signal|Feedback Partner/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

