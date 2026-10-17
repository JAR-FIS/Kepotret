import { expect, test } from '@playwright/test';
import { uatCaptureEnd, uatCaptureStart, uatEventName, uatIds, uatNow } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

test('@cross-browser H58 cover flow is explicitly synthetic and exercises authorization, upload, commit, and selection', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/albums/') || request.url().includes('upload.test')) calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await installUatApi(page);
  await page.goto(`/album/${uatIds.album}/desain?uat=normal`);
  await page.getByLabel('Pilih gambar sampul').setInputFiles({
    name: 'synthetic-cover.png',
    mimeType: 'image/png',
    buffer: Buffer.from('synthetic fixture only'),
  });

  await expect(page.getByText('Pilihan sampul diperbarui.')).toBeVisible();
  await expect(page.getByAltText('Pratinjau sampul terpilih')).toHaveAttribute('src', /media\.test\/owner-uat\/cover\.svg/);
  expect(calls).toContain('POST /api/v1/albums/11111111-1111-4111-8111-111111111111/design-assets/upload-authorizations');
  expect(calls).toContain('PUT /owner-uat/design');
  expect(calls).toContain('POST /api/v1/albums/11111111-1111-4111-8111-111111111111/design-assets/22222222-2222-4222-8222-222222222222/commit');
  expect(calls).toContain('PATCH /api/v1/albums/11111111-1111-4111-8111-111111111111/design');
});

test('@cross-browser H53 LIVE is a preview and cannot be submitted by the current API flow', async ({ page }) => {
  await installUatApi(page);
  await page.goto(`/album/${uatIds.album}/jadwal-ulang`);
  const preview = page.getByRole('checkbox', { name: /during the event|mulai saat acara/i });
  await expect(preview).toBeVisible();
  await preview.check();
  await expect(page.getByText(/LIVE preview only|pratinjau LIVE saja/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /review change|review schedule|tinjau perubahan|tinjau jadwal/i })).toBeDisabled();
});

test('@cross-browser H41 status badges follow only the server capture state', async ({ page }) => {
  await installUatApi(page);
  const phases = [
    { scenario: 'scheduled', status: 'Terjadwal', timer: 'Menuju acara dimulai: 60 m 00 dtk', start: /Acara dimulai:/ },
    { scenario: 'live', status: 'Sedang berlangsung', timer: 'Sisa waktu pengambilan: 540 m 00 dtk' },
    { scenario: 'ended', status: 'Selesai' },
  ] as const;
  for (const phase of phases) {
    const { scenario, status } = phase;
    await page.goto(`/album/${uatIds.album}?uat=${scenario}`);
    await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
    if ('timer' in phase) await expect(page.getByRole('timer')).toHaveText(phase.timer);
    else await expect(page.getByRole('timer')).toHaveCount(0);
    if ('start' in phase) await expect(page.getByText(phase.start)).toBeVisible();
  }
});

test('@cross-browser FE-UAT-05 visual evidence covers H41, H64, and H68 in Light and Dark', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await installUatApi(page);
  // Consent replaces the fragment and query from the URL, so keep H68's authoritative synthetic state stable.
  await page.route(`**/api/v1/albums/${uatIds.album}/capture-readiness`, (route) => route.fulfill({
    status: 200,
    json: { data: { album_id: uatIds.album, state: 'WAITING', can_capture: false, server_time: uatNow, capture_start: uatCaptureStart, capture_end: uatCaptureEnd, reveal_at: '2026-10-04T17:00:00Z', reveal_state: 'HIDDEN', album_remaining_count: 76, guest_remaining_count: 10 } },
  }));
  const openWaitingRoom = async (locale: 'id' | 'en') => {
    await page.context().addCookies([{ name: 'kepotret-locale', value: locale, domain: 'localhost', path: '/' }]);
    await page.goto(`/j/uat-event-waiting-${locale}?uat=waiting#synthetic-owner-uat-secret`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const invitationBadge = page.getByText(/undangan acara|event invitation/i);
    await expect(invitationBadge).toBeVisible();
    const welcomeBadgeBox = await invitationBadge.boundingBox();
    const welcomeCardBox = await page.locator('main section').boundingBox();
    expect(welcomeBadgeBox).not.toBeNull();
    expect(welcomeCardBox).not.toBeNull();
    expect(Math.abs((welcomeBadgeBox!.x + welcomeBadgeBox!.width / 2) - (welcomeCardBox!.x + welcomeCardBox!.width / 2))).toBeLessThan(2);
    await page.getByRole('button', { name: /lanjut|continue/i }).click();
    await page.getByLabel(/nama tampilan|display name/i).fill('Tamu UAT');
    await page.getByRole('button', { name: /lanjut|continue/i }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /setuju & lanjutkan|agree & continue/i }).click();
    const eventBadge = page.getByText(locale === 'id' ? 'Acara' : 'Event', { exact: true });
    const eventBadgeBox = await eventBadge.boundingBox();
    const waitingCardBox = await page.locator('main section').boundingBox();
    expect(eventBadgeBox).not.toBeNull();
    expect(waitingCardBox).not.toBeNull();
    expect(Math.abs((eventBadgeBox!.x + eventBadgeBox!.width / 2) - (waitingCardBox!.x + waitingCardBox!.width / 2))).toBeLessThan(2);
    await expect(page.getByRole('button', { name: /buka kamera|open camera/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /buka kamera|open camera/i })).toBeDisabled();
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/album/${uatIds.album}?uat=live`);
  await expect(page.getByText(/sedang berlangsung|live/i).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('h41-light.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: testInfo.outputPath('h41-dark.png'), fullPage: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('h41-1024.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/j/uat-event?uat=normal#synthetic-owner-uat-secret', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(uatEventName).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('h64-light.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: testInfo.outputPath('h64-dark.png'), fullPage: true });

  await openWaitingRoom('id');
  await page.screenshot({ path: testInfo.outputPath('h68-light.png'), fullPage: true });

  const visualRoutes = [
    ['h42', `/album/${uatIds.album}/galeri`],
    ['h43', `/album/${uatIds.album}/galeri/${uatIds.photo}`],
    ['h51', `/album/${uatIds.album}/ekspor/${uatIds.export}?uat=queued`],
    ['h53', `/album/${uatIds.album}/jadwal-ulang`],
    ['h54', `/album/${uatIds.album}/retensi`],
    ['h55', `/album/${uatIds.album}/pemulihan?uat=recovery-active`],
    ['h59', `/album/${uatIds.album}/preview-tamu`],
  ] as const;
  for (const [id, route] of visualRoutes) {
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${id}-desktop.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/j/uat-event?uat=normal#synthetic-owner-uat-secret', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(uatEventName).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('h64-mobile-390.png'), fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await openWaitingRoom('en');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('h68-mobile-360.png'), fullPage: true });
});
