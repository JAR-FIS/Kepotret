import { expect, test } from '@playwright/test';
import type { AlbumDetail, AlbumListEnvelope, AlbumEnvelope } from '../../src/lib/api/generated/index.schemas';

const albumId = '11111111-1111-4111-8111-111111111111';
const draft: AlbumDetail = {
  album_id: albumId,
  readiness: 'DRAFT',
  capture_state: 'NOT_STARTED',
  reveal_state: 'HIDDEN',
  setup_revision: 1,
  schedule_version: 0,
  access_version: 0,
  export_revision: 0,
  guest_count_final: null,
};

test('Host can create a draft and visit the FE-3 setup routes using contract-shaped API responses', async ({ page }) => {
  const albumList: AlbumListEnvelope = { data: [], meta: { next_cursor: null, has_more: false } };
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route('**/api/v1/albums', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      const body = route.request().postDataJSON() as { timezone?: string };
      expect(body.timezone).toBeTruthy();
      const response: AlbumEnvelope = { data: draft };
      return route.fulfill({ status: 201, json: response });
    }
    return route.fulfill({ status: 200, json: albumList });
  });
  await page.route(`**/api/v1/albums/${albumId}`, (route) => route.fulfill({ status: 200, json: { data: draft } }));
  await page.route(`**/api/v1/albums/${albumId}/collaborator-invitations`, (route) => route.fulfill({ status: 200, json: { data: [], meta: { has_more: false } } }));
  await page.route('**/api/v1/packages', (route) => route.fulfill({ status: 200, json: { data: [{ package_version_id: 'pkg-v1', price_amount: 0, currency: 'IDR', quota_total: 30 }], meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/albums/${albumId}/review`, (route) => route.fulfill({ status: 200, json: { data: draft } }));
  await page.route(`**/api/v1/albums/${albumId}/schedule`, async (route) => {
    expect(route.request().method()).toBe('PUT');
    const body = route.request().postDataJSON() as { expected_revision: number; capture_start: string; capture_end: string; reveal_delay_days: number };
    expect(body.expected_revision).toBe(1);
    expect(body.reveal_delay_days).toBe(3);
    expect(body.capture_start).toMatch(/Z$/);
    expect(body.capture_end).toMatch(/Z$/);
    return route.fulfill({ status: 200, json: { data: { ...body, reveal_at: body.capture_end, payment_cutoff_at: body.capture_end, schedule_version: 1 } } });
  });

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Buat Album' }).first().click();
  await expect(page).toHaveURL('/album/baru');
  await page.getByRole('button', { name: 'Buat draft dan lanjutkan' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/setup/acara`);

  for (const [step, label] of [
    ['jadwal', 'Jadwal & reveal'],
    ['akses', 'Akses & privasi'],
    ['moderasi', 'Batas & moderasi'],
    ['desain', 'Desain'],
    ['paket', 'Paket'],
    ['kolaborator', 'Kolaborator'],
    ['review', 'Review setup'],
  ]) {
    await page.getByRole('navigation', { name: 'Persiapan album' }).getByRole('link', { name: new RegExp(`${label}$`) }).click();
    await expect(page).toHaveURL(`/album/${albumId}/setup/${step}`);
    if (step === 'jadwal') {
      const { start, end } = await page.evaluate(() => {
        const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T10:00`;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        return { start: format(startDate), end: format(endDate) };
      });
      await page.getByLabel('Tanggal dan waktu mulai').fill(start);
      await page.getByLabel('Tanggal dan waktu selesai').fill(end);
      await page.getByLabel('Jeda reveal').selectOption('3');
      await page.getByRole('button', { name: 'Simpan jadwal' }).click();
      await expect(page.getByRole('status')).toContainText('Jadwal berhasil disimpan.');
    }
    if (step === 'moderasi') {
      const limit = page.getByRole('combobox', { name: 'Batas foto per peserta' });
      await expect(limit.locator('option')).toHaveCount(7);
    }
    if (step === 'kolaborator') {
      await expect(page.getByRole('heading', { name: 'Undang kolaborator' })).toBeVisible();
      await expect(page.getByRole('checkbox')).toHaveCount(3);
    }
  }

  await page.goto(`/album/${albumId}/siap`);
  await expect(page.getByRole('heading', { name: 'Album belum siap' })).toBeVisible();

  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
});
