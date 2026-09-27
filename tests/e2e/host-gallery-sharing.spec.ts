import { expect, test } from '@playwright/test';

const albumId = '33333333-3333-4333-8333-333333333333';
const photoId = '44444444-4444-4444-8444-444444444444';
let status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' = 'PENDING';
let deleted = false;

function managementPhoto() {
  return {
    photo_id: photoId, moderation_status: status, created_at: '2026-09-27T00:00:00Z', photographer_display_name: 'Ari', like_count: 1,
    media: { url: 'https://media.test/host/photo', expires_at: '2026-09-27T00:05:00Z' },
    actions: { can_approve: status === 'PENDING', can_hide: status === 'PUBLISHED', can_unhide: status === 'HIDDEN', can_delete: true, can_download: false, can_share: false },
  };
}

async function mockHostBase(page: import('@playwright/test').Page) {
  await page.addInitScript(() => { window.confirm = () => true; });
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ status: 200, json: { data: { csrf_token: 'host-csrf' } } }));
  await page.route(`**/api/v1/albums/${albumId}/settings`, async (route) => {
    if (route.request().method() === 'PATCH') return route.fulfill({ status: 200, json: { data: {} } });
    return route.fulfill({ status: 200, json: { data: { revision: 2, visibility: 'GUEST_VISIBLE', moderation_mode: 'APPROVAL', likes_enabled: true, downloads_enabled: false, share_enabled: true, per_guest_limit: 10 } } });
  });
  await page.route(`**/api/v1/albums/${albumId}/photos/trash**`, (route) => route.fulfill({ status: 200, json: { data: deleted ? [{ ...managementPhoto(), deleted_at: '2026-09-27T00:01:00Z', can_restore: true }] : [], meta: { has_more: false, next_cursor: null } } }));
  await page.route(new RegExp(`/api/v1/albums/${albumId}/photos(?:\\?.*)?$`), (route) => route.fulfill({ status: 200, json: { data: deleted ? [] : [managementPhoto()], meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}`, (route) => route.fulfill({ status: 200, json: { data: managementPhoto() } }));
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}/approve`, (route) => { status = 'PUBLISHED'; return route.fulfill({ status: 200, json: { data: managementPhoto() } }); });
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}/hide`, (route) => { status = 'HIDDEN'; return route.fulfill({ status: 200, json: { data: managementPhoto() } }); });
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}/unhide`, (route) => { status = 'PUBLISHED'; return route.fulfill({ status: 200, json: { data: managementPhoto() } }); });
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}`, async (route) => {
    if (route.request().method() === 'DELETE') { deleted = true; return route.fulfill({ status: 200, json: { data: managementPhoto() } }); }
    return route.fulfill({ status: 200, json: { data: managementPhoto() } });
  });
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}/restore`, (route) => { deleted = false; return route.fulfill({ status: 200, json: { data: managementPhoto() } }); });
  await page.route('https://media.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }));
}

test('Host moderates, soft deletes and restores without implying quota release', async ({ page }) => {
  status = 'PENDING'; deleted = false;
  await mockHostBase(page);
  await page.goto(`/album/${albumId}/galeri`);
  await expect(page.getByRole('heading', { name: 'Galeri album' })).toBeVisible();
  await page.getByRole('button', { name: 'Setujui' }).click();
  await expect.poll(() => status).toBe('PUBLISHED');
  await page.getByRole('button', { name: 'Sembunyikan' }).click();
  await expect.poll(() => status).toBe('HIDDEN');
  await page.getByRole('button', { name: 'Tampilkan kembali' }).click();
  await expect.poll(() => status).toBe('PUBLISHED');
  await page.getByRole('button', { name: 'Hapus foto' }).click();
  await expect.poll(() => deleted).toBe(true);
  await page.getByRole('link', { name: 'Sampah' }).click();
  await expect(page.getByRole('heading', { name: 'Sampah' })).toBeVisible();
  await expect(page.getByText(/Foto yang dihapus tetap dihitung dalam kapasitas album/)).toBeVisible();
  await page.getByRole('button', { name: 'Pulihkan' }).click();
  await expect.poll(() => deleted).toBe(false);
});

test('Owner QR retrieval, explicit link rotation, and QR PDF download use local QR rendering', async ({ page }) => {
  let currentUrl = 'https://kepotret.test/j/current-old';
  await page.route(`**/api/v1/albums/${albumId}/sharing`, (route) => route.fulfill({ status: 200, json: { data: { url: currentUrl, can_rotate: true } } }));
  await page.route(`**/api/v1/albums/${albumId}/access-link/rotate`, (route) => { currentUrl = 'https://kepotret.test/j/current-new'; return route.fulfill({ status: 200, json: { data: { url: currentUrl, can_rotate: true } } }); });
  await page.route(`**/api/v1/albums/${albumId}/qr.pdf`, (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.7 test' }));
  await page.goto(`/album/${albumId}/berbagi`);
  await expect(page.getByRole('textbox', { name: 'Tautan tamu' })).toHaveValue('https://kepotret.test/j/current-old');
  await expect(page.locator('svg title')).toContainText('Kode QR untuk membuka tautan acara');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Perbarui tautan akses' }).click();
  await expect(page.getByRole('textbox', { name: 'Tautan tamu' })).toHaveValue('https://kepotret.test/j/current-new');
  await expect(page.getByRole('textbox')).not.toHaveValue('https://kepotret.test/j/current-old');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh QR PDF' }).click();
  await download;
});

test('active WO/EO can retrieve the QR/PDF surface without seeing link rotation', async ({ page }) => {
  await page.route(`**/api/v1/albums/${albumId}/sharing`, (route) => route.fulfill({ status: 200, json: { data: { url: 'https://kepotret.test/j/active', can_rotate: false } } }));
  await page.route(`**/api/v1/albums/${albumId}/qr.pdf`, (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.7 test' }));
  await page.goto(`/album/${albumId}/berbagi/panduan`);
  await expect(page.getByRole('textbox', { name: 'Tautan tamu' })).toHaveValue('https://kepotret.test/j/active');
  await expect(page.getByRole('button', { name: 'Perbarui tautan akses' })).not.toBeVisible();
  await expect(page.locator('svg title')).toContainText('Kode QR untuk membuka tautan acara');
});

test('Host gallery works without horizontal overflow on desktop and small workspace widths', async ({ page }) => {
  status = 'PENDING'; deleted = false;
  await mockHostBase(page);
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto(`/album/${albumId}/galeri`);
    await expect(page.getByRole('heading', { name: 'Galeri album' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
