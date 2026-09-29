import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const albumId = '22222222-2222-4222-8222-222222222222';
const linkId = '11111111-1111-4111-8111-111111111111';
const photoId = '33333333-3333-4333-8333-333333333333';
const album = {
  album_id: albumId, event_name: 'Browser matrix event', event_location: 'Jakarta', event_category_id: null,
  timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, selected_package_version_id: null,
  readiness: 'DRAFT', capture_state: 'NOT_STARTED', reveal_state: 'HIDDEN', setup_revision: 1,
  schedule_version: 0, access_version: 0, export_revision: 0, confirmed_setup_revision: null,
  confirmed_schedule_version: null, confirmed_package_version_id: null, setup_confirmed_at: null,
  guest_count_final: null, quota_total: 30, committed_count: 0,
};

async function checkNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
}

test('public landing and ordinary sign-in remain usable with optimized, reserved imagery @cross-browser', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await checkNoOverflow(page);
  const hero = page.locator('.hero-visual');
  await expect(hero).toBeVisible();
  const heroGeometry = await hero.evaluate((element) => ({ ratio: getComputedStyle(element).aspectRatio, height: element.getBoundingClientRect().height }));
  expect(heroGeometry.ratio).not.toBe('auto');
  expect(heroGeometry.height).toBeGreaterThan(0);
  const heroImages = hero.locator('img[alt]:not([alt=""])');
  await expect(heroImages).toHaveCount(4);
  for (const image of await heroImages.all()) {
    await expect(image).toHaveAttribute('srcset', /_next\/image/);
    await expect(image).toHaveAttribute('sizes', /.+/);
  }
  // The hero photo is preloaded; the below-the-fold use cases are lazy.
  const marketingImages = page.locator('img[src*="_next/image"]');
  expect(await marketingImages.count()).toBeGreaterThanOrEqual(10);
  expect(await page.locator('link[rel="preload"][as="image"][imagesrcset*="event-02.jpg"]').count()).toBe(1);
  expect(await page.locator('link[rel="preload"][as="image"][imagesrcset*="wedding-01.jpg"]').count()).toBe(0);
  expect(await page.locator('img[src*="_next/image"][loading="lazy"]').count()).toBeGreaterThanOrEqual(6);
  await page.goto('/masuk');
  await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await checkNoOverflow(page);
});

test('Host workspace projects the owner album on desktop and mobile @cross-browser', async ({ page }) => {
  await page.route(`**/api/v1/albums/${albumId}`, route => route.fulfill({ status: 200, json: { data: { ...album, actor_access: { relationship: 'OWNER', permission_version: null, collaborator_permissions: null } } } }));
  await page.goto(`/album/${albumId}`);
  await expect(page.getByText(album.event_name).first()).toBeVisible();
  await expect(page.locator(`main a[href="/album/${albumId}/galeri"]`)).toBeVisible();
  await checkNoOverflow(page);
});

test('Guest clears the join fragment and reaches camera entry without a file picker @cross-browser', async ({ page, context }) => {
  await context.addCookies([{ name: 'kepotret-locale', value: 'en', url: 'http://localhost:3000' }]);
  await page.addInitScript(() => {
    const streams = new WeakMap<HTMLMediaElement, MediaStream>();
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get() { return streams.get(this) ?? null; },
      set(value: MediaStream | null) { if (value) streams.set(this, value); else streams.delete(this); },
    });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [] }) } });
    HTMLVideoElement.prototype.play = async function () {};
  });
  const preview = { album_id: albumId, event_name: 'Browser matrix event', event_location: 'Jakarta', timezone: 'Asia/Jakarta', capture_start: '2026-09-26T10:00:00Z', capture_end: '2026-10-01T10:00:00Z', reveal_at: '2026-10-02T10:00:00Z', capture_state: 'OPEN', reveal_state: 'HIDDEN', pin_required: false, consent_version: 'guest-photo-v1' };
  const guest = { guest_session_id: '44444444-4444-4444-8444-444444444444', album_id: albumId, display_name: 'Browser Guest', created_at: '2026-09-27T00:00:00Z' };
  await page.route('**/api/v1/guest/access/resolve', route => {
    expect(route.request().postDataJSON()).toEqual({ link_id: linkId, access_secret: 'matrix-secret' });
    return route.fulfill({ status: 200, json: { data: preview } });
  });
  await page.route('**/api/v1/guest/sessions', route => route.fulfill({ status: 201, json: { data: guest } }));
  await page.route('**/api/v1/guest/me', route => route.fulfill({ status: 200, json: { data: { guest_session: guest, event: { ...preview, pin_required: undefined, consent_version: undefined } } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-readiness`, route => route.fulfill({ status: 200, json: { data: { album_id: albumId, state: 'READY', can_capture: true, server_time: '2026-09-27T00:00:00Z', capture_start: preview.capture_start, capture_end: preview.capture_end, reveal_at: preview.reveal_at, reveal_state: 'HIDDEN', album_remaining_count: 29, guest_remaining_count: 10 } } }));
  await page.goto(`/j/${linkId}#matrix-secret`);
  await expect(page.getByRole('heading', { name: preview.event_name })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Display name').fill('Browser Guest');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible();
  await checkNoOverflow(page);
});

test('revealed Guest gallery requests one bounded page and lazily renders media @cross-browser', async ({ page }) => {
  const thumbnail = await readFile('public/media/marketing/events/event-02.jpg');
  const photo = { photo_id: photoId, created_at: '2026-09-27T01:00:00Z', photographer_display_name: 'Ari', like_count: 2, media: { url: 'https://media.test/delivery/photo', expires_at: '2026-09-27T01:05:00Z' }, actions: { can_like: false, liked_by_me: false, can_download: false, can_share: false } };
  const requests: URL[] = [];
  await page.route('**/api/v1/guest/me', route => route.fulfill({ status: 200, json: { data: { guest_session: { guest_session_id: 'guest-1', album_id: albumId, display_name: 'Guest', created_at: '2026-09-27T00:00:00Z' }, event: { album_id: albumId, event_name: 'Browser matrix event', event_location: null, timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, reveal_at: '2026-09-27T00:00:00Z', capture_state: 'CLOSED', reveal_state: 'REVEALED' } } } }));
  await page.route('**/api/v1/guest/gallery/photos?**', route => {
    const url = new URL(route.request().url());
    requests.push(url);
    return route.fulfill({ status: 200, json: { data: [photo], meta: { has_more: true, next_cursor: 'page-2' } } });
  });
  await page.route('https://media.test/**', route => route.fulfill({ status: 200, contentType: 'image/jpeg', body: thumbnail }));
  await page.goto(`/j/${linkId}/galeri`);
  await expect(page.getByRole('link', { name: /Ari/ })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]!.searchParams.get('limit')).toBe('24');
  await expect(page.locator('img[src="https://media.test/delivery/photo"]')).toHaveAttribute('loading', 'lazy');
  await expect(page.getByRole('button', { name: /muat foto berikutnya|load more photos/i })).toBeVisible();
  await checkNoOverflow(page);
});

test('collaborator workspace hides owner actions when the server grants no permissions @cross-browser', async ({ page }) => {
  await page.route(`**/api/v1/albums/${albumId}`, route => route.fulfill({ status: 200, json: { data: { ...album, actor_access: { relationship: 'COLLABORATOR', permission_version: 2, collaborator_permissions: { can_setup: false, can_moderate: false, can_export_zip: false } } } } }));
  await page.goto(`/album/${albumId}`);
  await expect(page.getByText(album.event_name).first()).toBeVisible();
  await expect(page.locator(`main a[href="/album/${albumId}/setup/acara"]`)).toHaveCount(0);
  await expect(page.locator(`main a[href="/album/${albumId}/galeri"]`)).toHaveCount(0);
  await checkNoOverflow(page);
});
