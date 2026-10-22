import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

const album = `/album/${uatIds.album}`;
const evidenceDirectory = resolve(process.cwd(), 'docs/reviews/FE-UAT-V2-08-A/evidence');
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
test.setTimeout(120_000);

async function capture(page: Page, name: string) {
  if (process.env.UAT_CAPTURE_EVIDENCE !== '1') return;
  await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true, animations: 'disabled' });
}

test('V2-08A both workspace menus open and navigate on desktop and mobile', async ({ page }) => {
  await installUatApi(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, itemName, destination] of [
      ['Kelola', 'Pengaturan album', `${album}/pengaturan`],
      ['Lainnya', 'Berbagi', `${album}/berbagi`],
    ] as const) {
      await page.goto(`${album}?uat=draft`);
      const trigger = page.getByRole('button', { name, exact: true });
      await expect(trigger).toBeVisible();
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const item = page.getByRole('menuitem', { name: itemName, exact: true });
      const menu = page.getByRole('menu').filter({ has: item });
      await expect(menu).toBeVisible();
      const bounds = await menu.boundingBox();
      const triggerBounds = await trigger.boundingBox();
      expect(bounds).not.toBeNull();
      expect(triggerBounds).not.toBeNull();
      expect(bounds!.y, `${name} top at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height, `${name} bottom at ${width}px`).toBeLessThanOrEqual(900);
      if (width >= 1024) expect(bounds!.y).toBeGreaterThanOrEqual(triggerBounds!.y + triggerBounds!.height);
      else expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(triggerBounds!.y);
      await capture(page, `workspace-${name === 'Kelola' ? 'manage' : 'more'}-${width}-id-light`);
      await item.click();
      await expect(page).toHaveURL(destination);
    }
  }
});

test('V2-08A keyboard, Escape, focus return, and outside click', async ({ page }) => {
  await installUatApi(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${album}?uat=draft`);
    const manage = page.getByRole('button', { name: 'Kelola', exact: true });
    await manage.focus();
    await page.keyboard.press('ArrowDown');
    await expect(manage).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menuitem', { name: 'Pengaturan album' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Desain album' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(manage).toBeFocused();
    await expect(manage).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('menu')).toHaveCount(0);
    const more = page.getByRole('button', { name: 'Lainnya', exact: true });
    await more.click();
    await expect(page.getByRole('menuitem', { name: 'Panduan Host' })).toBeFocused();
    await page.locator('main').click({ position: { x: 8, y: 8 } });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  }
});

test('PR A contextual Owner and Collaborator routes keep server permissions', async ({ page }) => {
  await installUatApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [label, path] of [
    ['Berbagi & QR', 'berbagi'], ['Lihat sebagai tamu', 'preview-tamu'], ['Lihat semua aktivitas', 'aktivitas'],
    ['Ubah jadwal', 'jadwal-ulang'], ['Masa aktif & pemulihan', 'retensi'], ['Kelola kolaborator', 'kolaborator'],
    ['Riwayat pembayaran', 'pembayaran'], ['Upgrade paket', 'upgrade'],
  ] as const) {
    await page.goto(`${album}?uat=draft`);
    const quickLinks = page.getByRole('navigation', { name: 'Jelajahi album' });
    await expect(quickLinks).toBeVisible();
    if (label === 'Berbagi & QR') await capture(page, 'h27-overview-1440-id-light');
    await quickLinks.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${album}/${path}`);
  }
  await page.goto(`${album}?uat=collaborator`);
  const quickLinks = page.getByRole('navigation', { name: 'Jelajahi album' });
  await expect(quickLinks.getByRole('link', { name: 'Izin saya' })).toBeVisible();
  await expect(quickLinks.getByRole('link', { name: 'Riwayat pembayaran' })).toHaveCount(0);
  await expect(quickLinks.getByRole('link', { name: 'Upgrade paket' })).toHaveCount(0);
  await expect(quickLinks.getByRole('link', { name: 'Kelola kolaborator' })).toHaveCount(0);
  await capture(page, 'workspace-collaborator-1440-id-light');
  await quickLinks.getByRole('link', { name: 'Izin saya' }).click();
  await expect(page).toHaveURL(`${album}/izin`);
});

test('PR A English dark mobile navigation and unknown eligibility stay clear', async ({ page }) => {
  await installUatApi(page);
  await page.route(`**/api/v1/albums/${uatIds.album}/schedule`, (route) => route.fulfill({ status: 503, json: {} }));
  await page.route(`**/api/v1/albums/${uatIds.album}/package-options`, (route) => route.fulfill({ status: 503, json: {} }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${album}?uat=draft`);
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.getByRole('heading', { name: 'Album overview' })).toBeVisible();
  const quickLinks = page.getByRole('navigation', { name: 'Explore album' });
  await expect(quickLinks.getByRole('link', { name: 'Event schedule' })).toBeVisible();
  await expect(quickLinks.getByRole('link', { name: 'Upgrade package' })).toHaveCount(0);
  await capture(page, 'h27-overview-390-en-dark');
  const manage = page.getByRole('button', { name: 'Manage', exact: true });
  await manage.click();
  await expect(page.getByRole('menuitem', { name: 'Album settings' })).toBeVisible();
  await capture(page, 'workspace-manage-390-en-dark');
  await page.getByRole('menuitem', { name: 'Album settings' }).click();
  await expect(page).toHaveURL(`${album}/pengaturan`);
});

test('PR A H19 H39 H45 H47 H54 and H92 click through existing routes', async ({ page }) => {
  await installUatApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dashboard?uat=draft');
  await page.getByRole('navigation', { name: 'Navigasi ruang kerja' }).getByRole('link', { name: 'Akun' }).click();
  await expect(page).toHaveURL(/\/akun$/);
  await capture(page, 'h19-account-1440-id-light');

  await page.goto(`${album}/berbagi?uat=draft`);
  await expect(page.getByRole('link', { name: 'Panduan kolaborator' })).toHaveAttribute('href', '/help/collaborator');
  await expect(page.getByRole('link', { name: 'Panduan tamu' })).toHaveAttribute('href', '/help/guest');
  await capture(page, 'h39-sharing-1440-id-light');
  await page.getByRole('link', { name: 'Panduan tamu' }).click();
  await expect(page).toHaveURL(/\/help\/guest$/);

  await page.goto(`${album}/kolaborator?uat=draft`);
  await page.locator(`a[href="${album}/kolaborator/undangan"]`).first().click();
  await expect(page).toHaveURL(/\/kolaborator\/undangan$/);

  await page.goto(`${album}/pembayaran?uat=draft`);
  await page.locator(`a[href="${album}/pembayaran/${uatIds.transaction}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${uatIds.transaction}$`));

  await page.goto(`${album}/retensi?uat=draft`);
  await page.getByRole('link', { name: 'Lihat opsi pemulihan' }).click();
  await expect(page).toHaveURL(/\/pemulihan$/);

  await page.goto('/admin/albums?uat=draft');
  await page.locator(`a[href="/admin/albums/${uatIds.album}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${uatIds.album}$`));
  await page.locator(`a[href="/admin/albums/${uatIds.album}/hold"]`).click();
  await expect(page).toHaveURL(/\/hold$/);
});

test('PR A H71 album link appears only after commit and keeps the reveal gate', async ({ page }) => {
  const fixture = await installUatApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/j/${uatIds.link}?uat=normal#synthetic-owner-uat-secret`);
  await expect(page.getByRole('link', { name: 'Lihat album' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByLabel('Nama tampilan').fill('Tamu UAT');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
  await page.getByRole('button', { name: 'Buka kamera' }).click();
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await expect(page.getByRole('link', { name: 'Lihat album' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Gunakan foto' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Foto berhasil tersimpan' })).toBeVisible();
  expect(fixture.captureRequests).toContain('commit');
  await capture(page, 'h71-saved-390-id-light');
  await page.getByRole('link', { name: 'Lihat album' }).click();
  await expect(page).toHaveURL(`/j/${uatIds.link}/galeri`);
  await expect(page.getByText('Galeri akan tersedia setelah waktu reveal dan akses dikonfirmasi oleh server.')).toBeVisible();
});
