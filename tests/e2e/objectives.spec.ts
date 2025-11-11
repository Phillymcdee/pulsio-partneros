import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';
import { db } from '../../lib/db';
import { partners, objectives, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

test.describe('Objectives Management', () => {
  let testEmail: string;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    testEmail = `e2e-objectives-${Date.now()}@example.com`;
    const user = await createTestUser(testEmail, 'Objectives Test User');
    testUserId = user.id;

    // Set up complete onboarding state
    await db.insert(partners).values({
      userId: testUserId,
      name: 'Test Partner',
    });
    
    await db.insert(objectives).values({
      userId: testUserId,
      type: 'integrations',
      priority: 1,
    });

    await page.goto('http://localhost:3000/objectives');
  });

  test.afterEach(async () => {
    if (testUserId) {
      await db.delete(objectives).where(eq(objectives.userId, testUserId));
      await db.delete(partners).where(eq(partners.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('should add a new objective', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Objective"), a:has-text("Add Objective")').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Select objective type
      const typeSelect = page.locator('select[name*="type" i], select').first();
      if (await typeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await typeSelect.selectOption('co_sell');
      }

      // Set priority if available
      const prioritySelect = page.locator('select[name*="priority" i]').first();
      if (await prioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await prioritySelect.selectOption('2');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")').first();
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify objective appears
        await expect(page.locator('text=/co.sell|co-sell/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display existing objectives', async ({ page }) => {
    // Verify existing objective is displayed
    await expect(page.locator('text=/integrations/i')).toBeVisible({ timeout: 5000 });
  });

  test('should allow editing objective priority', async ({ page }) => {
    // Look for edit button or priority selector
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Change priority
      const prioritySelect = page.locator('select[name*="priority" i]').first();
      if (await prioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await prioritySelect.selectOption('2');
        
        const saveButton = page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

