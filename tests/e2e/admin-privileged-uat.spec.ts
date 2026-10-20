import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { installUatApi } from '../uat/mock-api';
import { uatIds } from '../uat/constants';

for (const route of ['sensitive-access', 'hold'] as const) {
  test(`Owner fixture ${route} TOTP entry accepts keyboard digits and explains rejected characters @cross-browser`, async ({ page }) => {
    await installUatApi(page);
    await page.goto(`/admin/albums/${uatIds.album}/${route}?uat=normal`);
    const input = page.getByLabel(/Kode TOTP|TOTP code/i);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await input.focus();
    await expect(input).toBeFocused();
    await input.pressSequentially('012345');
    await expect(input).toHaveValue('012345');
    await input.fill('abc');
    await expect(input).toHaveValue('');
    await expect(page.getByRole('status').filter({ hasText: /digit|angka/i })).toBeVisible();
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  });
}

test('H91/H92 synthetic fixture preserves step-up, CSRF, grant expiry and server Hold transitions', async ({ page }) => {
  await installUatApi(page);
  const operations: string[] = [];
  const csrfValid: boolean[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && /admin\/(auth\/step-up|albums\/.*\/(sensitive-access-grants|operational-hold)|sensitive-access-grants\/)/.test(path)) {
      operations.push(`${request.method()} ${path}`);
      csrfValid.push(request.headers()['x-csrf-token'] === 'owner-uat-csrf');
    }
  });

  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  await page.getByLabel(/Alasan audit|Audit reason/i).fill('Synthetic investigation');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByText('owner-uat-grant')).toBeVisible();
  await expect(page.getByAltText(/Foto privat dalam akses sensitif|Private photo under sensitive access/i)).toBeVisible();
  await expect(page.getByLabel(/Kode TOTP|TOTP code/i)).toHaveValue('');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Cabut akses|Revoke access/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByRole('heading', { name: /Minta grant sementara|Request temporary grant/i })).toBeVisible();
  await expect(page.getByAltText(/Foto privat dalam akses sensitif|Private photo under sensitive access/i)).toHaveCount(0);

  await page.goto(`/admin/albums/${uatIds.album}/hold?uat=normal`);
  await expect(page.getByText(/NO ACTIVE HOLD|TIDAK ADA HOLD/i)).toBeVisible();
  await page.getByLabel(/Alasan wajib|Required reason/i).fill('Synthetic containment');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).click();
  await expect(page.getByText('ACTIVE HOLD', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic containment')).toBeVisible();
  await expect(page.getByLabel(/Alasan wajib|Required reason/i)).toBeEnabled();
  await page.getByLabel(/Alasan wajib|Required reason/i).fill('Synthetic release');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await expect(page.getByLabel(/Alasan wajib|Required reason/i)).toHaveValue('Synthetic release');
  await page.getByRole('button', { name: /Konfirmasi pelepasan|Confirm release/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).click();
  await expect(page.getByText(/NO ACTIVE HOLD|TIDAK ADA HOLD/i)).toBeVisible();
  expect(csrfValid.every(Boolean)).toBe(true);
  expect(operations.map((item) => item.includes('/auth/step-up') ? 'step-up' : item.includes('sensitive-access-grants') ? 'grant' : 'hold')).toEqual(['step-up', 'grant', 'step-up', 'grant', 'step-up', 'hold', 'step-up', 'hold']);
});

test('H91 and H92 input supports paste, keyboard navigation and responsive ID/EN themes', async ({ page }) => {
  await installUatApi(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const route of ['sensitive-access', 'hold'] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/admin/albums/${uatIds.album}/${route}?uat=normal`);
    const input = page.getByLabel(/Kode TOTP|TOTP code/i);
    await page.evaluate(() => navigator.clipboard.writeText('01x2345'));
    await expect(input).toBeEnabled();
    await input.focus();
    await page.keyboard.press('ControlOrMeta+V');
    await expect(input).toHaveValue('012345');
    await expect(page.getByRole('status').filter({ hasText: /angka|digit/i })).toBeVisible();
    await input.press('Tab');
    await expect(input).not.toBeFocused();
    await input.fill('');
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} overflow at ${width}px`).toBe(true);
    }
    if (route === 'sensitive-access') {
      const description = page.getByText('Akses sementara, terbatas pada album ini, hanya untuk melihat, dan dicatat. Operational Hold tidak memberikan akses media.');
      expect(await description.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(24);
    }
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  for (const route of ['sensitive-access', 'hold'] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/albums/${uatIds.album}/${route}?uat=normal`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByLabel('TOTP code')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('H91 rejected step-up statuses never create a grant or reveal raw API errors', async ({ page }) => {
  await installUatApi(page);
  let status = 401;
  let grantRequests = 0;
  await page.route('**/api/v1/admin/auth/step-up', (route) => route.fulfill({ status, json: { error: { code: 'INTERNAL', message: '<script>private-token-and-stack</script>' } } }));
  await page.route(`**/api/v1/admin/albums/${uatIds.album}/sensitive-access-grants`, (route) => { grantRequests += 1; return route.fallback(); });
  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  await page.getByLabel(/Alasan audit|Audit reason/i).fill('Investigate');
  const safeMessages: Array<[number, RegExp]> = [
    [401, /Verifikasi belum berhasil|Verification did not succeed/i],
    [403, /Akses Admin tidak tersedia|Admin access is not available/i],
    [409, /Data berubah di tempat lain|record changed elsewhere/i],
    [410, /Akses ini sudah berakhir|access has expired/i],
    [422, /Nilai tidak dapat diterima|value could not be accepted/i],
    [429, /Terlalu banyak permintaan|Too many requests/i],
    [503, /Layanan sedang tidak tersedia|service is unavailable/i],
    [599, /Permintaan belum dapat diselesaikan|request could not be completed/i],
  ];
  for (const [candidate, safeMessage] of safeMessages) {
    status = candidate;
    await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
    await page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
    await expect(page.getByLabel(/Kode TOTP|TOTP code/i)).toHaveValue('');
    await expect(page.locator('main [role="alert"]').filter({ hasText: safeMessage })).toBeVisible();
    await expect(page.getByText('private-token-and-stack')).toHaveCount(0);
    await expect(page.locator('script').filter({ hasText: 'private-token-and-stack' })).toHaveCount(0);
  }
  expect(grantRequests).toBe(0);
  await page.route('**/api/v1/admin/auth/step-up', (route) => route.abort('failed'));
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Koneksi terputus|connection dropped/i })).toBeVisible();
  expect(grantRequests).toBe(0);
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.context().setOffline(true);
  await expect(page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i })).toBeDisabled();
  await page.context().setOffline(false);
});

test('H91 cancellation, short code and failed revoke step-up block mutations', async ({ page }) => {
  await installUatApi(page);
  let stepUps = 0;
  let grantCreates = 0;
  let grantRevokes = 0;
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/step-up')) stepUps += 1;
    if (path.endsWith('/sensitive-access-grants')) grantCreates += 1;
    if (path.endsWith('/sensitive-access-grants/owner-uat-grant')) grantRevokes += 1;
  });
  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  const continueButton = page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i });
  await expect(continueButton).toBeDisabled();
  await page.getByLabel(/Alasan audit|Audit reason/i).fill('Investigate');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('12345');
  await expect(continueButton).toBeDisabled();
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await continueButton.click();
  await page.getByRole('dialog').getByRole('button', { name: /Batal|Cancel/i }).click();
  expect(stepUps).toBe(0);
  expect(grantCreates).toBe(0);
  await continueButton.click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByText('owner-uat-grant')).toBeVisible();
  await page.route('**/api/v1/admin/auth/step-up', (route) => route.fulfill({ status: 401, json: { error: { message: 'private internal trace' } } }));
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Cabut akses|Revoke access/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByText('owner-uat-grant')).toBeVisible();
  await expect(page.getByLabel(/Kode TOTP|TOTP code/i)).toHaveValue('');
  await expect(page.getByText('private internal trace')).toHaveCount(0);
  expect(stepUps).toBe(2);
  expect(grantCreates).toBe(1);
  expect(grantRevokes).toBe(0);
});

test('H92 failed create and release step-up never submit a Hold mutation', async ({ page }) => {
  await installUatApi(page);
  let stepStatus = 429;
  let holdMutations = 0;
  await page.route('**/api/v1/admin/auth/step-up', (route) => stepStatus === 200 ? route.fallback() : route.fulfill({ status: stepStatus, json: { error: { message: 'private internal trace' } } }));
  await page.route(`**/api/v1/admin/albums/${uatIds.album}/operational-hold`, (route) => {
    if (route.request().method() !== 'GET') holdMutations += 1;
    return route.fallback();
  });
  await page.goto(`/admin/albums/${uatIds.album}/hold?uat=normal`);
  const reason = page.getByLabel(/Alasan wajib|Required reason/i);
  const code = page.getByLabel(/Kode TOTP|TOTP code/i);
  await expect(page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i })).toBeDisabled();
  await reason.fill('Contain');
  await code.fill('012345');
  await page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Batal|Cancel/i }).click();
  expect(holdMutations).toBe(0);
  await page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).click();
  await expect(page.getByText(/Terlalu banyak permintaan|Too many requests/i)).toBeVisible();
  expect(holdMutations).toBe(0);
  stepStatus = 200;
  await code.fill('012345');
  await page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).click();
  await expect.poll(() => holdMutations).toBe(1);
  await expect(page.getByText('Contain')).toBeVisible();
  stepStatus = 403;
  await reason.fill('Release');
  await code.fill('012345');
  await page.getByRole('button', { name: /Konfirmasi pelepasan|Confirm release/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).click();
  await expect(page.getByText('Contain')).toBeVisible();
  await expect(page.getByText('private internal trace')).toHaveCount(0);
  expect(holdMutations).toBe(1);
});

test('H91 expired grant and delayed media response cannot restore private media', async ({ page }) => {
  test.slow();
  await installUatApi(page);
  let releaseMedia: (() => void) | undefined;
  const pendingMedia = new Promise<void>((resolve) => { releaseMedia = resolve; });
  await page.route(`**/api/v1/admin/albums/${uatIds.album}/sensitive-access-grants`, (route) => route.fulfill({ status: 201, json: { data: { grant_id: 'short-grant', album_id: uatIds.album, reason: 'Investigate', expires_at: new Date(Date.now() + 5_000).toISOString(), view_only: true } } }));
  await page.route(`**/api/v1/admin/albums/${uatIds.album}/sensitive-media**`, async (route) => {
    await pendingMedia;
    await route.fulfill({ status: 200, json: { data: [{ photo_id: 'late-private-photo', created_at: new Date().toISOString(), media: { url: 'https://media.test/late.jpg', expires_at: new Date(Date.now() + 60_000).toISOString() } }], meta: { has_more: false, next_cursor: null } } });
  });
  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  await page.getByLabel(/Alasan audit|Audit reason/i).fill('Investigate');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByText('short-grant')).toBeVisible();
  await expect(page.getByLabel(/Kode TOTP|TOTP code/i)).toBeEnabled();
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('654321');
  await expect(page.getByLabel(/Kode TOTP|TOTP code/i)).toHaveValue('654321');
  await expect(page.getByRole('heading', { name: /Minta grant sementara|Request temporary grant/i })).toBeVisible({ timeout: 15_000 });
  releaseMedia?.();
  await expect(page.getByText('late-private-photo')).toHaveCount(0);
  await expect(page.locator('img[src*="late.jpg"]')).toHaveCount(0);
});

test('H91 media authorization denial closes the grant and hides private media', async ({ page }) => {
  await installUatApi(page);
  await page.route(`**/api/v1/admin/albums/${uatIds.album}/sensitive-media**`, (route) => route.fulfill({ status: 403, json: { error: { message: 'private signed media credential' } } }));
  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  await page.getByLabel(/Alasan audit|Audit reason/i).fill('Investigate');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).click();
  await expect(page.getByRole('heading', { name: /Minta grant sementara|Request temporary grant/i })).toBeVisible();
  await expect(page.getByText(/Akses Admin tidak tersedia|Admin access is not available/i)).toBeVisible();
  await expect(page.getByText('private signed media credential')).toHaveCount(0);
  await expect(page.locator('main img[src*="media.test"]')).toHaveCount(0);
});

test('H91 duplicate confirmation only starts one step-up and mutation', async ({ page }) => {
  await installUatApi(page);
  let stepUps = 0;
  let mutations = 0;
  let releaseStepUp: (() => void) | undefined;
  const pendingStepUp = new Promise<void>((resolve) => { releaseStepUp = resolve; });
  await page.route('**/api/v1/admin/auth/step-up', async (route) => {
    stepUps += 1;
    await pendingStepUp;
    await route.fallback();
  });
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && (path.endsWith('/sensitive-access-grants') || path.endsWith('/operational-hold'))) mutations += 1;
  });
  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  await page.getByLabel(/Alasan audit|Audit reason/i).fill('Investigate');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Lanjutkan setelah konfirmasi|Continue to confirmation/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).dispatchEvent('click');
  await page.getByRole('dialog').getByRole('button', { name: /Konfirmasi|Confirm/i }).dispatchEvent('click');
  await expect.poll(() => stepUps).toBe(1);
  releaseStepUp?.();
  await expect.poll(() => mutations).toBe(1);
  await expect(page.getByText('owner-uat-grant')).toBeVisible();
});

test('H92 duplicate confirmation only starts one step-up and Hold mutation', async ({ page }) => {
  await installUatApi(page);
  let stepUps = 0;
  let mutations = 0;
  let releaseStepUp: (() => void) | undefined;
  const pendingStepUp = new Promise<void>((resolve) => { releaseStepUp = resolve; });
  await page.route('**/api/v1/admin/auth/step-up', async (route) => {
    stepUps += 1;
    await pendingStepUp;
    await route.fallback();
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/operational-hold')) mutations += 1;
  });
  await page.goto(`/admin/albums/${uatIds.album}/hold?uat=normal`);
  await page.getByLabel(/Alasan wajib|Required reason/i).fill('Contain');
  await page.getByLabel(/Kode TOTP|TOTP code/i).fill('012345');
  await page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).dispatchEvent('click');
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).dispatchEvent('click');
  await expect.poll(() => stepUps).toBe(1);
  releaseStepUp?.();
  await expect.poll(() => mutations).toBe(1);
  await expect(page.getByText('ACTIVE HOLD', { exact: true })).toBeVisible();
});

test('H92 denied authoritative state blocks changes and displays safe guidance', async ({ page }) => {
  await installUatApi(page);
  let mutationRequests = 0;
  await page.route(`**/api/v1/admin/albums/${uatIds.album}/operational-hold`, (route) => {
    if (route.request().method() !== 'GET') { mutationRequests += 1; return route.fallback(); }
    return route.fulfill({ status: 403, json: { error: { message: 'internal stack and token' } } });
  });
  await page.goto(`/admin/albums/${uatIds.album}/hold?uat=normal`);
  await expect(page.getByText(/Akses Admin tidak tersedia|Admin access is not available/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Konfirmasi Operational Hold|Confirm Operational Hold/i })).toBeDisabled();
  await expect(page.getByText('internal stack and token')).toHaveCount(0);
  expect(mutationRequests).toBe(0);
});

test('ordinary Admin reconciliation shows a safe message for a hostile API error', async ({ page }) => {
  await installUatApi(page);
  await page.route(`**/api/v1/admin/payments/${uatIds.transaction}/reconcile`, (route) => route.fulfill({ status: 409, json: { error: { message: '<script>internal-token-and-stack</script>' } } }));
  await page.goto(`/admin/payments/${uatIds.transaction}?uat=normal`);
  await page.getByRole('button', { name: /Periksa ulang ke provider|Re-check with Provider/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Lanjutkan|Continue/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Data berubah di tempat lain|record changed elsewhere/i })).toBeVisible();
  await expect(page.getByText('internal-token-and-stack')).toHaveCount(0);
  await expect(page.getByText('HTTP 409')).toHaveCount(0);
});

test('synthetic H91/H92 screenshots have empty TOTP inputs and localized safe errors', async ({ page }) => {
  test.skip(process.env.UAT_CAPTURE_EVIDENCE !== '1', 'Evidence capture runs only on request.');
  await installUatApi(page);
  const directory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-04/evidence');
  mkdirSync(directory, { recursive: true });
  for (const [route, id] of [['sensitive-access', 'h91'], ['hold', 'h92']] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/admin/albums/${uatIds.album}/${route}?uat=normal`);
    await expect(page.getByLabel(/Kode TOTP|TOTP code/i)).toHaveValue('');
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await page.screenshot({ path: resolve(directory, `${id}-desktop-1440-id-light.png`), fullPage: true, animations: 'disabled' });
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  for (const [route, id] of [['sensitive-access', 'h91'], ['hold', 'h92']] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/albums/${uatIds.album}/${route}?uat=normal`);
    await expect(page.getByLabel('TOTP code')).toHaveValue('');
    await page.screenshot({ path: resolve(directory, `${id}-mobile-390-en-dark.png`), fullPage: true, animations: 'disabled' });
  }
  await page.route('**/api/v1/admin/auth/step-up', (route) => route.fulfill({ status: 429, json: { error: { message: 'internal stack and token' } } }));
  await page.goto(`/admin/albums/${uatIds.album}/sensitive-access?uat=normal`);
  await page.getByLabel('Audit reason').fill('Synthetic review');
  await page.getByLabel('TOTP code').fill('012345');
  await page.getByRole('button', { name: 'Continue to confirmation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByLabel('TOTP code')).toHaveValue('');
  await expect(page.locator('main [role="alert"]')).toBeVisible();
  await page.screenshot({ path: resolve(directory, 'h91-safe-error-mobile-390-en-dark.png'), fullPage: true, animations: 'disabled' });
});
