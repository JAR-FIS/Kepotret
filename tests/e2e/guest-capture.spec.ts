import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

declare global {
  interface Window { captureTrace?: string[]; revokedCaptureUrls?: string[]; cameraTrace?: string[]; frameTrace?: number[]; releaseCamera?: () => void }
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
  cameraCount?: number;
  cameraSwitchFails?: boolean;
  cameraFailure?: 'NotFoundError' | 'NotReadableError';
  playFailures?: number;
  holdCamera?: boolean;
  holdReadinessAt?: number;
  readinessStatuses?: number[];
  emptyFrame?: boolean;
  reservationConflict?: boolean;
  closed?: boolean;
  revealState?: 'HIDDEN' | 'REVEALED';
  waitingStart?: string;
  readinessSequence?: Array<'WAITING' | 'READY'>;
  sessionStatuses?: number[];
  guestMeStatuses?: number[];
  reservationStatuses?: number[];
  recoveryStatuses?: Array<'COMMITTED' | 'ACTIVE' | 'EXPIRED' | 'RELEASED'>;
  readinessAfterRecovery?: 'READY' | 'WAITING' | 'CLOSED' | 'QUOTA_FULL' | 'GUEST_LIMIT_REACHED' | 'UNAVAILABLE';
};

async function prepareGuestPage(page: Page, options: Options = {}) {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.addInitScript(({ cameraDenied, cameraCount, cameraSwitchFails, cameraFailure, playFailures, holdCamera, emptyFrame }) => {
    const cameraTrace: string[] = [];
    Object.defineProperty(window, 'cameraTrace', { configurable: true, value: cameraTrace });
    if (typeof MediaStream === 'undefined') Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', { configurable: true, writable: true, value: null });
    let activeStreams = 0;
    let heldFirstOpen = false;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        if (cameraDenied) throw new DOMException('denied', 'NotAllowedError');
        if (cameraFailure) throw new DOMException('unavailable', cameraFailure);
        if (holdCamera && !heldFirstOpen) {
          heldFirstOpen = true;
          await new Promise<void>((resolve) => { window.releaseCamera = resolve; });
        }
        const video = constraints.video && typeof constraints.video === 'object' ? constraints.video : {};
        const requested = video.deviceId && !Array.isArray(video.deviceId) && typeof video.deviceId === 'object' ? video.deviceId.exact : undefined;
        const deviceId = typeof requested === 'string' ? requested : 'rear';
        if (cameraSwitchFails && deviceId === 'front') throw new DOMException('busy', 'NotReadableError');
        activeStreams += 1;
        cameraTrace.push(`open:${deviceId}:${activeStreams}`);
        const track = { stop: () => { activeStreams -= 1; cameraTrace.push(`stop:${deviceId}:${activeStreams}`); }, getSettings: () => ({ deviceId, facingMode: deviceId === 'front' ? 'user' : 'environment' }) };
        const stream = typeof MediaStream === 'undefined' ? {} as MediaStream : new MediaStream();
        Object.defineProperty(stream, 'getVideoTracks', { value: () => [track] });
        Object.defineProperty(stream, 'getTracks', { value: () => [track] });
        return stream;
      },
      enumerateDevices: async () => Array.from({ length: cameraCount }, (_, index) => ({ kind: 'videoinput', deviceId: index ? 'front' : 'rear', label: index ? 'Front camera' : 'Rear camera', groupId: 'fixture', toJSON() { return this; } })),
    } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
    let playCalls = 0;
    HTMLVideoElement.prototype.play = async function () {
      playCalls += 1;
      if (playCalls <= playFailures) throw new DOMException('playback failed', 'NotAllowedError');
    };
    let canvasExports = 0;
    const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type = 'image/png') {
      canvasExports += 1;
      if (emptyFrame && canvasExports === 1) callback(new Blob([], { type }));
      else nativeToBlob.call(this, callback, type);
    };
    HTMLCanvasElement.prototype.getContext = (() => ({ drawImage(...args: unknown[]) { window.frameTrace = args.slice(1).map(Number); }, translate() {}, scale() {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: async () => ({ width: 640, height: 480, close() {} }) });
    Object.defineProperty(window, 'revokedCaptureUrls', { configurable: true, value: [] });
    const revokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => { window.revokedCaptureUrls?.push(url); revokeObjectURL(url); };
  }, { cameraDenied: options.cameraDenied ?? false, cameraCount: options.cameraCount ?? 1, cameraSwitchFails: options.cameraSwitchFails ?? false, cameraFailure: options.cameraFailure, playFailures: options.playFailures ?? 0, holdCamera: options.holdCamera ?? false, emptyFrame: options.emptyFrame ?? false });

  let reservations = 0;
  let sessions = 0;
  let guestMeRequests = 0;
  let readinessRequests = 0;
  let readinessFulfilled = 0;
  let releaseReadiness: (() => void) | undefined;
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
  await page.route(`**/api/v1/albums/${albumId}/capture-readiness`, async (route) => {
    readinessRequests += 1;
    const status = options.readinessStatuses?.shift() ?? 200;
    if (readinessRequests === options.holdReadinessAt) await new Promise<void>((resolve) => { releaseReadiness = resolve; });
    readinessFulfilled += 1;
    if (status !== 200) return route.fulfill({ status, json: { error: { code: 'DENIED', message: 'internal details' } } });
    const nextState = options.readinessSequence?.shift();
    const state = options.closed ? 'CLOSED' : recoveryChecks > 0 && options.readinessAfterRecovery ? options.readinessAfterRecovery : options.reservationConflict && reservations > 0 ? 'QUOTA_FULL' : nextState ?? 'READY';
    const waitBoundary = options.waitingStart ?? (recoveryChecks > 0 && options.readinessAfterRecovery === 'WAITING' ? '2026-10-01T10:00:00Z' : '2026-09-27T00:00:02Z');
    const data = state === 'WAITING' ? { ...readyReadiness, state, can_capture: false, server_time: '2026-09-27T00:00:00Z', capture_start: waitBoundary } : { ...readyReadiness, state, reveal_state: options.revealState ?? 'HIDDEN', can_capture: state === 'READY', album_remaining_count: state === 'QUOTA_FULL' ? 0 : 29 };
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
    get reservations() { return reservations; }, get sessions() { return sessions; }, get guestMeRequests() { return guestMeRequests; }, get readinessRequests() { return readinessRequests; }, get readinessFulfilled() { return readinessFulfilled; }, releaseReadiness() { releaseReadiness?.(); },
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

test('H69 fullscreen camera and H70 review retain capture across preferences and retake @release-critical @cross-browser', async ({ page }) => {
  const state = await prepareGuestPage(page, { cameraCount: 2 });
  await page.setViewportSize({ width: 390, height: 844 });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  const shutter = page.getByRole('button', { name: 'Take photo' });
  await expect(shutter).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Switch camera' })).toBeVisible();
  expect(await page.locator('main button').count()).toBe(2);
  await expect(page.getByRole('heading', { name: 'Kepotret E2E' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Language/ })).toHaveCount(0);
  const cameraGeometry = await page.evaluate(() => ({ width: document.querySelector('main')?.getBoundingClientRect().width, height: document.querySelector('main')?.getBoundingClientRect().height, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth }));
  expect(cameraGeometry.width).toBe(cameraGeometry.viewportWidth);
  expect(cameraGeometry.height).toBe(cameraGeometry.viewportHeight);
  expect(cameraGeometry.scrollWidth).toBeLessThanOrEqual(cameraGeometry.viewportWidth + 1);
  for (const viewport of [{ width: 320, height: 568 }, { width: 412, height: 915 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.evaluate(() => ({ viewportWidth: innerWidth, viewportHeight: innerHeight, main: document.querySelector('main')!.getBoundingClientRect().toJSON(), shutter: document.querySelector('main button')!.getBoundingClientRect().toJSON(), scrollWidth: document.documentElement.scrollWidth }));
    expect(bounds.main.width).toBe(bounds.viewportWidth);
    expect(bounds.main.height).toBe(bounds.viewportHeight);
    expect(bounds.shutter.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole('button', { name: 'Switch camera' }).click();
  await expect(shutter).toBeEnabled();
  const cameraTrace = await page.evaluate(() => window.cameraTrace ?? []);
  expect(cameraTrace).toEqual(['open:rear:1', 'stop:rear:0', 'open:front:1']);
  await shutter.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  expect(state.reservations).toBe(1);
  const frameTrace = await page.evaluate(() => window.frameTrace ?? []);
  expect(frameTrace[2]).toBeLessThan(640);
  expect(frameTrace[3]).toBe(480);
  await expect(page.getByRole('link', { name: 'Kepotret' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Home/ })).toBeVisible();
  await expect.poll(() => page.locator('header img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.getByRole('img', { name: 'Event photo preview' }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const photo = page.getByRole('img', { name: 'Event photo preview' });
  const photoUrl = await photo.getAttribute('src');
  await page.getByRole('button', { name: /Language/ }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();
  await expect(page.getByRole('img', { name: 'Pratinjau foto acara' })).toHaveAttribute('src', photoUrl ?? '');
  await page.getByRole('button', { name: 'Ganti ke tema gelap' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  expect(state.reservations).toBe(1);
  const retake = page.getByRole('button', { name: 'Ambil ulang' });
  await expect(retake).toHaveCSS('white-space', 'nowrap');
  await retake.click();
  await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeVisible();
  expect(state.releaseIds).toHaveLength(1);
  await page.getByRole('button', { name: 'Buka kamera' }).click();
  await expect(page.getByRole('button', { name: 'Ambil foto' })).toBeEnabled();
  await expect(page.getByRole('link', { name: /Beranda/ })).toHaveCount(0);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await expect(page.getByRole('button', { name: 'Gunakan foto' })).toBeVisible();
  expect((await page.evaluate(() => window.frameTrace ?? []))[3]).toBeLessThan(480);
});

test('H69 hides unavailable switching and never reviews an empty camera frame', async ({ page }) => {
  const state = await prepareGuestPage(page, { emptyFrame: true });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Switch camera' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect.poll(() => state.reservations).toBe(1);
  await expect(page.locator('main [role="alert"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use photo' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  expect(state.reservationKeys).toHaveLength(2);
  expect(state.reservationKeys[0]).toBe(state.reservationKeys[1]);
});

test('H69 shows the dedicated viewfinder while camera permission is pending', async ({ page }) => {
  const state = await prepareGuestPage(page, { holdCamera: true });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.locator('main').getByRole('status')).toHaveText('Preparing the camera…');
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Kepotret E2E' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open AI Assistant' })).toHaveCount(0);
  expect(state.reservations).toBe(0);
  await page.evaluate(() => window.releaseCamera?.());
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
});

test('H69 failed camera switch restores the original stream without a second active camera', async ({ page }) => {
  const state = await prepareGuestPage(page, { cameraCount: 2, cameraSwitchFails: true });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await page.getByRole('button', { name: 'Switch camera' }).click();
  await expect(page.getByText('Could not switch cameras. Try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Switch camera' })).toHaveCount(0);
  expect(await page.evaluate(() => window.cameraTrace)).toEqual(['open:rear:1', 'stop:rear:0', 'open:rear:1']);
  expect(state.reservations).toBe(0);
});

for (const status of [401, 403]) {
  test(`H69 switch readiness ${status} keeps access denied and stops the stream`, async ({ page }) => {
    const state = await prepareGuestPage(page, { cameraCount: 2, readinessStatuses: [200, 200, status] });
    await reachJoin(page, state);
    await acceptConsent(page);
    await page.getByRole('button', { name: 'Open camera' }).click();
    await expect(page.getByRole('button', { name: 'Switch camera' })).toBeEnabled();
    await page.getByRole('button', { name: 'Switch camera' }).click();
    await expect(page.locator('section p[role="alert"]')).toContainText('This event link or access is unavailable.');
    await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Take photo' })).toHaveCount(0);
    expect(await page.evaluate(() => window.cameraTrace)).toEqual(['open:rear:1', 'stop:rear:0']);
    expect(state.reservations).toBe(0);
  });
}

test('H69 playback rejection stops media and offers a successful camera retry', async ({ page }) => {
  const state = await prepareGuestPage(page, { playFailures: 1 });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.locator('section p[role="alert"]')).toContainText('The camera could not start. Try opening it again.');
  await expect(page.getByRole('button', { name: 'Take photo' })).toHaveCount(0);
  expect(await page.evaluate(() => window.cameraTrace)).toEqual(['open:rear:1', 'stop:rear:0']);
  expect(state.reservations).toBe(0);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  expect(await page.evaluate(() => window.cameraTrace)).toEqual(['open:rear:1', 'stop:rear:0', 'open:rear:1']);
});

test('H69 late readiness after terminal stage exit cannot acquire camera media', async ({ page }) => {
  const state = await prepareGuestPage(page, { holdReadinessAt: 2, readinessStatuses: [200, 200, 403] });
  await reachJoin(page, state);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect.poll(() => state.readinessRequests).toBe(2);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('section p[role="alert"]')).toContainText('This event link or access is unavailable.');
  state.releaseReadiness();
  await expect.poll(() => state.readinessFulfilled).toBe(3);
  await page.waitForTimeout(200);
  await expect(page.getByRole('button', { name: 'Take photo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
  expect(await page.evaluate(() => window.cameraTrace)).toEqual([]);
  expect(state.reservations).toBe(0);
  await page.goto('/');
});

test('H69 gates shutter while offline and explains missing or busy cameras', async ({ page }) => {
  const active = await prepareGuestPage(page);
  await reachJoin(page, active);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  await page.context().setOffline(true);
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeDisabled();
  await expect(page.getByText('An internet connection is required before taking a photo.')).toBeVisible();
  expect(active.reservations).toBe(0);
  await page.context().setOffline(false);
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeEnabled();

  await page.goto('/');
  const missing = await prepareGuestPage(page, { cameraFailure: 'NotFoundError' });
  await reachJoin(page, missing);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByText('No camera was found on this device.')).toBeVisible();
  expect(missing.reservations).toBe(0);

  await page.goto('/');
  const busy = await prepareGuestPage(page, { cameraFailure: 'NotReadableError' });
  await reachJoin(page, busy);
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByText('The camera is busy in another app.')).toBeVisible();
  expect(busy.reservations).toBe(0);
});

test('H72 separates waiting, closed reveal countdown, and published states in both locales', async ({ page }) => {
  const waiting = await prepareGuestPage(page, { readinessSequence: ['WAITING'], waitingStart: '2026-09-27T01:00:00Z' });
  await reachJoin(page, waiting);
  await acceptConsent(page);
  await expect(page.getByText('It is not time to take photos yet')).toBeVisible();
  await expect(page.getByText(/Photo session begins:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeDisabled();

  await page.goto('/');
  const closed = await prepareGuestPage(page, { closed: true });
  await reachJoin(page, closed);
  await acceptConsent(page);
  await expect(page.getByText('The photo session is closed')).toBeVisible();
  await expect(page.getByText('Time until photos are published')).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
  await page.getByRole('button', { name: /Language/ }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();
  await expect(page.getByText('Waktu menuju publikasi foto')).toBeVisible();

  await page.goto('/');
  const published = await prepareGuestPage(page, { closed: true, revealState: 'REVEALED' });
  await reachJoin(page, published);
  await acceptConsent(page);
  await expect(page.getByText("Photos are available according to the album's gallery settings. Capture remains closed.")).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0);
});

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
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toBeVisible();
  expect(state.reservations).toBe(1);
  expect(state.uploadAuthorizations).toBe(1);
  expect(state.uploadAttemptIds).toEqual([`${attemptId.slice(0, -1)}1`]);

  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
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
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if ((pathname.includes('/photos/') || pathname.includes('/media/')) && !pathname.startsWith('/_next/static/media/')) {
      mediaRequests += 1;
    }
  });
  await captureForUploadRecovery(page, state);
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
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
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.revokedCaptureUrls)).toHaveLength(2);
});

test('a closed capture window still leaves the committed local copy available', async ({ page }) => {
  const state = await prepareGuestPage(page, { readinessAfterRecovery: 'CLOSED' });
  await captureForUploadRecovery(page, state);
  await page.getByRole('button', { name: 'Use photo' }).click();
  await expect(page.getByText('Photo saved to the album')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Take again' }).click();
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
  await page.getByRole('button', { name: 'Take again' }).click();
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
