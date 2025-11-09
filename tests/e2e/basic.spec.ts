import { test, expect } from '@playwright/test';

test.describe('PartnerOS E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');
  });

  test('should redirect to sign in when not authenticated', async ({ page }) => {
    // Try to access dashboard
    await page.goto('http://localhost:3000/dashboard');
    
    // Should redirect to sign in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should show sign in page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');
    
    // Check for sign in form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to partners page', async ({ page }) => {
    // This test assumes user is authenticated
    // In a real scenario, you'd set up authentication state
    await page.goto('http://localhost:3000/partners');
    
    // Check for partners page elements
    const heading = page.locator('h1, h2').filter({ hasText: /partner/i });
    await expect(heading.first()).toBeVisible();
  });

  test('should navigate to objectives page', async ({ page }) => {
    await page.goto('http://localhost:3000/objectives');
    
    // Check for objectives page elements
    const heading = page.locator('h1, h2').filter({ hasText: /objective/i });
    await expect(heading.first()).toBeVisible();
  });
});

test.describe('Onboarding Flow', () => {
  test('should show onboarding page when incomplete', async ({ page }) => {
    // This would require setting up test user state
    await page.goto('http://localhost:3000/onboarding');
    
    // Check for onboarding wizard
    const stepIndicator = page.locator('text=/step|onboarding/i');
    await expect(stepIndicator.first()).toBeVisible();
  });
});

test.describe('API Routes', () => {
  test('should return 401 for unauthenticated API requests', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/partners');
    expect(response.status()).toBe(401);
  });

  test('should return 404 for invalid routes', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/invalid-route');
    expect(response.status()).toBe(404);
  });
});

