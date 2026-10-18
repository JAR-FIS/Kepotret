import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { makeTransaction, uatPackages } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

test('FE-UAT-V3-01 corrections remain legible and capture synthetic desktop/mobile evidence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  test.setTimeout(180_000);
  await installUatApi(page);
  await page.route(`**/api/v1/payments/${uatIds.transaction}`, route => route.fulfill({ status: 200, json: { data: makeTransaction('pending') } }));
  const evidenceDirectory = testInfo.outputPath('FE-UAT-V3-01-evidence');
  mkdirSync(evidenceDirectory, { recursive: true });

  const views = [
    { name: 'desktop-1440-light-id', width: 1440, height: 900, locale: 'id', dark: false },
    { name: 'mobile-390-dark-en', width: 390, height: 844, locale: 'en', dark: true },
    { name: 'mobile-360-light-id', width: 360, height: 780, locale: 'id', dark: false },
  ] as const;
  const routes = {
    h01: '/',
    h33: `/album/${uatIds.album}/setup/paket`,
    h38: `/album/${uatIds.album}/pembayaran/${uatIds.transaction}/status?uat=pending`,
    h56: `/album/${uatIds.album}/pemulihan/media?uat=recovery-media`,
  } as const;

  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: view.locale, domain: 'localhost', path: '/' }]);
    await page.goto('/');
    await page.evaluate(dark => localStorage.setItem('kepotret-theme', dark ? 'dark' : 'light'), view.dark);
    await page.reload();
    await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(view.dark);

    for (const [key, route] of Object.entries(routes) as Array<[keyof typeof routes, string]>) {
      await page.goto(route);
      if (key === 'h01') {
        const label = page.getByTestId('h01-fourth-phone-label');
        await expect(label).toHaveText(view.locale === 'id' ? 'Siap & Motret' : 'Ready to shoot');
        const box = await label.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan(90);
        const overflow = await label.evaluate(element => element.scrollWidth > element.clientWidth);
        expect(overflow).toBe(false);
        await label.scrollIntoViewIfNeeded();
      }

      if (key === 'h33') {
        const choices = page.getByRole('radio');
        await expect(choices).toHaveCount(7);
        await expect(page.getByText(/LOCKED\d+/)).toHaveCount(0);
        await expect(page.getByText(view.locale === 'id' ? /·\s*10\.000 foto$/ : /·\s*10,000 photos$/)).toBeVisible();
        expect(uatPackages.map(option => [option.quota_total, option.price_amount])).toEqual([
          [100, 100000], [250, 230000], [500, 450000], [700, 620000], [1000, 840000], [10000, 1100000],
        ]);
        const columns = page.getByTestId('setup-package-column');
        await expect(columns).toHaveCount(2);
        await expect(columns.nth(0).getByRole('radio')).toHaveCount(4);
        await expect(columns.nth(1).getByRole('radio')).toHaveCount(3);
        const left = await columns.nth(0).boundingBox();
        const right = await columns.nth(1).boundingBox();
        if (view.width >= 1024) expect(right?.x ?? 0).toBeGreaterThan(left?.x ?? 0);
        else {
          expect(Math.abs((right?.x ?? 0) - (left?.x ?? 0))).toBeLessThan(2);
          expect(right?.y ?? 0).toBeGreaterThan(left?.y ?? 0);
        }
        await columns.first().scrollIntoViewIfNeeded();
      }

      if (key === 'h38') {
        const pending = page.getByRole('status');
        await expect(pending.locator('span[aria-hidden="true"]')).toContainText(view.locale === 'id' ? 'Menunggu konfirmasi pembayaran' : 'Waiting for payment confirmation');
        await expect(pending.locator('svg.lucide-hourglass')).toBeVisible();
        await expect(page.getByText(view.locale === 'id' ? 'Pembayaran berhasil' : 'Payment successful')).toHaveCount(0);
        const history = page.getByRole('link', { name: view.locale === 'id' ? 'Riwayat pembayaran' : 'Payment history' });
        const pendingBox = await pending.boundingBox();
        const historyBox = await history.boundingBox();
        expect(historyBox?.y ?? 0).toBeGreaterThan((pendingBox?.y ?? 0) + (pendingBox?.height ?? 0));
      }

      if (key === 'h56') {
        const zip = page.getByRole('button', { name: view.locale === 'id' ? 'Buat ZIP pemulihan' : 'Create recovery ZIP' });
        const badge = page.getByRole('status').first();
        await expect(zip).toBeVisible();
        await expect(page.getByRole('button', { name: view.locale === 'id' ? 'Unduh media' : 'Download media' }).locator('svg.lucide-download')).toBeVisible();
        const zipBox = await zip.boundingBox();
        const badgeBox = await badge.boundingBox();
        if (view.width >= 640) expect(zipBox?.x ?? 0).toBeGreaterThan((badgeBox?.x ?? 0) + (badgeBox?.width ?? 0));
        else expect(zipBox?.y ?? 0).toBeGreaterThan((badgeBox?.y ?? 0) + (badgeBox?.height ?? 0));
        await expect(zip.locator('xpath=ancestor::section[1]').getByRole('status').first()).toBeVisible();
      }

      const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(pageWidth.scroll, `${key} ${view.name}`).toBeLessThanOrEqual(pageWidth.client + 1);
      await page.screenshot({
        path: `${evidenceDirectory}/${key}-${view.name}.png`,
        fullPage: key === 'h33' || key === 'h56',
        animations: 'disabled',
      });
    }
  }
});
