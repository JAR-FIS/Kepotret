import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { uatIds } from '../uat/constants';
import { uatPhoto } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

const evidenceDirectory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-V2-07/evidence');
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
test.setTimeout(120_000);

async function capture(page: Page, name: string) {
  if (process.env.UAT_CAPTURE_EVIDENCE !== '1') return;
  await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
  await page.locator('img:visible').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined)));
  });
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function expectEntryFrame(page: Page) {
  const logo = page.getByRole('link', { name: 'Kepotret', exact: true });
  const home = page.locator('main a[href="/"]').last();
  const header = await page.locator('main header').boundingBox();
  const card = await page.locator('main > div > section').boundingBox();
  const homeBox = await home.boundingBox();
  await expect(logo).toBeVisible();
  await expect(home).toBeVisible();
  expect(header!.y).toBeLessThan(card!.y);
  expect(homeBox!.y).toBeGreaterThan(card!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test.describe('V2-07 synthetic evidence', () => {

  for (const [viewport, width, height] of [['desktop-1440', 1440, 900], ['mobile-390', 390, 844]] as const) {
    test(`T2-05 H73 browse and selection states ${viewport}`, async ({ page }) => {
      await installUatApi(page);
      await page.route('**/api/v1/guest/gallery/photos**', (route) => route.fulfill({ status: 200, json: { data: Array.from({ length: 21 }, (_, index) => ({ ...uatPhoto, photo_id: `uat-photo-${index}`, photographer_display_name: `Tamu ${index}` })), meta: { has_more: false, next_cursor: null } } }));
      await page.setViewportSize({ width, height });
      await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
      await expect(page.getByText('21 foto yang ditampilkan')).toBeVisible();
      await expect(page.getByText('Sisa kuota foto: 76')).toBeVisible();
      await expect(page.getByRole('checkbox')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toHaveCount(0);
      await capture(page, `synthetic-h73-browse-${viewport}-id-light`);
      await page.getByRole('button', { name: 'Pilih foto' }).click();
      await expect(page.getByText('Dipilih: 0 dari 20')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
      await capture(page, `synthetic-h73-selection-0-${viewport}-id-light`);
      await page.getByRole('checkbox', { name: 'Pilih foto oleh Tamu 0' }).check();
      await expect(page.getByText('Dipilih: 1 dari 20')).toBeVisible();
      await capture(page, `synthetic-h73-selection-1-${viewport}-id-light`);
      for (let index = 1; index < 20; index += 1) await page.getByRole('checkbox', { name: `Pilih foto oleh Tamu ${index}`, exact: true }).check();
      await expect(page.getByText('Dipilih: 20 dari 20')).toBeVisible();
      await expect(page.getByRole('checkbox', { name: 'Pilih foto oleh Tamu 20' })).toBeDisabled();
      await capture(page, `synthetic-h73-selection-20-${viewport}-id-light`);
      await page.getByRole('button', { name: 'Selesai memilih' }).click();
      await expect(page.getByRole('checkbox')).toHaveCount(0);
    });

    test(`T2-46 and T2-47 entry, camera and saved states ${viewport}`, async ({ page }) => {
      const fixture = await installUatApi(page);
      await page.setViewportSize({ width, height });
      await page.goto(`/j/${uatIds.link}?uat=normal#synthetic-owner-uat-secret`);
      await expect(page.getByRole('button', { name: 'Lanjut' })).toBeVisible();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-welcome-${viewport}-id-light`);
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-join-${viewport}-id-light`);
      await page.getByLabel('Nama tampilan').fill('Tamu UAT');
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-consent-${viewport}-id-light`);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
      await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeVisible();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-ready-${viewport}-id-light`);
      await page.getByRole('button', { name: 'Buka kamera' }).click();
      await expect(page.getByRole('button', { name: 'Ambil foto' })).toBeEnabled();
      await expect(page.getByRole('link', { name: 'Kepotret', exact: true })).toHaveCount(0);
      await expect(page.locator('main header, main footer')).toHaveCount(0);
      await capture(page, `synthetic-guest-camera-${viewport}-id-light`);
      await page.getByRole('button', { name: 'Ambil foto' }).click();
      await expect(page.getByRole('button', { name: 'Gunakan foto' })).toBeVisible();
      await page.getByRole('button', { name: 'Gunakan foto' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Foto berhasil tersimpan' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ambil foto lagi' })).toBeVisible();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-saved-${viewport}-id-light`);
      expect(fixture.captureRequests).toEqual(expect.arrayContaining(['reserve', 'upload-authorization', 'commit']));
    });

    test(`T2-46 optional PIN, waiting and closed states ${viewport}`, async ({ page }) => {
      await installUatApi(page);
      await page.setViewportSize({ width, height });
      await page.goto(`/j/${uatIds.link}?uat=pin#synthetic-owner-uat-secret`);
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await expect(page.getByLabel('PIN acara')).toBeVisible();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-pin-${viewport}-id-light`);
      await page.goto(`/j/${uatIds.link}?uat=waiting#synthetic-owner-uat-secret`);
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await page.getByLabel('Nama tampilan').fill('Tamu UAT');
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
      await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeDisabled();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-waiting-${viewport}-id-light`);
      await page.goto(`/j/${uatIds.link}?uat=closed#synthetic-owner-uat-secret`);
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await page.getByLabel('Nama tampilan').fill('Tamu UAT');
      await page.getByRole('button', { name: 'Lanjut' }).click();
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
      await expect(page.getByText('Sesi foto telah ditutup', { exact: true })).toBeVisible();
      await expectEntryFrame(page);
      await capture(page, `synthetic-guest-closed-${viewport}-id-light`);
    });
  }

  test('T2-13 H80 uses user copy and keeps sorting unavailable', async ({ page }) => {
    await installUatApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/albums?uat=normal');
    await expect(page.getByText('Cari album di seluruh halaman melalui server Admin.')).toBeVisible();
    await expect(page.getByText(/API menentukan bidang album/i)).toHaveCount(0);
    const icons = page.locator('th span[title="Pengurutan seluruh album belum tersedia."]');
    await expect(icons).toHaveCount(2);
    expect(await icons.evaluateAll((items) => items.every((item) => (item as HTMLElement).tabIndex === -1))).toBe(true);
    await capture(page, 'synthetic-h80-copy-desktop-1440-id-light');
    await page.getByRole('button', { name: 'Bahasa: ID' }).click();
    await page.getByRole('option', { name: 'English' }).click();
    await expect(page.getByText('Search albums across all pages through the Admin server.')).toBeVisible();
  });

  test('T2-46 English dark mobile entry and H73 Gallery copy', async ({ page }) => {
    await installUatApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/j/${uatIds.link}?uat=normal#synthetic-owner-uat-secret`);
    await page.getByRole('button', { name: 'Bahasa: ID' }).click();
    await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
    await capture(page, 'synthetic-guest-welcome-mobile-390-en-dark');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByLabel('Display name')).toBeVisible();
    await capture(page, 'synthetic-guest-join-mobile-390-en-dark');
    await page.getByLabel('Display name').fill('UAT Guest');
    await page.getByRole('button', { name: 'Continue' }).click();
    await capture(page, 'synthetic-guest-consent-mobile-390-en-dark');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Agree & Continue' }).click();
    await expect(page.getByRole('button', { name: 'Open camera' })).toBeVisible();
    await capture(page, 'synthetic-guest-ready-mobile-390-en-dark');
    await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
    await expect(page.getByText('Photo quota remaining: 76')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select photos' })).toBeVisible();
    await capture(page, 'synthetic-h73-browse-mobile-390-en-dark');
  });
});
