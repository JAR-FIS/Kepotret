import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { uatIds } from './constants';
import { installUatApi } from './mock-api';

async function evidence(page: Page, testInfo: TestInfo, name: string) {
  if (process.env.UAT_CAPTURE_EVIDENCE !== '1' || testInfo.repeatEachIndex !== 0) return;
  await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
  const dir = join(process.cwd(), 'docs', 'reviews', 'FE-UAT-T2-01', 'evidence');
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}-${testInfo.project.name}.png`), fullPage: true, animations: 'disabled' });
}

async function joinGuest(page: Page, scenario = 'normal') {
  await page.goto(`/j/${uatIds.link}?uat=${scenario}#synthetic-owner-uat-secret`);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByLabel('Nama tampilan').fill('Tamu UAT');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
}

async function reachReview(page: Page, scenario = 'normal') {
  await joinGuest(page, scenario);
  await page.getByRole('button', { name: 'Buka kamera' }).click();
  await expect(page.getByRole('button', { name: 'Ambil foto' })).toBeEnabled();
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await expect(page.getByRole('button', { name: 'Gunakan foto' })).toBeVisible();
}

test('synthetic Guest capture reaches review through a valid reservation', async ({ page }) => {
  const fixture = await installUatApi(page);
  await reachReview(page);
  expect(fixture.reservationCount).toBe(1);
  expect(fixture.captureRequests).toContain('reserve');
  expect(fixture.unmatchedGuestRequests).toEqual([]);
});

test('H70 preferences preserve the captured photo and retake releases reservation', async ({ page }, testInfo) => {
  const fixture = await installUatApi(page);
  await reachReview(page);
  await expect(page.getByRole('button', { name: 'Buka Asisten AI' })).toHaveCount(0);
  await evidence(page, testInfo, 'h70-review-id-light');
  const preview = page.getByRole('img', { name: 'Pratinjau foto acara' });
  const src = await preview.getAttribute('src');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Event photo preview' })).toHaveAttribute('src', src!);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  await evidence(page, testInfo, 'h70-review-en-dark');
  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeVisible();
  expect(fixture.captureRequests).toContain('release');
  expect(fixture.unmatchedGuestRequests).toEqual([]);
});

test('H71 pending barrier completes synthetic PUT and commit', async ({ page }, testInfo) => {
  const fixture = await installUatApi(page);
  await reachReview(page, 'save-pending');
  await page.getByRole('button', { name: 'Gunakan foto' }).click();
  await expect(page.getByRole('button', { name: 'Buka Asisten AI' })).toHaveCount(0);
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Menyimpan foto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Synthetic UAT: complete save' })).toBeVisible();
  await evidence(page, testInfo, 'h71-saving-pending');
  await page.getByRole('button', { name: 'Synthetic UAT: complete save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Foto berhasil tersimpan' })).toBeVisible();
  await evidence(page, testInfo, 'h71-save-success');
  expect(fixture.putCount).toBe(1);
  expect(fixture.commitCount).toBe(1);
  expect(fixture.captureRequests).toEqual(expect.arrayContaining(['reserve', 'upload-authorization', 'commit']));
  expect(fixture.unmatchedGuestRequests).toEqual([]);
});

for (const scenario of ['save-fail-put', 'save-fail-commit'] as const) {
  test(`H71 ${scenario} recovers on retry`, async ({ page }, testInfo) => {
    const fixture = await installUatApi(page);
    await reachReview(page, scenario);
    await page.getByRole('button', { name: 'Gunakan foto' }).click();
    await expect(page.getByRole('button', { name: 'Gunakan foto' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Kami belum dapat memproses' })).toBeVisible();
    await evidence(page, testInfo, `h71-${scenario}`);
    await page.getByRole('button', { name: 'Gunakan foto' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Foto berhasil tersimpan' })).toBeVisible();
    expect(fixture.unmatchedGuestRequests).toEqual([]);
  });
}

for (const [scenario, message] of [['upload-denied', 'Tautan atau akses'], ['upload-rate-limit', 'Terlalu banyak percobaan']] as const) {
  test(`H71 ${scenario} obeys access and rate limits`, async ({ page }) => {
    await installUatApi(page);
    await reachReview(page, scenario);
    await page.getByRole('button', { name: 'Gunakan foto' }).click();
    await expect(page.getByText(new RegExp(message)).first()).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Foto berhasil tersimpan' })).toHaveCount(0);
  });
}

test('H70 expired attempt returns safely to waiting room', async ({ page }) => {
  const fixture = await installUatApi(page);
  await reachReview(page, 'reservation-expired');
  await page.getByRole('button', { name: 'Ambil ulang' }).click();
  await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeVisible();
  await expect(page.getByText('Foto sebelumnya sudah tidak dapat disimpan.')).toBeVisible();
  expect(fixture.captureRequests).toContain('status');
  expect(fixture.captureRequests).not.toContain('release');
});

for (const [scenario, message] of [['reservation-denied', 'Tautan atau akses'], ['reservation-rate-limit', 'Terlalu banyak percobaan']] as const) {
  test(`H70 ${scenario} does not reveal review`, async ({ page }) => {
    await installUatApi(page);
    await joinGuest(page, scenario);
    await page.getByRole('button', { name: 'Buka kamera' }).click();
    await page.getByRole('button', { name: 'Ambil foto' }).click();
    await expect(page.getByText(new RegExp(message)).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gunakan foto' })).toHaveCount(0);
  });
}

test('camera denial cannot enter review or reserve quota', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('denied', 'NotAllowedError'); } } });
  });
  const fixture = await installUatApi(page);
  await joinGuest(page);
  await page.getByRole('button', { name: 'Buka kamera' }).click();
  await expect(page.getByText('Izin kamera diperlukan untuk mengambil foto.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gunakan foto' })).toHaveCount(0);
  expect(fixture.reservationCount).toBe(0);
});

test('H72 closed countdown has no capture action and reveal routing is server authorized', async ({ page }, testInfo) => {
  const fixture = await installUatApi(page);
  await joinGuest(page, 'closed');
  await expect(page.getByText('Sesi foto telah ditutup', { exact: true })).toBeVisible();
  await expect(page.getByText(/Foto dibuka:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buka kamera' })).toHaveCount(0);
  await evidence(page, testInfo, 'h72-closed-countdown');
  expect(fixture.reservationCount).toBe(0);
  await page.goto(`/j/${uatIds.link}?uat=closed-revealed#synthetic-owner-uat-secret`);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByLabel('Nama tampilan').fill('Tamu UAT');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
  await expect(page).toHaveURL(/\/galeri$/);
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toBeVisible();
});

test('H73 gallery requires revealed Guest context and supports empty and terminal states', async ({ page }, testInfo) => {
  const fixture = await installUatApi(page);
  await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ari UAT/ })).toBeVisible();
  await evidence(page, testInfo, 'h73-gallery-revealed');
  await page.getByLabel('Urutkan').selectOption('MOST_LIKED');
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toBeVisible();
  await page.goto(`/j/${uatIds.link}/galeri?uat=hidden#synthetic-owner-uat-secret`);
  await expect(page.getByText(/Galeri akan tersedia setelah waktu reveal/)).toBeVisible();
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toHaveCount(0);
  await page.goto(`/j/${uatIds.link}/galeri?uat=empty#synthetic-owner-uat-secret`);
  await expect(page.getByRole('heading', { name: 'Belum ada foto yang ditampilkan' })).toBeVisible();
  await page.goto(`/j/${uatIds.link}/galeri?uat=denied#synthetic-owner-uat-secret`);
  await expect(page).toHaveURL(/\/akses-berakhir$/);
  await page.goto(`/j/${uatIds.link}/galeri?uat=unauthorized#synthetic-owner-uat-secret`);
  await expect(page).toHaveURL(/\/akses-berakhir$/);
  await page.goto(`/j/${uatIds.link}/galeri?uat=expired#synthetic-owner-uat-secret`);
  await expect(page).toHaveURL(/\/akhir-acara$/);
  expect(fixture.unmatchedGuestRequests).toEqual([]);
});

test('H74 detail obeys action permissions and denied detail hides media', async ({ page }, testInfo) => {
  const fixture = await installUatApi(page);
  const detail = `/j/${uatIds.link}/galeri/${uatIds.photo}`;
  await page.goto(`${detail}?uat=revealed#synthetic-owner-uat-secret`);
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salin tautan' })).toBeVisible();
  await evidence(page, testInfo, 'h74-photo-detail');
  await page.getByRole('button', { name: 'Sukai foto' }).click();
  await expect(page.getByRole('button', { name: 'Foto disukai' })).toBeVisible();
  await page.getByRole('link', { name: 'Kembali ke galeri' }).click();
  await expect(page).toHaveURL(/\/galeri$/);
  await page.goto(`${detail}?uat=permissions-off#synthetic-owner-uat-secret`);
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salin tautan' })).toHaveCount(0);
  await page.goto(`${detail}?uat=detail-denied#synthetic-owner-uat-secret`);
  await expect(page.getByText('Foto ini tidak lagi tersedia untuk tamu.')).toBeVisible();
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toHaveCount(0);
  await page.goto(`${detail}?uat=hidden#synthetic-owner-uat-secret`);
  await expect(page.getByText(/Galeri akan tersedia setelah waktu reveal/)).toBeVisible();
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toHaveCount(0);
  expect(fixture.unmatchedGuestRequests).toEqual([]);
});

test('H75 and H76 have distinct branded terminal actions and shared preferences', async ({ page }, testInfo) => {
  await installUatApi(page);
  await page.goto(`/j/${uatIds.link}/akses-berakhir?uat=normal#synthetic-owner-uat-secret`);
  await expect(page.getByRole('heading', { name: 'Akses galeri berakhir' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bantuan akses' })).toHaveAttribute('href', '/bantuan');
  await expect(page.getByRole('link', { name: 'Kembali ke Beranda Kepotret' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('img', { name: 'Kepotret' }).first()).toBeVisible();
  await evidence(page, testInfo, 'h75-access-ended-id-light');
  const localeButton = page.getByRole('button', { name: 'Bahasa: ID' });
  expect((await localeButton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await localeButton.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const themeButton = page.getByRole('button', { name: 'Switch to dark theme' });
  expect((await themeButton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await themeButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Gallery access ended' })).toBeVisible();
  await evidence(page, testInfo, 'h75-access-ended-en-dark');
  await page.goto(`/j/${uatIds.link}/akhir-acara?uat=normal#synthetic-owner-uat-secret`);
  await expect(page.getByRole('heading', { name: 'Event access period ended' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How Kepotret works' })).toHaveAttribute('href', '/cara-kerja');
  await expect(page.getByRole('link', { name: 'Back to Kepotret Home' })).toHaveAttribute('href', '/');
  await evidence(page, testInfo, 'h76-post-event-en-dark');
  await page.getByRole('button', { name: 'Language: ENG' }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();
  await page.getByRole('button', { name: 'Ganti ke tema terang' }).click();
  await expect(page.getByRole('heading', { name: 'Masa akses acara selesai' })).toBeVisible();
  await evidence(page, testInfo, 'h76-post-event-id-light');
});

test('query and local storage flags cannot unlock Guest access without UAT interception', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('uat', 'revealed'));
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 401, json: { error: { code: 'UNAUTHORIZED' } } }));
  await page.goto(`/j/${uatIds.link}/galeri/${uatIds.photo}?uat=revealed#synthetic-owner-uat-secret`);
  await expect(page.getByRole('img', { name: /Ari UAT/ })).toHaveCount(0);
  await expect(page.locator('#__owner-visual-uat-badge')).toHaveCount(0);
  await page.goto(`/j/${uatIds.link}?uat=review`);
  await expect(page.getByRole('button', { name: 'Gunakan foto' })).toHaveCount(0);
});

test('Guest surfaces have no horizontal overflow at required widths', async ({ page }) => {
  await installUatApi(page);
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/j/${uatIds.link}/akses-berakhir?uat=normal#synthetic-owner-uat-secret`);
    await expect(page.getByRole('heading', { name: 'Akses galeri berakhir' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
    await expect(page.getByRole('img', { name: /Ari UAT/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }
});

test('H70 review remains usable at 360, 390, 768 and 1440 pixels', async ({ page }) => {
  await installUatApi(page);
  await reachReview(page);
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: 'Ambil ulang' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gunakan foto' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }
});
