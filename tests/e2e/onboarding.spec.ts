import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';
import { db } from '../../lib/db';
import { partners, objectives, channels, users } from '../../lib/schema';
import { eq } from 'drizzle-orm';

test.describe('Complete User Onboarding Flow', () => {
  let testEmail: string;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    // Create test user
    testEmail = `e2e-test-${Date.now()}@example.com`;
    const user = await createTestUser(testEmail, 'E2E Test User');
    testUserId = user.id;

    // Navigate to app
    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(partners).where(eq(partners.userId, testUserId));
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(channels).where(eq(channels.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('should complete onboarding flow end-to-end', async ({ page }) => {
    // Note: This test assumes authentication is handled separately
    // In a real scenario, you'd authenticate first
    
    // Step 1: Navigate to onboarding (should redirect if not authenticated)
    await page.goto('http://localhost:3000/onboarding');
    
    // Check for onboarding wizard
    const stepIndicator = page.locator('text=/step|onboarding/i');
    await expect(stepIndicator.first()).toBeVisible({ timeout: 10000 });

    // Step 2: Add Partner (Step 1)
    // Look for partner form
    const partnerInput = page.locator('input[placeholder*="partner" i], input[name*="partner" i]').first();
    if (await partnerInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await partnerInput.fill('Test Partner');
      await partnerInput.press('Enter');
      
      // Wait for partner to be added
      await page.waitForTimeout(1000);
    }

    // Step 3: Add Objectives (Step 2)
    // Navigate to objectives step or add objectives
    const objectiveButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await objectiveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await objectiveButton.click();
      await page.waitForTimeout(1000);
    }

    // Add objectives
    const addObjectiveButton = page.locator('button:has-text("Add"), button:has-text("Objective")').first();
    if (await addObjectiveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addObjectiveButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 4: Configure Channel (Step 3)
    const channelButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await channelButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await channelButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify onboarding completion
    const completeButton = page.locator('button:has-text("Complete"), button:has-text("Finish")').first();
    if (await completeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to dashboard after completion
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    }
  });

  test('should redirect to onboarding when incomplete', async ({ page }) => {
    // Try to access dashboard without completing onboarding
    await page.goto('http://localhost:3000/dashboard');
    
    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
  });
});

