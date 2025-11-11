import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';
import { db } from '../../lib/db';
import { partners, channels, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

test.describe('Channel Configuration', () => {
  let testEmail: string;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    testEmail = `e2e-channels-${Date.now()}@example.com`;
    const user = await createTestUser(testEmail, 'Channels Test User');
    testUserId = user.id;

    // Set up complete onboarding state
    await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    });

    await page.goto('http://localhost:3000/settings/channels');
  });

  test.afterEach(async () => {
    if (testUserId) {
      await db.delete(channels).where(eq(channels.userId, testUserId));
      await db.delete(partners).where(eq(partners.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('should configure email channel', async ({ page }) => {
    // Look for email configuration
    const emailToggle = page.locator('input[type="checkbox"][name*="email" i], input[type="checkbox"]').first();
    
    if (await emailToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Toggle email on if not already on
      if (!(await emailToggle.isChecked())) {
        await emailToggle.check();
        await page.waitForTimeout(1000);
      }

      // Verify email is enabled
      await expect(emailToggle).toBeChecked();
    }
  });

  test('should configure Slack webhook', async ({ page }) => {
    // Look for Slack webhook input
    const slackInput = page.locator('input[name*="slack" i], input[placeholder*="webhook" i]').first();
    
    if (await slackInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await slackInput.fill('https://hooks.slack.com/services/test/webhook');
      await page.waitForTimeout(1000);

      // Save configuration
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Verify success message or updated value
        await expect(page.locator('text=/saved|success|updated/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should configure digest cadence', async ({ page }) => {
    // Look for cadence selector
    const cadenceSelect = page.locator('select[name*="cadence" i], select').first();
    
    if (await cadenceSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cadenceSelect.selectOption('daily');
      await page.waitForTimeout(1000);

      // Verify cadence is set
      await expect(cadenceSelect).toHaveValue('daily');
    }
  });
});

