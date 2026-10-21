import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

const routes = [
  ['h80', '/admin/albums', 'Wedding Demo'],
  ['h84', '/admin/catalog', 'Paket 100 Foto'],
  ['h86', '/admin/config', 'Synthetic maintenance notice'],
  ['h87', '/admin/issues', 'Synthetic Owner UAT operational issue.'],
  ['h88', `/admin/issues/${uatIds.issue}`, 'Synthetic Owner UAT operational issue.'],
] as const;

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test.beforeEach(async ({ page }) => { await installUatApi(page); });

test('H80/H84/H86/H87/H88 remain readable in ID/EN, Light/Dark, desktop and mobile', async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of [320, 390, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [, route] of routes) {
      await page.goto(`${route}?uat=normal`);
      await expect(page.locator('main h1')).toBeVisible();
      await noOverflow(page);
    }
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [, route] of routes) {
      await page.goto(`${route}?uat=normal`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(page.locator('main h1')).toBeVisible();
      await noOverflow(page);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/admin/issues/${uatIds.issue}?uat=normal`);
  const left = await page.getByRole('heading', { name: 'Respond to this issue' }).boundingBox();
  const right = await page.getByText('Resolution reason', { exact: true }).boundingBox();
  expect(right!.y).toBeGreaterThan(left!.y);
  expect(Math.abs(right!.x - left!.x)).toBeLessThan(2);
});

test('synthetic H80/H84/H86/H87/H88 clarity evidence', async ({ page }) => {
  test.skip(process.env.UAT_CAPTURE_EVIDENCE !== '1', 'Synthetic evidence is captured only when requested.');
  test.setTimeout(180_000);
  const directory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-V2-04/evidence');
  mkdirSync(directory, { recursive: true });
  for (const [id, route, readyText] of routes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main')).toContainText(readyText);
    await page.screenshot({ path: resolve(directory, `synthetic-${id}-desktop-1440-id-light.png`), fullPage: true, animations: 'disabled' });
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  for (const [id, route, readyText] of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('main')).toContainText(readyText);
    await page.screenshot({ path: resolve(directory, `synthetic-${id}-mobile-390-en-dark.png`), fullPage: true, animations: 'disabled' });
  }
});
