import { expect, test } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { makeAlbum, uatCategories, uatPackages } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

const albumRoute = `**/api/v1/albums/${uatIds.album}`;

test('H27 shows authorized package selection and capacity without claiming draft entitlement', async ({ page }) => {
  await installUatApi(page);
  await page.goto(`/album/${uatIds.album}?uat=draft`);
  await expect(page.getByText('Paket 100 Foto')).toBeVisible();
  await expect(page.getByText('LOCKED100')).toHaveCount(0);
  await expect(page.getByText('Kapasitas paket pilihan: 100 foto')).toBeVisible();
  await expect(page.getByText('Kapasitas album saat ini belum tersedia.')).toBeVisible();
  await expect(page.getByText(/belum memberikan kuota berbayar/)).toBeVisible();

  await page.goto(`/album/${uatIds.album}?uat=collaborator`);
  await expect(page.getByText('Pilihan paket album')).toHaveCount(0);
  await expect(page.getByText('Kapasitas paket pilihan: 100 foto')).toHaveCount(0);

  await page.route(albumRoute, (route) => route.fulfill({ status: 200, json: { data: { ...makeAlbum('draft'), readiness: 'PAYMENT_PENDING', quota_total: 30 } } }));
  await page.goto(`/album/${uatIds.album}?uat=draft`);
  await expect(page.getByRole('heading', { name: 'Menunggu pembayaran' })).toBeVisible();
  await expect(page.getByText('Kapasitas album saat ini: 30 foto')).toBeVisible();

  await page.route('**/api/v1/packages', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE' } } }));
  await page.goto(`/album/${uatIds.album}?uat=draft`);
  await expect(page.getByText('Detail paket belum tersedia dari katalog.')).toBeVisible();
  await expect(page.getByText('Kapasitas album saat ini: 30 foto')).toBeVisible();

  await page.route(albumRoute, (route) => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } }));
  await page.goto(`/album/${uatIds.album}?uat=draft`);
  await expect(page.getByText('Pilihan paket album')).toHaveCount(0);
});

test('H28 uses only active fixture categories and sends the chosen server ID', async ({ page }) => {
  await installUatApi(page);
  let savedCategory: string | undefined;
  page.on('request', (request) => {
    if (request.url().endsWith(`/albums/${uatIds.album}`) && request.method() === 'PATCH') {
      savedCategory = (request.postDataJSON() as { event_category_id: string }).event_category_id;
      expect(request.headers()['x-csrf-token']).toBe('owner-uat-csrf');
    }
  });
  await page.goto(`/album/${uatIds.album}/setup/acara`);
  const categories = page.getByRole('radiogroup', { name: 'Kategori acara' });
  await expect(categories.getByRole('radio')).toHaveCount(5);
  for (const label of ['Pernikahan', 'Olahraga', 'Meeting', 'Pesta', 'Komunitas']) await expect(categories.getByRole('radio', { name: label })).toBeVisible();
  await categories.getByRole('radio', { name: 'Olahraga' }).focus();
  await page.keyboard.press('Space');
  await expect(categories.getByRole('radio', { name: 'Olahraga' })).toBeChecked();
  await page.getByRole('button', { name: 'Simpan informasi acara' }).click();
  await expect.poll(() => savedCategory).toBe(uatCategories[1].category_id);

  await page.route('**/api/v1/event-categories', (route) => route.fulfill({ status: 200, json: { data: [{ ...uatCategories[0], active: false }], meta: { has_more: false, next_cursor: null } } }));
  await page.reload();
  await expect(categories.getByRole('radio')).toHaveCount(0);
  await expect(page.getByText('Belum ada kategori acara aktif.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan informasi acara' })).toBeDisabled();

  await page.route(albumRoute, (route) => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } }));
  await page.reload();
  await expect(page.getByText('Akses tidak tersedia')).toBeVisible();
  await expect(categories.getByRole('radio')).toHaveCount(0);
});

test('H33 presents seven human-readable choices in a 4-left/3-right desktop layout and preserves save payloads', async ({ page }) => {
  await installUatApi(page);
  const saves: Array<string | null> = [];
  page.on('request', (request) => {
    if (request.url().endsWith(`/albums/${uatIds.album}/setup/package`) && request.method() === 'PUT') {
      saves.push((request.postDataJSON() as { package_version_id: string | null }).package_version_id);
      expect(request.headers()['x-csrf-token']).toBe('owner-uat-csrf');
    }
  });
  await page.goto(`/album/${uatIds.album}/setup/paket`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('radio', { name: /Paket Gratis/ })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(7);
  await expect(page.getByText(/LOCKED\d+/)).toHaveCount(0);
  const columns = page.getByTestId('setup-package-column');
  await expect(columns).toHaveCount(2);
  await expect(columns.nth(0).getByRole('radio')).toHaveCount(4);
  await expect(columns.nth(1).getByRole('radio')).toHaveCount(3);
  const leftBox = await columns.nth(0).boundingBox();
  const rightBox = await columns.nth(1).boundingBox();
  expect(rightBox?.x ?? 0).toBeGreaterThan(leftBox?.x ?? 0);
  expect(uatPackages.map((option) => [option.quota_total, option.price_amount])).toEqual([
    [100, 100000], [250, 230000], [500, 450000], [700, 620000], [1000, 840000], [10000, 1100000],
  ]);
  expect(new Set(uatPackages.map((option) => option.package_version_id)).size).toBe(6);
  expect(uatPackages.every((option) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(option.package_version_id))).toBe(true);
  await expect(page.getByText(/·\s*10\.000 foto$/)).toBeVisible();
  await page.getByRole('radio', { name: /Paket 250 Foto/ }).check();
  await page.getByRole('button', { name: 'Simpan pilihan paket' }).click();
  await expect.poll(() => saves.length).toBe(1);
  expect(saves[0]).toBe(uatPackages[1].package_version_id);
  await page.getByRole('radio', { name: /Paket Gratis/ }).check();
  await page.getByRole('button', { name: 'Simpan pilihan paket' }).click();
  await expect.poll(() => saves.length).toBe(2);
  expect(saves[1]).toBeNull();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLeftBox = await columns.nth(0).boundingBox();
  const mobileRightBox = await columns.nth(1).boundingBox();
  expect(Math.abs((mobileLeftBox?.x ?? 0) - (mobileRightBox?.x ?? 0))).toBeLessThan(2);
  expect(mobileRightBox?.y ?? 0).toBeGreaterThan(mobileLeftBox?.y ?? 0);
  const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client + 1);

  await page.route('**/api/v1/packages', (route) => route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } }));
  await page.reload();
  await expect(page.getByRole('radio')).toHaveCount(1);
  await expect(page.getByRole('radio', { name: /Paket Gratis/ })).toBeVisible();

  await page.route('**/api/v1/packages', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE' } } }));
  await page.reload();
  await expect(page.getByText('Album belum dapat dimuat')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});
