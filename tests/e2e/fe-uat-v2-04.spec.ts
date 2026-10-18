import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { installUatApi } from '../uat/mock-api';
import { uatIds } from '../uat/constants';
import { makeTransaction } from '../uat/fixtures';

const evidenceDirectory = 'docs/reviews/FE-UAT-V2-04/evidence';

test('FE-UAT-V2-04 album operations evidence and server-driven controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  test.setTimeout(300_000);
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  let statusGate: { promise: Promise<void>; release: () => void } | null = null;
  await page.route(`**/api/v1/payments/${uatIds.transaction}`, async route => {
    if (statusGate) await statusGate.promise;
    return route.fulfill({ status: 200, json: { data: makeTransaction('pending') } });
  });
  mkdirSync(evidenceDirectory, { recursive: true });

  const routes = {
    h38: `/album/${uatIds.album}/pembayaran/${uatIds.transaction}/status?uat=pending`,
    h39: `/album/${uatIds.album}/berbagi`,
    h41: `/album/${uatIds.album}?uat=live`,
    h43: `/album/${uatIds.album}/galeri/${uatIds.photo}`,
    h47: `/album/${uatIds.album}/pembayaran?uat=pending`,
    h48: `/album/${uatIds.album}/pembayaran/${uatIds.transaction}?uat=pending`,
    h49: `/album/${uatIds.album}/upgrade?uat=live`,
    h54: `/album/${uatIds.album}/retensi`,
    h55: `/album/${uatIds.album}/pemulihan?uat=recovery-active`,
    h56: `/album/${uatIds.album}/pemulihan/media?uat=recovery-media`,
    h62: `/album/${uatIds.album}?uat=collaborator`,
  } as const;
  const views = [
    { name: 'desktop-1440-light-id', width: 1440, height: 900, locale: 'id', dark: false, pages: ['h38', 'h39', 'h41', 'h43', 'h47', 'h48', 'h49', 'h54', 'h55', 'h56', 'h62'] },
    { name: 'mobile-390-dark-en', width: 390, height: 844, locale: 'en', dark: true, pages: ['h38', 'h39', 'h41', 'h43', 'h47', 'h48', 'h49', 'h54', 'h55', 'h56', 'h62'] },
    { name: 'desktop-1920-light-id', width: 1920, height: 1080, locale: 'id', dark: false, pages: ['h43'] },
    { name: 'mobile-360-light-id', width: 360, height: 780, locale: 'id', dark: false, pages: ['h43', 'h54', 'h55'] },
  ] as const;

  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: view.locale, domain: 'localhost', path: '/' }]);
    await page.goto('/');
    await page.evaluate((dark) => localStorage.setItem('kepotret-theme', dark ? 'dark' : 'light'), view.dark);
    await page.reload();
    await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(view.dark);

    for (const key of view.pages) {
      if (key === 'h38') {
        let release!: () => void;
        const promise = new Promise<void>(resolve => { release = resolve; });
        statusGate = { promise, release };
      }
      await page.goto(routes[key as keyof typeof routes]);
      const id = view.locale === 'id';
      if (key === 'h38') {
        const verifying = page.getByRole('status');
        await expect(verifying).toBeVisible();
        await expect(verifying).toContainText(id ? 'Memeriksa status terbaru dari server' : 'Checking the latest server status');
        await expect(verifying.locator('svg.lucide-hourglass')).toBeVisible();
        await expect(page.getByText(id ? 'Pembayaran berhasil' : 'Payment successful')).toHaveCount(0);
      }
      if (key === 'h39') {
        const refresh = page.getByRole('button', { name: id ? 'Muat ulang tautan' : 'Refresh sharing details' });
        await expect(refresh.locator('svg.lucide-refresh-cw')).toBeVisible();
      }
      if (key === 'h41') {
        for (const [label, icon] of [[id ? 'Buka galeri' : 'Open gallery', 'images'], [id ? 'Berbagi acara' : 'Event sharing', 'share-2'], [id ? 'Ekspor ZIP' : 'ZIP export', 'file-archive']] as const) {
          await expect(page.getByRole('link', { name: label }).locator(`svg.lucide-${icon}`)).toBeVisible();
        }
      }
      if (key === 'h43') {
        const detail = page.locator('main article').first();
        await expect(detail).toBeVisible();
        await expect(detail.locator('img')).toBeVisible();
        if (view.width === 1920) {
          const box = await detail.boundingBox();
          expect(box?.width ?? 0).toBeLessThan(900);
          expect(box?.height ?? 0).toBeLessThan(900);
        }
      }
      if (key === 'h47' || key === 'h48') {
        const badge = page.getByText(id ? 'Menunggu pembayaran' : 'Payment pending');
        await expect(badge.locator('svg')).toBeVisible();
        await expect(badge).toHaveClass(/bg-amber-100/);
      }
      if (key === 'h49') {
        await expect(page.getByRole('heading', { name: /^LOCKED \d/ })).toHaveCount(6);
        await expect(page.getByText(id ? 'Kapasitas album saat ini' : 'Current album capacity')).toBeVisible();
        await expect(page.getByRole('link', { name: id ? 'Pilih paket' : 'Choose package' })).toHaveCount(5);
      }
      if (key === 'h54' || key === 'h55') {
        const table = page.getByRole('table', { name: id ? 'Linimasa retensi dan pemulihan' : 'Retention and recovery timeline' });
        await expect(table).toBeVisible();
        await expect(table.getByRole('rowheader')).toHaveCount(key === 'h55' ? 6 : 5);
        await expect(page.getByRole('region', { name: id ? 'Linimasa retensi dan pemulihan' : 'Retention and recovery timeline' })).toHaveAttribute('tabindex', '0');
      }
      if (key === 'h56') {
        await expect(page.getByRole('button', { name: id ? 'Buat ZIP pemulihan' : 'Create recovery ZIP' })).toBeVisible();
        await expect(page.getByRole('button', { name: id ? 'Unduh media' : 'Download media' }).locator('svg.lucide-download')).toBeVisible();
      }
      if (key === 'h62') {
        await expect(page.getByText(id ? 'Kapasitas foto saat ini: 100 foto' : 'Current photo capacity: 100 photos')).toBeVisible();
        await expect(page.getByText(id ? 'Detail paket belum tersedia untuk kolaborator.' : 'Package details are not available to collaborators.')).toBeVisible();
        await expect(page.getByRole('link', { name: id ? 'Ekspor ZIP' : 'ZIP export' })).toHaveCount(0);
      }
      const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(width.document, `${key} ${view.name}`).toBeLessThanOrEqual(width.viewport + 1);
      await page.screenshot({ path: `${evidenceDirectory}/${key}-${view.name}.png`, fullPage: ['h43', 'h49', 'h54', 'h55', 'h56', 'h62'].includes(key), animations: 'disabled' });
      if (key === 'h38' && statusGate) {
        statusGate.release();
        statusGate = null;
      }
    }
  }
});
