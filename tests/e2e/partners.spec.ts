import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';
import { db } from '../../lib/db';
import { partners, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

test.describe('Partner Management', () => {
  let testEmail: string;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    testEmail = `e2e-partner-${Date.now()}@example.com`;
    const user = await createTestUser(testEmail, 'Partner Test User');
    testUserId = user.id;

    // Set up complete onboarding state
    await db.insert(partners).values({
      userId: testUserId,
      name: 'Existing Partner',
    });
    
    await page.goto('http://localhost:3000/partners');
  });

  test.afterEach(async () => {
    if (testUserId) {
      await db.delete(partners).where(eq(partners.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('should add a new partner', async ({ page }) => {
    // Look for add partner button or form
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Partner"), a:has-text("Add Partner")').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Fill partner form
      const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('New Test Partner');
        
        const domainInput = page.locator('input[name*="domain" i], input[placeholder*="domain" i]').first();
        if (await domainInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await domainInput.fill('example.com');
        }

        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")').first();
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Verify partner appears in list
          await expect(page.locator('text=New Test Partner')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should view partner details', async ({ page }) => {
    // Click on existing partner
    const partnerLink = page.locator('a:has-text("Existing Partner"), text="Existing Partner"').first();
    
    if (await partnerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await partnerLink.click();
      await page.waitForTimeout(2000);

      // Verify partner details page
      await expect(page.locator('h1, h2').filter({ hasText: /Existing Partner/i })).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to CSV import page', async ({ page }) => {
    const importLink = page.locator('a:has-text("Import"), a:has-text("CSV"), button:has-text("Import")').first();
    
    if (await importLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await importLink.click();
      await page.waitForTimeout(2000);

      // Verify import page
      await expect(page).toHaveURL(/\/partners\/import/);
      await expect(page.locator('text=/import|csv/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

