import { test, expect } from '@playwright/test';

test('verify citygen', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for the city to be generated
  await expect(page.locator('canvas')).toBeVisible();

  // Wait for the "Generate Map" button to be enabled
  await expect(page.locator('button:has-text("Generate Map")')).toBeEnabled();

  // Take a screenshot
  await page.screenshot({ path: 'verification.png' });
});
