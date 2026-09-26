import { expect, test } from '@playwright/test';
import type { AlbumDetail, AlbumListEnvelope, AlbumEnvelope, AlbumSchedule } from '../../src/lib/api/generated/index.schemas';

const albumId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const paidPackageId = '33333333-3333-4333-8333-333333333333';
let album: AlbumDetail;

test('Host completes the FE-3 setup flow using generated-contract-compatible API responses', async ({ page }) => {
  album = {
    album_id: albumId, event_name: null, event_location: null, event_category_id: null,
    timezone: 'Asia/Jakarta', capture_start: null, capture_end: null,
    selected_package_version_id: null, readiness: 'DRAFT', capture_state: 'NOT_STARTED',
    reveal_state: 'HIDDEN', setup_revision: 1, schedule_version: 0, access_version: 0,
    export_revision: 0, confirmed_setup_revision: null, confirmed_schedule_version: null,
    confirmed_package_version_id: null, setup_confirmed_at: null, guest_count_final: null,
    quota_total: null, committed_count: null,
  };
  const albumList: AlbumListEnvelope = { data: [], meta: { next_cursor: null, has_more: false } };
  let schedule: AlbumSchedule = {
    capture_start: '2026-10-01T03:00:00Z', capture_end: '2026-10-02T03:00:00Z',
    reveal_delay_days: 3 as const, reveal_at: '2026-10-05T03:00:00Z',
    payment_cutoff_at: '2026-10-02T01:00:00Z', schedule_version: 1,
  };

  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route('**/api/v1/event-categories', (route) => route.fulfill({ status: 200, json: { data: [{ category_id: categoryId, code: 'WEDDING', label_id: 'Pernikahan', label_en: 'Wedding', display_order: 1, active: true }], meta: { has_more: false, next_cursor: null } } }));
  await page.route('**/api/v1/albums', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      expect((route.request().postDataJSON() as { timezone?: string }).timezone).toBeTruthy();
      return route.fulfill({ status: 201, json: { data: album } satisfies AlbumEnvelope });
    }
    return route.fulfill({ status: 200, json: albumList });
  });
  await page.route(`**/api/v1/albums/${albumId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { expected_revision: number; event_name: string; event_location: string; event_category_id: string; timezone: string };
      expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
      expect(body.expected_revision).toBe(album.setup_revision);
      expect(body.event_name).not.toBe('Turnamen Badminton PB Bima Sakti');
      expect(body.event_name).toBe('Kepotret E2E Wedding');
      expect(body.event_location).toBe('Jakarta');
      expect(body.event_category_id).toBe(categoryId);
      expect(body.timezone).toBe('Asia/Jakarta');
      album = { ...album, ...body, setup_revision: album.setup_revision + 1 };
      return route.fulfill({ status: 200, json: { data: album } });
    }
    return route.fulfill({ status: 200, json: { data: album } });
  });
  await page.route(`**/api/v1/albums/${albumId}/collaborator-invitations`, (route) => route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } }));
  await page.route('**/api/v1/packages', (route) => route.fulfill({ status: 200, json: { data: [{ package_id: '44444444-4444-4444-8444-444444444444', package_version_id: paidPackageId, code: 'GUEST100', name: 'Guest 100', price_amount: 75000, currency: 'IDR', quota_total: 100 }], meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/albums/${albumId}/schedule`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { data: schedule } });
    const body = route.request().postDataJSON() as { expected_revision: number; capture_start: string; capture_end: string; reveal_delay_days: 1 | 3 | 5 | 7 };
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(body.expected_revision).toBe(album.setup_revision);
    expect(body.reveal_delay_days).toBe(3);
    expect(body.capture_start).toMatch(/Z$/);
    expect(body.capture_end).toMatch(/Z$/);
    schedule = { ...body, reveal_at: body.capture_end, payment_cutoff_at: new Date(Date.parse(body.capture_end) - 120 * 60 * 1000).toISOString(), schedule_version: 1 };
    album = { ...album, capture_start: body.capture_start, capture_end: body.capture_end, schedule_version: 1, setup_revision: album.setup_revision + 1 };
    return route.fulfill({ status: 200, json: { data: schedule } });
  });
  await page.route(`**/api/v1/albums/${albumId}/design`, (route) => route.fulfill({ status: 200, json: { data: { cover_asset_id: null, setup_revision: album.setup_revision } } }));
  await page.route(`**/api/v1/albums/${albumId}/setup/package`, async (route) => {
    const body = route.request().postDataJSON() as { expected_revision: number; package_version_id: string | null };
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(body.expected_revision).toBe(album.setup_revision);
    expect(body.package_version_id).toBe(paidPackageId);
    album = { ...album, selected_package_version_id: body.package_version_id, setup_revision: album.setup_revision + 1 };
    return route.fulfill({ status: 200, json: { data: album } });
  });
  const review = () => ({ data: {
    album_id: albumId, setup_revision: album.setup_revision, complete: true, issues: [],
    snapshot: {
      event_basics: { event_name: album.event_name!, event_location: album.event_location!, event_category_id: categoryId, timezone: album.timezone },
      schedule, access: { pin_enabled: false }, settings: { per_guest_limit: null },
      design: { cover_asset_id: null, setup_revision: album.setup_revision },
      selected_package_version_id: album.selected_package_version_id, collaborator_count: 0,
    },
  } });
  await page.route(`**/api/v1/albums/${albumId}/review`, (route) => route.fulfill({ status: 200, json: review() }));
  await page.route(`**/api/v1/albums/${albumId}/confirm-setup`, async (route) => {
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({ expected_setup_revision: album.setup_revision });
    album = { ...album, readiness: 'PAYMENT_PENDING', confirmed_setup_revision: album.setup_revision, confirmed_schedule_version: album.schedule_version, confirmed_package_version_id: paidPackageId, setup_confirmed_at: new Date().toISOString() };
    return route.fulfill({ status: 200, json: { data: album } });
  });

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Buat Album' }).first().click();
  await expect(page).toHaveURL('/album/baru');
  await page.getByRole('button', { name: 'Buat draft dan lanjutkan' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/setup/acara`);

  await page.getByLabel('Nama acara').fill('Kepotret E2E Wedding');
  await page.getByLabel('Lokasi acara').fill('Jakarta');
  await page.getByText('Pernikahan', { exact: true }).click();
  await page.getByRole('button', { name: 'Simpan informasi acara' }).click();
  await expect(page.getByRole('status')).toContainText('Informasi acara berhasil disimpan.');

  await page.getByRole('navigation', { name: 'Persiapan album' }).getByRole('link', { name: /Jadwal & reveal$/ }).click();
  const { start, end } = await page.evaluate(() => {
    const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T10:00`;
    const startDate = new Date(); startDate.setDate(startDate.getDate() + 2);
    const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1);
    return { start: format(startDate), end: format(endDate) };
  });
  await page.getByLabel('Tanggal dan waktu mulai').fill(start);
  await page.getByLabel('Tanggal dan waktu selesai').fill(end);
  await page.getByLabel('Jeda reveal').selectOption('3');
  await page.getByRole('button', { name: 'Simpan jadwal' }).click();
  await expect(page.getByRole('status')).toContainText('Jadwal berhasil disimpan.');

  await page.getByRole('navigation', { name: 'Persiapan album' }).getByRole('link', { name: /Paket$/ }).click();
  await expect(page.getByText(/Guest 100/)).toBeVisible();
  await expect(page.getByText(/75[.,]000/)).toBeVisible();
  await page.getByText(/Guest 100/).click();
  await page.getByRole('button', { name: 'Simpan pilihan paket' }).click();
  await expect(page.getByRole('status')).toContainText('Pilihan paket berhasil disimpan.');

  for (const [step, label] of [['akses', 'Akses & privasi'], ['moderasi', 'Batas & moderasi'], ['desain', 'Desain'], ['kolaborator', 'Kolaborator']]) {
    await page.getByRole('navigation', { name: 'Persiapan album' }).getByRole('link', { name: new RegExp(`${label}$`) }).click();
    await expect(page).toHaveURL(`/album/${albumId}/setup/${step}`);
    if (step === 'moderasi') await expect(page.getByRole('combobox', { name: 'Batas foto per peserta' }).locator('option')).toHaveCount(7);
    if (step === 'desain') await expect(page.getByText('Belum ada sampul yang dipilih.')).toBeVisible();
    if (step === 'kolaborator') await expect(page.getByRole('checkbox')).toHaveCount(3);
  }

  await page.getByRole('navigation', { name: 'Persiapan album' }).getByRole('link', { name: /Review setup$/ }).click();
  await expect(page.getByText('Server menyatakan setup telah lengkap.')).toBeVisible();
  await page.getByRole('button', { name: 'Konfirmasi setup' }).click();
  await expect(page.getByRole('status')).toContainText('Server mengembalikan PAYMENT_PENDING');

  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
});
