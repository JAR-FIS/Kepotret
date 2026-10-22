import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

const evidenceDirectory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-V2-06/evidence');
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
test.setTimeout(90_000);

async function capture(page: Page, name: string) {
  if (process.env.UAT_CAPTURE_EVIDENCE !== '1') return;
  await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
  await page.locator('img:visible').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined)));
  });
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function englishDarkMobile(page: Page) {
  const locale = page.getByRole('button', { name: 'Bahasa: ID' });
  if (await locale.isVisible()) {
    await locale.click();
    await page.getByRole('option', { name: /^(Bahasa Inggris|English)$/ }).click();
  }
  const darkMode = page.getByRole('button', { name: /Ganti ke tema gelap|Switch to dark theme/ });
  if (await darkMode.isVisible()) await darkMode.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.setViewportSize({ width: 390, height: 844 });
}

test('H70 evidence follows actual synthetic capture into the branded review state', async ({ page }) => {
  const fixture = await installUatApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/j/${uatIds.link}?uat=normal#synthetic-owner-uat-secret`);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByLabel('Nama tampilan').fill('Tamu UAT');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
  await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeVisible();
  await capture(page, 'synthetic-capture-ready-desktop-1440-id-light');
  await page.getByRole('button', { name: 'Buka kamera' }).click();
  await expect(page.getByRole('button', { name: 'Ambil foto' })).toBeEnabled();
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await expect(page.getByRole('button', { name: 'Gunakan foto' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Pratinjau foto acara' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kepotret' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Beranda/ })).toBeVisible();
  expect(fixture.reservationCount).toBe(1);
  const header = await page.locator('main header').boundingBox();
  const card = await page.locator('main section').boundingBox();
  const home = await page.locator('main a[href="/"]').last().boundingBox();
  expect(header!.y).toBeLessThan(card!.y);
  expect(home!.y).toBeGreaterThan(card!.y);
  await capture(page, 'synthetic-h70-review-desktop-1440-id-light');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toBeVisible();
  await capture(page, 'synthetic-h70-review-mobile-390-en-dark');
});

test('H73 evidence shows selection, server counts, styled sort and the public Guest guide', async ({ page }) => {
  await installUatApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
  await expect(page.getByText('1 foto yang ditampilkan')).toBeVisible();
  await expect(page.getByText('Sisa kuota foto: 76')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ambil foto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pilih foto' }).click();
  await page.getByRole('checkbox', { name: 'Pilih foto oleh Ari UAT' }).check();
  await expect(page.getByText('Dipilih: 1 dari 20')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  await capture(page, 'synthetic-h73-gallery-desktop-1440-id-light');
  await page.getByRole('combobox', { name: 'Urutkan' }).click();
  await expect(page.getByRole('option', { name: 'Paling disukai' })).toBeVisible();
  await capture(page, 'synthetic-h73-sort-open-desktop-1440-id-light');
  await page.getByRole('option', { name: 'Paling disukai' }).click();
  await expect(page.getByRole('button', { name: 'Pilih foto' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('link', { name: 'Panduan' }).click();
  await expect(page).toHaveURL(/\/help\/guest$/);
  await expect(page.getByRole('heading', { name: 'Ikut memotret dan menikmati momen.' })).toBeVisible();
  await capture(page, 'synthetic-guest-guide-desktop-1440-id-light');
  await page.goBack();
  await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
  await expect(page.getByText('1 foto yang ditampilkan')).toBeVisible();
  await englishDarkMobile(page);
  await expect(page.getByText('1 photos displayed')).toBeVisible();
  await capture(page, 'synthetic-h73-gallery-mobile-390-en-dark');
  await page.getByRole('button', { name: 'Open gallery navigation' }).click();
  await page.getByRole('dialog', { name: 'Guest gallery navigation' }).getByRole('link', { name: 'Guide' }).click();
  await expect(page.getByRole('heading', { name: 'Take photos and enjoy the moments.' })).toBeVisible();
  await capture(page, 'synthetic-guest-guide-mobile-390-en-dark');
});

for (const [ticket, route, heading] of [
  ['h84', '/admin/catalog', 'Paket 100 Foto'],
  ['h86', '/admin/config', 'Synthetic maintenance notice'],
  ['h87', '/admin/issues', 'Synthetic Owner UAT operational issue.'],
] as const) {
  test(`${ticket.toUpperCase()} Admin visual state in both viewports`, async ({ page }) => {
    await installUatApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('main')).toContainText(heading);
    await capture(page, `synthetic-${ticket}-desktop-1440-id-light`);
    if (ticket === 'h86' || ticket === 'h87') {
      await page.getByRole('combobox').first().click();
      await expect(page.getByRole('listbox').first()).toBeVisible();
      await capture(page, `synthetic-${ticket}-dropdown-desktop-1440-id-light`);
    }
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('main')).toContainText(heading);
    await englishDarkMobile(page);
    await capture(page, `synthetic-${ticket}-mobile-390-en-dark`);
  });
}
