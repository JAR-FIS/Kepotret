import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

const evidenceDirectory = 'docs/reviews/FE-UAT-V2-03/evidence';

test('FE-UAT-V2-03 synthetic visual evidence covers approved routes and responsive states', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  test.setTimeout(300_000);
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  mkdirSync(evidenceDirectory, { recursive: true });

  const routes = {
    h01: '/',
    h02: '/cara-kerja',
    h09: '/owner-uat-not-found',
    h17: `/undangan/kolaborator/${uatIds.invitation}?uat=normal#owner-visual-uat-synthetic-invitation-secret`,
    h21: '/admin/mfa',
    h27: `/album/${uatIds.album}?uat=draft`,
    h28: `/album/${uatIds.album}/setup/acara`,
    h33: `/album/${uatIds.album}/setup/paket`,
  } as const;
  const views = [
    { name: 'desktop-1440-light-id', width: 1440, height: 900, locale: 'id', dark: false, pages: ['h01', 'h02', 'h09', 'h17', 'h21', 'h27', 'h28', 'h33'] },
    { name: 'desktop-1024-dark-en', width: 1024, height: 800, locale: 'en', dark: true, pages: ['h01', 'h02'] },
    { name: 'mobile-390-dark-en', width: 390, height: 844, locale: 'en', dark: true, pages: ['h01', 'h02', 'h09', 'h17', 'h21', 'h27', 'h28', 'h33'] },
    { name: 'mobile-360-light-id', width: 360, height: 780, locale: 'id', dark: false, pages: ['h01', 'h17'] },
  ] as const;

  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: view.locale, domain: 'localhost', path: '/' }]);
    await page.goto('/');
    await page.evaluate((dark) => localStorage.setItem('kepotret-theme', dark ? 'dark' : 'light'), view.dark);
    await page.reload();
    await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(view.dark);
    for (const route of view.pages) {
      const response = await page.goto(routes[route]);
      if (route === 'h09') expect(response?.status()).toBe(404);
      if (route === 'h01') {
        await expect(page.locator('img[src*="wedding-03.jpg"]')).toHaveCount(1);
        const phoneLabel = page.getByTestId('h01-fourth-phone-label');
        await expect(phoneLabel).toBeVisible();
        const labelWidth = await phoneLabel.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
        expect(labelWidth.scroll, view.name).toBeLessThanOrEqual(labelWidth.client + 1);
        for (const visual of await page.locator('img[src*="/media/marketing/"]').all()) {
          await visual.scrollIntoViewIfNeeded();
          await expect.poll(() => visual.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      if (route === 'h02') await expect(page.locator('[data-guide-visual]')).toHaveCount(7);
      if (route === 'h17') {
        const accept = page.getByRole('button', { name: /terima undangan|accept invitation/i });
        await expect(accept).toBeVisible();
        const buttonBox = await accept.boundingBox();
        const parentBox = await accept.locator('..').boundingBox();
        expect(Math.abs((buttonBox?.width ?? 0) - (parentBox?.width ?? 0))).toBeLessThan(2);
      }
      if (route === 'h21') await expect(page.getByRole('textbox', { name: /kode autentikasi|authentication code/i })).toBeEnabled();
      if (route === 'h27') await expect(page.getByText(/LOCKED 100/)).toBeVisible();
      if (route === 'h28') await expect(page.getByRole('radio')).toHaveCount(5);
      if (route === 'h33') await expect(page.getByRole('radio')).toHaveCount(7);
      const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
      await page.screenshot({ path: `${evidenceDirectory}/${route}-${view.name}.png`, fullPage: ['h01', 'h02', 'h27', 'h28', 'h33'].includes(route), animations: 'disabled' });
    }
  }
});
