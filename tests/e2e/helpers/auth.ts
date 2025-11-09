import { Page } from '@playwright/test';

/**
 * Helper to create a test user and authenticate
 * Note: This requires direct database access, which should be set up in test setup
 */
export async function createTestUser(email: string, name: string = 'Test User') {
  // Import db dynamically to avoid issues in test environment
  const { db } = await import('../../../lib/db');
  const { users } = await import('../../../lib/schema');
  
  const [user] = await db.insert(users).values({
    email,
    name,
  }).returning();
  
  return user;
}

/**
 * Helper to navigate and wait for page load
 */
export async function navigateAndWait(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

