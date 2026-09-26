import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

declare global {
  interface Window { captureTrace?: string[] }
}

const linkId = '11111111-1111-4111-8111-111111111111';
const albumId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const preview = {
  album_id: albumId, event_name: 'Kepotret E2E', event_location: 'Jakarta', timezone: 'Asia/Jakarta',
  capture_start: '2026-09-26T10:00:00Z', capture_end: '2026-10-01T10:00:00Z', reveal_at: '2026-10-02T10:00:00Z',
  capture_state: 'OPEN', reveal_state: 'HIDDEN', pin_required: false, consent_version: 'v1',
};
const guest = { guest_session_id: '44444444-4444-4444-8444-444444444444', album_id: albumId, display_name: 'Tamu E2E', created_at: '2026-09-27T00:00:00Z' };
const eventContext = { album_id: albumId, event_name: preview.event_name, event_location: preview.event_location, timezone: preview.timezone, capture_start: preview.capture_start, capture_end: preview.capture_end, reveal_at: preview.reveal_at, capture_state: 'OPEN', reveal_state: 'HIDDEN' };

async function prepareGuestPage(page: Page, options: { cameraDenied?: boolean; reservationConflict?: boolean; closed?: boolean } = {}) {
  await page.addInitScript((cameraDenied) => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      if (cameraDenied) throw new DOMException('denied', 'NotAllowedError');
      return new MediaStream();
    } } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
    HTMLVideoElement.prototype.play = async function () {};
    HTMLCanvasElement.prototype.toBlob = function (callback, type = 'image/png') { callback(new Blob([new Uint8Array([1, 2, 3])], { type })); };
    HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  }, options.cameraDenied ?? false);
  let reservations = 0;
  const reservationKeys: string[] = [];
  await page.route('**/api/v1/guest/access/resolve', (route) => route.fulfill({ status: 200, json: { data: preview } }));
  await page.route('**/api/v1/guest/sessions', (route) => route.fulfill({ status: 201, json: { data: guest } }));
  await page.route('**/api/v1/guest/me', (route) => route.fulfill({ status: 200, json: { data: { guest_session: guest, event: eventContext } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-readiness`, (route) => {
    const state = options.closed ? 'CLOSED' : options.reservationConflict && reservations > 0 ? 'QUOTA_FULL' : 'READY';
    return route.fulfill({ status: 200, json: { data: { album_id: albumId, state, can_capture: state === 'READY', server_time: '2026-09-27T00:00:00Z', capture_start: preview.capture_start, capture_end: preview.capture_end, reveal_at: preview.reveal_at, reveal_state: 'HIDDEN', album_remaining_count: state === 'QUOTA_FULL' ? 0 : 29, guest_remaining_count: 10 } } });
  });
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ status: 200, json: { data: { csrf_token: 'csrf-e2e' } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-attempts`, async (route) => {
    reservations += 1;
    reservationKeys.push(route.request().headers()['idempotency-key']);
    if (options.reservationConflict) return route.fulfill({ status: 409, json: { error: { code: 'CONFLICT', message: 'unavailable' } } });
    return route.fulfill({ status: 201, json: { data: { attempt_id: `${attemptId.slice(0, -1)}${reservations}`, album_id: albumId, status: 'ACTIVE', expires_at: '2026-09-27T01:00:00Z' } } });
  });
  await page.route('**/api/v1/capture-attempts/*/release', (route) => route.fulfill({ status: 200, json: { data: { attempt_id: attemptId, album_id: albumId, status: 'RELEASED', expires_at: '2026-09-27T01:00:00Z' } } }));
  return { get reservations() { return reservations; }, reservationKeys };
}

async function joinGuest(page: Page) {
  await page.goto(`/j/${linkId}#fragment-secret`);
  await page.getByLabel('Display name').fill('Tamu E2E');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

test('guest completes camera capture, review and direct upload at common mobile widths', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => new MediaStream() } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
    HTMLVideoElement.prototype.play = async function () { window.captureTrace?.push('camera-ready'); };
    HTMLCanvasElement.prototype.toBlob = function (callback, type = 'image/png') {
      window.captureTrace?.push('frame-drawn');
      callback(new Blob([new Uint8Array([1, 2, 3, 4])], { type }));
    };
    HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(window, 'captureTrace', { value: [], configurable: true });
    Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: async () => ({ width: 640, height: 480, close() {} }) });
  });

  const readiness = { album_id: albumId, state: 'READY', can_capture: true, server_time: '2026-09-27T00:00:00Z', capture_start: preview.capture_start, capture_end: preview.capture_end, reveal_at: preview.reveal_at, reveal_state: 'HIDDEN', album_remaining_count: 29, guest_remaining_count: 10 };
  await page.route('**/api/v1/guest/access/resolve', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ link_id: linkId, access_secret: 'fragment-secret' });
    await route.fulfill({ status: 200, json: { data: preview } });
  });
  await page.route('**/api/v1/guest/sessions', async (route) => {
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().postDataJSON()).toMatchObject({ link_id: linkId, access_secret: 'fragment-secret', display_name: 'Tamu 🌼', accepted_consent_version: 'v1' });
    await route.fulfill({ status: 201, json: { data: guest } });
  });
  await page.route('**/api/v1/guest/me', (route) => route.fulfill({ status: 200, json: { data: { guest_session: guest, event: eventContext } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-readiness`, (route) => route.fulfill({ status: 200, json: { data: readiness } }));
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ status: 200, json: { data: { csrf_token: 'csrf-e2e' } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-attempts`, async (route) => {
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().headers()['x-csrf-token']).toBe('csrf-e2e');
    await page.evaluate(() => window.captureTrace?.push('reserved'));
    await route.fulfill({ status: 201, json: { data: { attempt_id: attemptId, album_id: albumId, status: 'ACTIVE', expires_at: '2026-09-27T01:00:00Z' } } });
  });
  await page.route(`**/api/v1/capture-attempts/${attemptId}/upload-authorization`, (route) => route.fulfill({ status: 200, json: { data: { upload_url: 'https://upload.test/object', expires_at: '2026-09-27T01:00:00Z', object_key: 'private/test' } } }));
  let uploadedType = '';
  let recoveryChecks = 0;
  await page.route('https://upload.test/object', async (route) => { uploadedType = route.request().headers()['content-type']; await route.fulfill({ status: 200 }); });
  await page.route(`**/api/v1/capture-attempts/${attemptId}/commit`, (route) => route.abort());
  await page.route(`**/api/v1/capture-attempts/${attemptId}`, (route) => {
    recoveryChecks += 1;
    return route.fulfill({ status: 200, json: { data: { attempt_id: attemptId, album_id: albumId, status: 'COMMITTED', expires_at: '2026-09-27T01:00:00Z', committed_at: '2026-09-27T00:01:00Z' } } });
  });

  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(`/j/${linkId}#fragment-secret`);
  await expect(page.getByRole('heading', { name: 'Kepotret E2E' })).toBeVisible();
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 850 });
    const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
  }
  await page.getByLabel('Display name').fill('  Tamu 🌼  ');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved')).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('');
  expect(await page.evaluate(() => (window.captureTrace?.indexOf('reserved') ?? -1) < (window.captureTrace?.indexOf('frame-drawn') ?? -1))).toBe(true);
  expect(uploadedType).toBe('image/jpeg');
  expect(recoveryChecks).toBe(1);
});

test('camera denial and offline-before-shutter do not reserve or capture a frame', async ({ page }) => {
  const denied = await prepareGuestPage(page, { cameraDenied: true });
  await joinGuest(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByText('Camera permission is needed to take a photo.')).toBeVisible();
  expect(denied.reservations).toBe(0);

  await page.goto('/');
  const offline = await prepareGuestPage(page);
  await joinGuest(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByText('An internet connection is required before taking a photo.')).toBeVisible();
  expect(offline.reservations).toBe(0);
  await page.context().setOffline(false);
});

test('closed sessions show the reveal countdown without capture or gallery actions', async ({ page }) => {
  const state = await prepareGuestPage(page, { closed: true });
  await joinGuest(page);
  await expect(page.getByText('The photo session is closed')).toBeVisible();
  await expect(page.getByText(/Photos reveal:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
  expect(state.reservations).toBe(0);
});

test('quota conflict stops shutter and maps to the safe quota-full state', async ({ page }) => {
  const state = await prepareGuestPage(page, { reservationConflict: true });
  await joinGuest(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByText('The photo quota for this session has been reached.')).toBeVisible();
  expect(state.reservations).toBe(1);
});

test('retake releases the reservation and the next shutter uses a fresh idempotency key', async ({ page }) => {
  const state = await prepareGuestPage(page);
  await joinGuest(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await page.getByRole('button', { name: 'Retake' }).click();
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  expect(state.reservations).toBe(2);
  expect(state.reservationKeys[0]).not.toBe(state.reservationKeys[1]);
});
