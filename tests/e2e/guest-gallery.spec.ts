import { expect, test } from '@playwright/test';

const linkId = '11111111-1111-4111-8111-111111111111';
const photoId = '22222222-2222-4222-8222-222222222222';
const mediaUrl = 'https://media.test/delivery/photo-1';
const event = {
  guest_session: { guest_session_id: 'guest-1', album_id: 'album-1', display_name: 'Guest', created_at: '2026-09-27T00:00:00Z' },
  event: { album_id: 'album-1', event_name: 'FE5 Gallery E2E', event_location: null, timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, reveal_at: '2026-09-27T00:00:00Z', capture_state: 'CLOSED', reveal_state: 'REVEALED' },
};
const photo = {
  photo_id: photoId,
  created_at: '2026-09-27T01:00:00Z',
  photographer_display_name: 'Ari',
  like_count: 4,
  media: { url: mediaUrl, expires_at: '2026-09-27T01:05:00Z' },
  actions: { can_like: true, liked_by_me: false, can_download: true, can_share: true },
};

async function mockGuest(page: import('@playwright/test').Page, state: 'REVEALED' | 'HIDDEN' | 'ENDED' = 'REVEALED') {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as Window & { copied?: string }).copied = value; }, readText: async () => (window as Window & { copied?: string }).copied ?? '' } });
  });
  await page.route('**/api/v1/guest/me', (route) => state === 'ENDED'
    ? route.fulfill({ status: 410, json: { error: { code: 'GUEST_ACCESS_ENDED', message: 'Access ended.' } } })
    : route.fulfill({ status: 200, json: { data: { ...event, event: { ...event.event, reveal_state: state } } } }));
  await page.route('**/api/v1/guest/gallery/photos**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const cursor = requestUrl.searchParams.get('cursor');
    return route.fulfill({ status: 200, json: { data: cursor ? [photo, { ...photo, photo_id: 'photo-2', photographer_display_name: 'Bima' }] : [photo], meta: { has_more: !cursor, next_cursor: cursor ? null : 'cursor-1' } } });
  });
  await page.route(`**/api/v1/guest/gallery/photos/${photoId}`, (route) => route.fulfill({ status: 200, json: { data: photo } }));
  await page.route(`**/api/v1/guest/gallery/photos/${photoId}/like`, (route) => route.fulfill({ status: 200, json: { data: { ...photo, like_count: 5, actions: { ...photo.actions, liked_by_me: true } } } }));
  await page.route(`**/api/v1/guest/gallery/photos/${photoId}/share-link`, (route) => route.fulfill({ status: 200, json: { data: { url: `http://localhost:3000/j/${linkId}/galeri/${photoId}`, photo_id: photoId } } }));
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ status: 200, json: { data: { csrf_token: 'csrf-fe5' } } }));
  await page.route(`**/api/v1/guest/gallery/photos/${photoId}/download`, (route) => route.fulfill({ status: 200, json: { data: { url: 'https://media.test/download/photo-1', expires_at: '2026-09-27T01:05:00Z' } } }));
  await page.route('https://media.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }));
  await page.route('https://media.test/download/**', (route) => route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'content-disposition': 'attachment; filename="photo.jpg"' }, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }));
}

test('guest gallery paginates, sorts, opens detail, likes once, downloads, copies and shares the current deep link @release-critical', async ({ page }) => {
  await mockGuest(page);
  await page.goto(`/j/${linkId}/galeri`);
  await expect(page.getByRole('heading', { name: 'FE5 Gallery E2E' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ari/ })).toBeVisible();
  await page.getByRole('button', { name: 'Muat foto berikutnya' }).click();
  await expect(page.getByText('Bima')).toBeVisible();
  await page.getByLabel('Urutkan').selectOption('MOST_LIKED');
  await expect(page.getByLabel('Urutkan')).toHaveValue('MOST_LIKED');
  await page.getByRole('link', { name: /Ari/ }).click();
  await expect(page).toHaveURL(new RegExp(`/j/${linkId}/galeri/${photoId}$`));
  await page.getByRole('button', { name: 'Sukai foto' }).click();
  await expect(page.getByRole('button', { name: 'Foto disukai' })).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh' }).click();
  await download;
  await page.getByRole('button', { name: 'Salin tautan' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(`http://localhost:3000/j/${linkId}/galeri/${photoId}`);
  let composerUrl = '';
  await page.context().route('https://wa.me/**', async (route) => { composerUrl = route.request().url(); await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp composer</title>' }); });
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'WhatsApp' }).click();
  const popup = await popupPromise;
  const expectedComposerUrl = `https://wa.me/?text=${encodeURIComponent(`http://localhost:3000/j/${linkId}/galeri/${photoId}`)}`;
  await expect(popup).toHaveURL(expectedComposerUrl);
  expect(composerUrl).toBe(expectedComposerUrl);
});

test('guest remains waiting before reveal and routes expired access to the terminal state', async ({ page }) => {
  await mockGuest(page, 'HIDDEN');
  await page.goto(`/j/${linkId}/galeri`);
  await expect(page.getByText(/Galeri akan tersedia setelah waktu reveal/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'FE5 Gallery E2E' })).toBeVisible();

  await page.unrouteAll();
  await mockGuest(page, 'ENDED');
  await page.goto(`/j/${linkId}/galeri`);
  await expect(page).toHaveURL(new RegExp(`/j/${linkId}/akhir-acara$`));
  await expect(page.getByRole('heading', { name: 'Masa akses acara selesai' })).toBeVisible();
});

test('guest server-authorized actions are disabled offline and return after reconnect', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); });
  await mockGuest(page);
  await page.goto(`/j/${linkId}/galeri/${photoId}`);
  await expect(page.getByRole('button', { name: 'Sukai foto' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Unduh' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Salin tautan' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'WhatsApp' })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'offline' })).toBeVisible();

  await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); window.dispatchEvent(new Event('online')); });
  await expect(page.getByRole('button', { name: 'Sukai foto' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Unduh' })).toBeEnabled();
});

for (const width of [320, 375, 390, 430]) {
  test(`guest gallery has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await mockGuest(page);
    await page.goto(`/j/${linkId}/galeri`);
    await expect(page.getByRole('heading', { name: 'FE5 Gallery E2E' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
