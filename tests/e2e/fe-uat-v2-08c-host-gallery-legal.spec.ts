import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { legalDrafts } from '../../src/features/marketing/legal-draft-content';
import { uatIds } from '../uat/constants';
import { makeAlbum } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

const album = `/album/${uatIds.album}`;
const jobId = '77777777-7777-4777-8777-777777777777';
const evidenceDirectory = resolve(process.cwd(), 'docs/reviews/FE-UAT-V2-08-C/evidence');
const candidates = [1, 2, 3].map((index) => ({ photo_id: `88888888-8888-4888-8888-88888888888${index}`, photographer_display_name: `Guest ${index}`, created_at: '2026-10-01T00:00:00Z' }));

async function capture(page: Page, name: string) {
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.evaluate(() => {
    if (document.getElementById('v2-08c-synthetic-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'v2-08c-synthetic-badge';
    badge.textContent = 'OWNER VISUAL UAT · SYNTHETIC FIXTURES';
    badge.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;padding:6px 10px;border-radius:6px;background:#111;color:#fff;font:700 11px Arial,sans-serif;pointer-events:none';
    document.body.append(badge);
  });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function mockGalleryExport(page: Page, options: { allowed?: boolean; cap?: number; createStatus?: number } = {}) {
  await installUatApi(page);
  const allowed = options.allowed ?? true;
  const cap = options.cap ?? 2;
  let posts = 0;
  let body: unknown;
  await page.route(`**/api/v1/albums/${uatIds.album}`, (route) => {
    const data = makeAlbum('ready', !allowed);
    if (!allowed) data.actor_access = { relationship: 'COLLABORATOR', collaborator_permissions: { can_setup: false, can_moderate: true, can_export_zip: false }, permission_version: 1 };
    return route.fulfill({ status: 200, json: { data } });
  });
  await page.route(`**/api/v1/albums/${uatIds.album}/export-capabilities`, (route) => route.fulfill({ status: 200, json: { data: { max_photos_per_job: cap, eligible_photo_count: candidates.length, allow_all: true, allow_selected: allowed } } }));
  await page.route(`**/api/v1/albums/${uatIds.album}/export-selection/photos**`, (route) => route.fulfill({ status: 200, json: { data: candidates, meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/albums/${uatIds.album}/exports`, (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } });
    posts += 1;
    body = route.request().postDataJSON();
    expect(route.request().headers()['x-csrf-token']).toBeTruthy();
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    if (options.createStatus && options.createStatus !== 201) return route.fulfill({ status: options.createStatus, json: { error: { code: 'SYNTHETIC_FAILURE' } } });
    return route.fulfill({ status: 201, json: { data: { export_job_id: jobId, album_id: uatIds.album, status: 'QUEUED', mode: 'SELECTED', selected_count: 2, source_export_revision: 1, processed_count: 0, total_count: 2, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', output_expires_at: null } } });
  });
  await page.route(`**/api/v1/exports/${jobId}`, (route) => route.fulfill({ status: 200, json: { data: { export_job_id: jobId, album_id: uatIds.album, status: 'READY', mode: 'SELECTED', selected_count: 2, source_export_revision: 1, processed_count: 2, total_count: 2, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:01:00Z', output_expires_at: '2026-10-02T10:01:00Z' } } }));
  await page.route(`**/api/v1/exports/${jobId}/download`, (route) => route.fulfill({ status: 200, json: { data: { url: 'https://files.test/host-export.zip', expires_at: '2026-10-02T10:01:00Z' } } }));
  return { count: () => posts, body: () => body };
}

test('H42 browse and authorized selected export creates one server job @release-critical', async ({ page }) => {
  const exportRequest = await mockGalleryExport(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${album}/galeri`);
  await expect(page.getByRole('heading', { name: 'Galeri album' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pilih foto' })).toBeVisible();
  expect(await page.getByRole('checkbox').count()).toBe(0);
  await capture(page, 'h42-grid-desktop-1440-id-light');
  await page.getByRole('button', { name: 'Tampilan daftar' }).click();
  await expect(page.getByRole('button', { name: 'Tampilan daftar' })).toHaveAttribute('aria-pressed', 'true');
  await capture(page, 'h42-list-desktop-1440-id-light');
  await page.getByRole('button', { name: 'Pilih foto' }).click();
  await expect(page.getByRole('status')).toContainText('0 terpilih / maksimal 2');
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  await capture(page, 'h42-zero-selected-desktop-1440-id-light');
  await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 1' }).click();
  await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 2' }).click();
  await expect(page.getByRole('checkbox', { name: 'Pilih foto dari Guest 3' })).toBeDisabled();
  await capture(page, 'h42-cap-selected-desktop-1440-id-light');
  await page.getByRole('button', { name: 'Unduh ZIP' }).click();
  await expect(page.getByRole('dialog', { name: 'Buat ZIP dari foto pilihan?' })).toContainText('pekerjaan ZIP di server');
  await capture(page, 'h42-confirm-desktop-1440-id-light');
  await page.getByRole('dialog').getByRole('button', { name: 'Buat pekerjaan ZIP' }).click();
  await expect(page).toHaveURL(`${album}/ekspor/${jobId}`);
  expect(exportRequest.count()).toBe(1);
  expect(exportRequest.body()).toEqual({ mode: 'SELECTED', photo_ids: [candidates[0]!.photo_id, candidates[1]!.photo_id] });
  await expect(page.getByText('Siap diunduh')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeEnabled();
  await capture(page, 'h42-export-job-ready-desktop-1440-id-light');
});

test('H42 mobile English dark grid/list/selection and 320px overflow', async ({ page }) => {
  await mockGalleryExport(page);
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', url: 'http://localhost:3000' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${album}/galeri`);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Select photos' })).toBeVisible();
  await capture(page, 'h42-grid-mobile-390-en-dark');
  await page.getByRole('button', { name: 'List view' }).click();
  await capture(page, 'h42-list-mobile-390-en-dark');
  await page.getByRole('button', { name: 'Select photos' }).click();
  await expect(page.getByText('0 selected / maximum 2')).toBeVisible();
  await capture(page, 'h42-zero-selected-mobile-390-en-dark');
  await page.getByRole('checkbox', { name: 'Select photo by Guest 1' }).click();
  await capture(page, 'h42-selected-mobile-390-en-dark');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Done selecting' }).click();
  await page.getByRole('button', { name: 'Grid view' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('H42 shows an honest server-disabled selection state', async ({ page }) => {
  await mockGalleryExport(page);
  await page.route(`**/api/v1/albums/${uatIds.album}/export-capabilities`, (route) => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 2, eligible_photo_count: 0, allow_all: true, allow_selected: false } } }));
  await page.goto(`${album}/galeri`);
  await page.getByRole('button', { name: 'Pilih foto' }).click();
  await expect(page.getByText('Ekspor foto pilihan belum tersedia untuk album ini.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  await capture(page, 'h42-capability-disabled-desktop-1440-id-light');
});

test('H42 empty gallery and failed-photo-list screens remain explicit', async ({ page }) => {
  await mockGalleryExport(page);
  await page.route(new RegExp(`/api/v1/albums/${uatIds.album}/photos(?:\\?.*)?$`), (route) => route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } }));
  await page.goto(`${album}/galeri`);
  await expect(page.getByText('Belum ada foto di bagian ini')).toBeVisible();
  await capture(page, 'h42-empty-desktop-1440-id-light');
  await page.route(new RegExp(`/api/v1/albums/${uatIds.album}/photos(?:\\?.*)?$`), (route) => route.fulfill({ status: 503, json: { error: { code: 'SYNTHETIC_FAILURE' } } }));
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: 'Foto belum dapat dimuat' })).toBeVisible();
  await capture(page, 'h42-error-desktop-1440-id-light');
});

test('H42 restricted collaborator cannot start selected export', async ({ page }) => {
  const restricted = await mockGalleryExport(page, { allowed: false });
  await page.goto(`${album}/galeri`);
  await expect(page.getByRole('button', { name: 'Pilih foto' })).toBeDisabled();
  await expect(page.getByText(/Izin ekspor ZIP tidak tersedia/)).toBeVisible();
  expect(restricted.count()).toBe(0);
  await capture(page, 'h42-collaborator-restricted-desktop-1440-id-light');
});

test('H42 rate-limited export preserves the selection without automatic retry', async ({ page }) => {
  const failure = await mockGalleryExport(page, { createStatus: 429 });
  await page.goto(`${album}/galeri`);
  await page.getByRole('button', { name: 'Pilih foto' }).click();
  await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 1' }).click();
  await page.getByRole('button', { name: 'Unduh ZIP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Buat pekerjaan ZIP' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Terlalu banyak permintaan' })).toBeVisible();
  expect(failure.count()).toBe(1);
});

for (const status of [401, 403, 409, 422, 503]) {
  test(`H42 export HTTP ${status} stays on the gallery without an automatic second POST`, async ({ page }) => {
    const request = await mockGalleryExport(page, { createStatus: status });
    await page.goto(`${album}/galeri`);
    await page.getByRole('button', { name: 'Pilih foto' }).click();
    await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 1' }).click();
    await page.getByRole('button', { name: 'Unduh ZIP' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Buat pekerjaan ZIP' }).click();
    const expected = status === 401 ? 'Sesi perlu diperbarui' : status === 403 ? 'Izin ekspor tidak tersedia lagi' : status === 409 || status === 422 ? 'Pilihan foto atau izin ekspor berubah' : 'Pekerjaan ekspor belum dapat dibuat';
    await expect(page.getByRole('alert').filter({ hasText: expected })).toBeVisible();
    await expect(page).toHaveURL(`${album}/galeri`);
    expect(request.count()).toBe(1);
    if (status === 409 || status === 422) await expect(page.getByText('0 terpilih / maksimal 2')).toBeVisible();
    if (status === 401 || status === 403) await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  });
}

test('H42 offline mode disables export before a POST', async ({ page }) => {
  const request = await mockGalleryExport(page);
  await page.goto(`${album}/galeri`);
  await page.getByRole('button', { name: 'Pilih foto' }).click();
  await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 1' }).click();
  await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); window.dispatchEvent(new Event('offline')); });
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  expect(request.count()).toBe(0);
});

test('H42 server cap revocation clears selection before export', async ({ page }) => {
  const request = await mockGalleryExport(page);
  let cap = 2;
  await page.route(`**/api/v1/albums/${uatIds.album}/export-capabilities`, (route) => route.fulfill({ status: 200, json: { data: { max_photos_per_job: cap, eligible_photo_count: 3, allow_all: true, allow_selected: true } } }));
  await page.goto(`${album}/galeri`);
  await page.getByRole('button', { name: 'Pilih foto' }).click();
  await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 1' }).click();
  await page.getByRole('checkbox', { name: 'Pilih foto dari Guest 2' }).click();
  cap = 1;
  await page.getByRole('button', { name: 'Unduh ZIP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Buat pekerjaan ZIP' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Pilihan foto atau izin ekspor berubah' })).toBeVisible();
  await expect(page.getByText('0 terpilih / maksimal 1')).toBeVisible();
  expect(request.count()).toBe(0);
});

test('H06/H07 full bilingual drafts remain visibly ineffective, responsive and SSR visible', async ({ page }) => {
  for (const kind of ['privacy', 'terms'] as const) {
    const path = kind === 'privacy' ? '/kebijakan-privasi' : '/syarat-ketentuan';
    for (const variant of [{ width: 1440, height: 900, locale: 'id', theme: 'light', suffix: 'desktop-1440-id-light' }, { width: 390, height: 844, locale: 'en', theme: 'dark', suffix: 'mobile-390-en-dark' }] as const) {
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await page.context().addCookies([{ name: 'kepotret-locale', value: variant.locale, url: 'http://localhost:3000' }]);
      await page.goto(path);
      await page.evaluate((theme) => localStorage.setItem('kepotret-theme', theme), variant.theme);
      await page.reload();
      const draft = legalDrafts[variant.locale][kind];
      await expect(page.getByRole('status')).toContainText(draft.notice);
      await expect(page.getByRole('navigation', { name: draft.toc }).getByRole('link')).toHaveCount(draft.sections.length);
      for (const section of draft.sections) await expect(page.getByRole('heading', { name: new RegExp(section.title) })).toBeVisible();
      await expect(page.getByRole('complementary').getByRole('link', { name: draft.help })).toHaveAttribute('href', '/bantuan');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await capture(page, `h${kind === 'privacy' ? '06' : '07'}-${variant.suffix}`);
    }
    const html = await (await page.request.get(path)).text();
    expect(html).toMatch(/DRAF UNTUK PENINJAUAN OWNER|DRAFT FOR OWNER REVIEW/);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/kebijakan-privasi');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('main.public-page-enter')).toHaveCSS('animation-name', 'none');
});
