import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

declare global {
  interface Window { captureTrace?: string[]; revokedCaptureUrls?: string[] }
}

const linkId = '11111111-1111-4111-8111-111111111111';
const albumId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const preview = {
  album_id: albumId, event_name: 'Kepotret E2E', event_location: 'Jakarta', timezone: 'Asia/Jakarta',
  capture_start: '2026-09-26T10:00:00Z', capture_end: '2026-10-01T10:00:00Z', reveal_at: '2026-10-02T10:00:00Z',
  capture_state: 'OPEN', reveal_state: 'HIDDEN', pin_required: false, consent_version: 'guest-photo-v1',
};
const guest = { guest_session_id: '44444444-4444-4444-8444-444444444444', album_id: albumId, display_name: 'Tamu E2E', created_at: '2026-09-27T00:00:00Z' };
const eventContext = { album_id: albumId, event_name: preview.event_name, event_location: preview.event_location, timezone: preview.timezone, capture_start: preview.capture_start, capture_end: preview.capture_end, reveal_at: preview.reveal_at, capture_state: 'OPEN', reveal_state: 'HIDDEN' };
const readyReadiness = { album_id: albumId, state: 'READY', can_capture: true, server_time: '2026-09-27T00:00:00Z', capture_start: preview.capture_start, capture_end: preview.capture_end, reveal_at: preview.reveal_at, reveal_state: 'HIDDEN', album_remaining_count: 29, guest_remaining_count: 10 };

type Options = {
  cameraDenied?: boolean;
  reservationConflict?: boolean;
  closed?: boolean;
  readinessSequence?: Array<'WAITING' | 'READY'>;
  sessionStatuses?: number[];
  guestMeStatuses?: number[];
  reservationStatuses?: number[];
  recoveryStatuses?: Array<'COMMITTED' | 'ACTIVE' | 'EXPIRED' | 'RELEASED'>;
  readinessAfterRecovery?: 'READY' | 'WAITING' | 'CLOSED' | 'QUOTA_FULL' | 'GUEST_LIMIT_REACHED' | 'UNAVAILABLE';
};

async function prepareGuestPage(page: Page, options: Options = {}) {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.addInitScript((cameraDenied) => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      if (cameraDenied) throw new DOMException('denied', 'NotAllowedError');
      return new MediaStream();
    } } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
    HTMLVideoElement.prototype.play = async function () {};
    let canvasExports = 0;
    const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type = 'image/png') {
      canvasExports += 1;
      if (canvasExports === 1) callback(new Blob([new Uint8Array([1, 2, 3])], { type }));
      else nativeToBlob.call(this, callback, type);
    };
    HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: async () => ({ width: 640, height: 480, close() {} }) });
    Object.defineProperty(window, 'revokedCaptureUrls', { configurable: true, value: [] });
    const revokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => { window.revokedCaptureUrls?.push(url); revokeObjectURL(url); };
  }, options.cameraDenied ?? false);

  let reservations = 0;
  let sessions = 0;
  let guestMeRequests = 0;
  let readinessRequests = 0;
  let recoveryChecks = 0;
  let commits = 0;
  let uploadAuthorizations = 0;
  const reservationKeys: string[] = [];
  const sessionKeys: string[] = [];
  const releaseIds: string[] = [];
  const uploadAttemptIds: string[] = [];
  await page.route('**/api/v1/guest/access/resolve', (route) => route.fulfill({ status: 200, json: { data: preview } }));
  await page.route('**/api/v1/guest/sessions', (route) => {
    sessions += 1;
    sessionKeys.push(route.request().headers()['idempotency-key']);
    const status = options.sessionStatuses?.shift() ?? 201;
    return status === 201 ? route.fulfill({ status, json: { data: guest } }) : route.fulfill({ status, json: { error: { code: 'TEMPORARY', message: 'internal details' } } });
  });
  await page.route('**/api/v1/guest/me', (route) => {
    guestMeRequests += 1;
    const status = options.guestMeStatuses?.shift() ?? 200;
    return status === 200 ? route.fulfill({ status, json: { data: { guest_session: guest, event: eventContext } } }) : route.fulfill({ status, json: { error: { code: 'TEMPORARY', message: 'internal details' } } });
  });
  await page.route(`**/api/v1/albums/${albumId}/capture-readiness`, (route) => {
    readinessRequests += 1;
    const nextState = options.readinessSequence?.shift();
    const state = options.closed ? 'CLOSED' : recoveryChecks > 0 && options.readinessAfterRecovery ? options.readinessAfterRecovery : options.reservationConflict && reservations > 0 ? 'QUOTA_FULL' : nextState ?? 'READY';
    const waitBoundary = recoveryChecks > 0 && options.readinessAfterRecovery === 'WAITING' ? '2026-10-01T10:00:00Z' : '2026-09-27T00:00:02Z';
    const data = state === 'WAITING' ? { ...readyReadiness, state, can_capture: false, server_time: '2026-09-27T00:00:00Z', capture_start: waitBoundary } : { ...readyReadiness, state, can_capture: state === 'READY', album_remaining_count: state === 'QUOTA_FULL' ? 0 : 29 };
    return route.fulfill({ status: 200, json: { data } });
  });
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ status: 200, json: { data: { csrf_token: 'csrf-e2e' } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-attempts`, async (route) => {
    reservations += 1;
    reservationKeys.push(route.request().headers()['idempotency-key']);
    const status = options.reservationStatuses?.shift() ?? (options.reservationConflict ? 409 : 201);
    if (status !== 201) return route.fulfill({ status, json: { error: { code: 'TEMPORARY', message: 'internal details' } } });
    return route.fulfill({ status, json: { data: { attempt_id: `${attemptId.slice(0, -1)}${reservations}`, album_id: albumId, status: 'ACTIVE', expires_at: '2026-09-27T01:00:00Z' } } });
  });
  await page.route('**/api/v1/capture-attempts/*/upload-authorization', (route) => {
    uploadAuthorizations += 1;
    uploadAttemptIds.push(route.request().url().split('/').at(-2) ?? '');
    return route.fulfill({ status: 200, json: { data: { upload_url: 'https://upload.test/object', expires_at: '2026-09-27T01:00:00Z', object_key: 'private/test' } } });
  });
  await page.route('https://upload.test/object', (route) => route.fulfill({ status: 200 }));
  await page.route('**/api/v1/capture-attempts/*/commit', (route) => {
    commits += 1;
    return route.abort();
  });
  await page.route('**/api/v1/capture-attempts/*', (route) => {
    recoveryChecks += 1;
    const status = options.recoveryStatuses?.shift() ?? (commits > 0 ? 'COMMITTED' : 'ACTIVE');
    return route.fulfill({ status: 200, json: { data: { attempt_id: route.request().url().split('/').at(-1), album_id: albumId, status, expires_at: '2026-09-27T01:00:00Z', ...(status === 'COMMITTED' ? { committed_at: '2026-09-27T00:01:00Z' } : {}) } } });
  });
  await page.route('**/api/v1/capture-attempts/*/release', (route) => {
    releaseIds.push(route.request().url().split('/').at(-2) ?? '');
    return route.fulfill({ status: 200, json: { data: { attempt_id: attemptId, album_id: albumId, status: 'RELEASED', expires_at: '2026-09-27T01:00:00Z' } } });
  });
  return {
    get reservations() { return reservations; }, get sessions() { return sessions; }, get guestMeRequests() { return guestMeRequests; }, get readinessRequests() { return readinessRequests; },
    get recoveryChecks() { return recoveryChecks; }, get commits() { return commits; }, get uploadAuthorizations() { return uploadAuthorizations; },
    reservationKeys, sessionKeys, releaseIds, uploadAttemptIds,
  };
}

async function reachJoin(page: Page, state: Awaited<ReturnType<typeof prepareGuestPage>>) {
  await page.goto(`/j/${linkId}#fragment-secret`);
  await expect(page.getByRole('heading', { name: 'Kepotret E2E' })).toBeVisible();
  await expect.poll(() => state.sessions).toBe(0);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Guest name' })).toBeVisible();
  await page.getByLabel('Display name').fill('Tamu E2E');
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function acceptConsent(page: Page) {
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Agree & Continue' }).click();
}

async function captureForUploadRecovery(page: Page, state: Awaited<ReturnType<typeof prepareGuestPage>>) {
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
}

test('H65 to H68 consent flow creates the guest only after locked consent and captures through direct upload @release-critical', async ({ page }) => {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => new MediaStream() } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
    HTMLVideoElement.prototype.play = async function () { window.captureTrace?.push('camera-ready'); };
    HTMLCanvasElement.prototype.toBlob = function (callback, type = 'image/png') { window.captureTrace?.push('frame-drawn'); callback(new Blob([new Uint8Array([1, 2, 3, 4])], { type })); };
    HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(window, 'captureTrace', { value: [], configurable: true });
    Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: async () => ({ width: 640, height: 480, close() {} }) });
  });
  let sessions = 0;
  let uploadedType = '';
  let recoveryChecks = 0;
  await page.route('**/api/v1/guest/access/resolve', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ link_id: linkId, access_secret: 'fragment-secret' });
    await route.fulfill({ status: 200, json: { data: preview } });
  });
  await page.route('**/api/v1/guest/sessions', async (route) => {
    sessions += 1;
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().postDataJSON()).toMatchObject({ link_id: linkId, access_secret: 'fragment-secret', display_name: 'Tamu 🌼', accepted_consent_version: 'guest-photo-v1' });
    await route.fulfill({ status: 201, json: { data: guest } });
  });
  await page.route('**/api/v1/guest/me', (route) => route.fulfill({ status: 200, json: { data: { guest_session: guest, event: eventContext } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-readiness`, (route) => route.fulfill({ status: 200, json: { data: readyReadiness } }));
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ status: 200, json: { data: { csrf_token: 'csrf-e2e' } } }));
  await page.route(`**/api/v1/albums/${albumId}/capture-attempts`, async (route) => {
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().headers()['x-csrf-token']).toBe('csrf-e2e');
    await page.evaluate(() => window.captureTrace?.push('reserved'));
    await route.fulfill({ status: 201, json: { data: { attempt_id: attemptId, album_id: albumId, status: 'ACTIVE', expires_at: '2026-09-27T01:00:00Z' } } });
  });
  await page.route(`**/api/v1/capture-attempts/${attemptId}/upload-authorization`, (route) => route.fulfill({ status: 200, json: { data: { upload_url: 'https://upload.test/object', expires_at: '2026-09-27T01:00:00Z', object_key: 'private/test' } } }));
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
  expect(sessions).toBe(0);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Display name').fill('Tamu 🌼');
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sessions).toBe(0);
  await expect(page.getByRole('heading', { name: 'Before you start taking photos' })).toBeVisible();
  await expect(page.getByText('Photos you take through Kepotret will be stored in this event album and may be shown to participants according to the album settings once the reveal time is reached. The display name you provide may also appear as a label on photos you take.')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveAccessibleName(/I agree that my photos and display name may be processed for this event album in accordance with Kepotret's Privacy Policy and Terms & Conditions\./);
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/kebijakan-privasi');
  await expect(page.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute('href', '/syarat-ketentuan');
  await expect(page.getByText('guest-photo-v1')).toHaveCount(0);
  await acceptConsent(page);
  await expect.poll(() => sessions).toBe(1);
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 850 });
    const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
  }
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  expect(await page.evaluate(() => (window.captureTrace?.indexOf('reserved') ?? -1) < (window.captureTrace?.indexOf('frame-drawn') ?? -1))).toBe(true);
  expect(uploadedType).toBe('image/jpeg');
  expect(recoveryChecks).toBe(1);
});

test('guest-session 503 retry reuses the same key and changing the name starts a new intent', async ({ page }) => {
  const state = await prepareGuestPage(page, { sessionStatuses: [503, 503, 201] });
  await reachJoin(page, state);
  await acceptConsent(page);
  await expect(page.locator('section p[role="alert"]')).toBeVisible();
  await page.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(page.locator('section p[role="alert"]')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByLabel('Display name').fill('Changed name');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeVisible();
  expect(state.sessionKeys).toHaveLength(3);
  expect(state.sessionKeys[0]).toBe(state.sessionKeys[1]);
  expect(state.sessionKeys[2]).not.toBe(state.sessionKeys[1]);
});

test('guest/me 503 after successful creation can recover without posting another GuestSession', async ({ page }) => {
  const state = await prepareGuestPage(page, { guestMeStatuses: [503, 200] });
  await reachJoin(page, state);
  await acceptConsent(page);
  await expect(page.locator('section p[role="alert"]')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeVisible();
  expect(state.sessions).toBe(1);
  expect(state.guestMeRequests).toBe(2);
});

test('ACTIVE commit recovery keeps the same image and attempt retryable without another reservation', async ({ page }) => {
  const state = await prepareGuestPage(page, { recoveryStatuses: ['ACTIVE', 'COMMITTED'] });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to device' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toBeVisible();
  expect(state.reservations).toBe(1);
  expect(state.uploadAuthorizations).toBe(1);
  expect(state.uploadAttemptIds).toEqual([`${attemptId.slice(0, -1)}1`]);

  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to device' })).toBeVisible();
  expect(await page.evaluate(() => window.revokedCaptureUrls)).toHaveLength(1);
  expect(state.reservations).toBe(1);
  expect(state.uploadAuthorizations).toBe(2);
  expect(state.uploadAttemptIds).toEqual([`${attemptId.slice(0, -1)}1`, `${attemptId.slice(0, -1)}1`]);
});

test('local JPEG download appears only after COMMITTED and matches the uploaded processed bytes', async ({ page }) => {
  const state = await prepareGuestPage(page);
  let uploaded: Buffer | null = null;
  let mediaRequests = 0;
  await page.route('https://upload.test/object', async route => {
    uploaded = route.request().postDataBuffer();
    await route.fulfill({ status: 200 });
  });
  await page.route('**/api/v1/capture-attempts/*/commit', route => route.fulfill({ status: 201, json: { data: { status: 'COMMITTED' } } }));
  page.on('request', request => { if (request.url().includes('/photos/') || request.url().includes('/media/')) mediaRequests += 1; });
  await captureForUploadRecovery(page, state);
  await expect(page.getByRole('button', { name: 'Save to device' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save to device' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kepotret-kepotret-e2e-.*\.jpg$/);
  const uploadedBytes: Buffer = uploaded ?? Buffer.alloc(0);
  expect(uploadedBytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(uploaded).not.toEqual(Buffer.from([1, 2, 3]));
  expect(await readFile(await download.path())).toEqual(uploaded);
  expect(mediaRequests).toBe(0);
  expect(state.reservations).toBe(1);
  expect(page.url()).not.toContain('#fragment-secret');
  expect(await page.evaluate(async () => ({
    stored: [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes('blob:') || value.includes('data:image/jpeg')),
    databases: await indexedDB.databases().then(databases => databases.filter(database => database.name?.includes('kepotret-photo')).length),
  }))).toEqual({ stored: false, databases: 0 });
  await page.getByRole('button', { name: 'Take another photo' }).click();
  await expect(page.getByRole('button', { name: 'Save to device' })).toHaveCount(0);
  expect(await page.evaluate(() => window.revokedCaptureUrls)).toHaveLength(2);
});

test('a closed capture window still leaves the committed local copy available', async ({ page }) => {
  const state = await prepareGuestPage(page, { readinessAfterRecovery: 'CLOSED' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to device' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take another photo' })).toHaveCount(0);
  expect(state.recoveryChecks).toBe(1);
});

test('EXPIRED recovery clears the old photo and uses a new reservation key for the next shutter', async ({ page }) => {
  const state = await prepareGuestPage(page, { recoveryStatuses: ['EXPIRED'], readinessAfterRecovery: 'READY' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toHaveCount(0);
  expect(await page.evaluate(() => window.revokedCaptureUrls)).toHaveLength(1);
  expect(state.reservations).toBe(1);
  expect(state.releaseIds).toHaveLength(0);

  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  expect(state.reservations).toBe(2);
  expect(state.reservationKeys[1]).not.toBe(state.reservationKeys[0]);
});

test('RELEASED recovery discards the old photo and allows only a fresh reservation', async ({ page }) => {
  const state = await prepareGuestPage(page, { recoveryStatuses: ['RELEASED'], readinessAfterRecovery: 'READY' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toHaveCount(0);
  expect(await page.evaluate(() => window.revokedCaptureUrls)).toHaveLength(1);
  expect(state.reservations).toBe(1);
  expect(state.releaseIds).toHaveLength(0);

  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  expect(state.reservations).toBe(2);
  expect(state.reservationKeys[1]).not.toBe(state.reservationKeys[0]);
});

test('Retake recognizes an already EXPIRED attempt and does not call release again', async ({ page }) => {
  const state = await prepareGuestPage(page, { recoveryStatuses: ['EXPIRED'], readinessAfterRecovery: 'READY' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toHaveCount(0);
  expect(state.recoveryChecks).toBe(1);
  expect(state.releaseIds).toHaveLength(0);
  expect(state.reservations).toBe(1);
});

test('EXPIRED recovery respects CLOSED and shows H72 without offering another shutter', async ({ page }) => {
  const state = await prepareGuestPage(page, { recoveryStatuses: ['EXPIRED'], readinessAfterRecovery: 'CLOSED' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('The photo session is closed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toHaveCount(0);
  expect(state.reservations).toBe(1);
  expect(state.releaseIds).toHaveLength(0);
});

test('EXPIRED recovery respects QUOTA_FULL without reserving again', async ({ page }) => {
  const state = await prepareGuestPage(page, { recoveryStatuses: ['EXPIRED'], readinessAfterRecovery: 'QUOTA_FULL' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'The photo quota for this session has been reached.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeDisabled();
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toHaveCount(0);
  expect(state.reservations).toBe(1);
});

test('terminal recovery routes WAITING, GUEST_LIMIT_REACHED and UNAVAILABLE from readiness', async ({ page }) => {
  const waiting = await prepareGuestPage(page, { recoveryStatuses: ['EXPIRED'], readinessAfterRecovery: 'WAITING' });
  await captureForUploadRecovery(page, waiting);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo session begins')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeDisabled();
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toBeVisible();
  expect(waiting.reservations).toBe(1);

  await page.goto('/');
  const guestLimit = await prepareGuestPage(page, { recoveryStatuses: ['RELEASED'], readinessAfterRecovery: 'GUEST_LIMIT_REACHED' });
  await captureForUploadRecovery(page, guestLimit);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'The guest photo limit has been reached.' })).toBeVisible();
  await expect(page.getByText('The previous photo can no longer be saved. Take a new photo to continue.')).toHaveCount(0);
  expect(guestLimit.reservations).toBe(1);

  await page.goto('/');
  const unavailable = await prepareGuestPage(page, { recoveryStatuses: ['EXPIRED'], readinessAfterRecovery: 'UNAVAILABLE' });
  await captureForUploadRecovery(page, unavailable);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.locator('section p[role="alert"]')).toContainText('This event link or access is unavailable.');
  expect(unavailable.reservations).toBe(1);
});

test('Indonesian H67 consent displays approved copy and hides consent version', async ({ page }) => {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'id', domain: 'localhost', path: '/' }]);
  await page.route('**/api/v1/guest/access/resolve', (route) => route.fulfill({ status: 200, json: { data: preview } }));
  await page.goto(`/j/${linkId}#fragment-secret`);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByLabel('Nama tampilan').fill('Tamu');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await expect(page.getByRole('heading', { name: 'Sebelum ikut memotret' })).toBeVisible();
  await expect(page.getByText('Foto yang kamu ambil melalui Kepotret akan disimpan dalam album acara ini dan dapat ditampilkan kepada peserta sesuai pengaturan album setelah waktu publikasi tiba. Nama tampilan yang kamu masukkan juga dapat ditampilkan sebagai label pada foto yang kamu ambil.')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveAccessibleName(/Saya setuju foto dan nama tampilan saya diproses untuk keperluan album acara ini sesuai Kebijakan Privasi dan Syarat & Ketentuan Kepotret\./);
  await expect(page.getByRole('link', { name: 'Kebijakan Privasi' })).toHaveAttribute('href', '/kebijakan-privasi');
  await expect(page.getByRole('link', { name: 'Syarat & Ketentuan Kepotret' })).toHaveAttribute('href', '/syarat-ketentuan');
  await expect(page.getByText('guest-photo-v1')).toHaveCount(0);
});

test('reservation 503 retry reuses the key, then retake releases and the next shutter gets a fresh key', async ({ page }) => {
  const state = await prepareGuestPage(page, { reservationStatuses: [503, 201, 201] });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await page.getByRole('button', { name: 'Retake' }).click();
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  expect(state.reservations).toBe(3);
  expect(state.reservationKeys[0]).toBe(state.reservationKeys[1]);
  expect(state.reservationKeys[1]).not.toBe(state.reservationKeys[2]);
  expect(state.releaseIds).toHaveLength(1);
});

test('waiting room refreshes at capture_start and only enables capture after READY from server', async ({ page }) => {
  const state = await prepareGuestPage(page, { readinessSequence: ['WAITING', 'READY'] });
  await reachJoin(page, state);
  await acceptConsent(page);
  const openCamera = page.getByRole('button', { name: 'Open camera' });
  await expect(openCamera).toBeDisabled();
  await expect.poll(() => state.readinessRequests, { timeout: 5000 }).toBeGreaterThan(1);
  await expect(openCamera).toBeEnabled();
});

test('offline is visible before camera and prevents reservation; online revalidates readiness', async ({ page }) => {
  const state = await prepareGuestPage(page);
  await reachJoin(page, state);
  await acceptConsent(page);
  const openCamera = page.getByRole('button', { name: 'Open camera' });
  await expect(openCamera).toBeEnabled();
  await page.context().setOffline(true);
  await expect(page.getByText('You are offline. Reconnect to the internet to continue.')).toBeVisible();
  await expect(openCamera).toBeDisabled();
  expect(state.reservations).toBe(0);
  const checksBeforeReconnect = state.readinessRequests;
  await page.context().setOffline(false);
  await expect.poll(() => state.readinessRequests).toBeGreaterThan(checksBeforeReconnect);
  expect(state.reservations).toBe(0);
});

test('camera denial, quota conflict, closed state and H73 gallery remain safely handled', async ({ page }) => {
  const denied = await prepareGuestPage(page, { cameraDenied: true });
  await reachJoin(page, denied);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByText('Camera permission is needed to take a photo.')).toBeVisible();
  expect(denied.reservations).toBe(0);

  await page.goto('/');
  const quota = await prepareGuestPage(page, { reservationConflict: true });
  await reachJoin(page, quota);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'The photo quota for this session has been reached.' })).toBeVisible();
  expect(quota.reservations).toBe(1);

  await page.goto('/');
  const closed = await prepareGuestPage(page, { closed: true });
  await reachJoin(page, closed);
  await acceptConsent(page);
  await expect(page.getByText('The photo session is closed')).toBeVisible();
  await expect(page.getByText(/Photos reveal:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /gallery/i })).toHaveCount(0);
  expect(closed.reservations).toBe(0);
});
