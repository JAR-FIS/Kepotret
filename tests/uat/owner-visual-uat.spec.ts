import { expect, test } from '@playwright/test';
import { uatEventName, uatIds } from './constants';
import { installUatApi } from './mock-api';

test('Owner Visual UAT — synthetic fixtures stay active for manual route review', async ({ page }) => {
  test.setTimeout(0);
  const fixtures = await installUatApi(page);

  await page.goto('/?uat=normal');
  await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();

  await page.goto(`/album/${uatIds.album}?uat=live`);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByText(uatEventName).first()).toBeVisible();

  await page.goto(`/j/${uatIds.link}?uat=ready#synthetic-owner-uat-secret`);
  await expect(page.getByRole('heading', { name: uatEventName })).toBeVisible();

  await page.goto('/admin?uat=normal');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByText('128').first()).toBeVisible();
  expect(fixtures.requestCount).toBeGreaterThan(0);

  await page.goto('/?uat=normal');
  if (!process.env.CI) await page.pause();

  // Route interception belongs to this live BrowserContext, so it remains active
  // as the Owner changes local URLs in the paused browser.
  await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
});
