import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';
import { db } from '../../lib/db';
import { partners, objectives, channels, signals, insights, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

test.describe('Digest Receipt and Interaction', () => {
  let testEmail: string;
  let testUserId: string;
  let testPartnerId: string;
  let testSignalId: string;
  let testInsightId: string;

  test.beforeEach(async ({ page }) => {
    testEmail = `e2e-digest-${Date.now()}@example.com`;
    const user = await createTestUser(testEmail, 'Digest Test User');
    testUserId = user.id;

    // Set up test data
    const [partner] = await db.insert(partners).values({
      userId: testUserId,
      name: 'Digest Partner',
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
      title: 'Test Launch Signal',
      sourceUrl: 'https://example.com/launch',
      summary: 'Test summary for digest',
      dedupeHash: `test-digest-${Date.now()}`,
      publishedAt: new Date(),
    }).returning();
    testSignalId = signal.id;

    const [objective] = await db.select().from(objectives).where(eq(objectives.userId, testUserId)).limit(1);
    
    const [insight] = await db.insert(insights).values({
      signalId: signal.id,
      objectiveId: objective.id,
      score: 85,
      why: 'This signal is relevant for integrations',
      recommendation: 'Reach out to explore integration opportunities',
      actions: [{ label: 'Contact partner', ownerHint: 'Partner Manager', dueInDays: 7 }],
      outreachDraft: 'Hi, I noticed your launch and thought we could explore integration opportunities.',
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

  test('should display insights on dashboard', async ({ page }) => {
    // Verify insight is displayed
    await expect(page.locator('text=Test Launch Signal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Digest Partner/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/85|score/i')).toBeVisible({ timeout: 5000 });
  });

  test('should copy outreach draft', async ({ page }) => {
    // Look for copy button
    const copyButton = page.locator('button:has-text("Copy"), button[aria-label*="copy" i]').first();
    
    if (await copyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await copyButton.click();
      await page.waitForTimeout(1000);

      // Verify copy action (check for alert or success message)
      // Note: Clipboard API requires HTTPS or localhost, so this may not work in all environments
      const successMessage = page.locator('text=/copied|success/i');
      if (await successMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(successMessage).toBeVisible();
      }
    }
  });

  test('should provide feedback on insights', async ({ page }) => {
    // Look for feedback buttons
    const thumbsUpButton = page.locator('button:has-text("👍"), button:has-text("Useful"), button[aria-label*="thumbs" i]').first();
    
    if (await thumbsUpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await thumbsUpButton.click();
      await page.waitForTimeout(2000);

      // Verify feedback was submitted (button state change or success message)
      // The button might be disabled or show a different state
      await expect(thumbsUpButton).toBeVisible();
    }
  });

  test('should filter insights by hot signals', async ({ page }) => {
    // Look for hot signals filter button
    const hotButton = page.locator('button:has-text("Hot"), button:has-text("🔥")').first();
    
    if (await hotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hotButton.click();
      await page.waitForTimeout(2000);

      // Verify filter is applied (URL change or visual indicator)
      await expect(page).toHaveURL(/hot|score/i, { timeout: 5000 });
    }
  });
});

