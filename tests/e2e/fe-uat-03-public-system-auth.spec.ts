import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
}

async function captureEvidence(page: import('@playwright/test').Page, filename: string) {
  if (test.info().project.name !== 'chromium') return;
  const directory = test.info().outputPath('FE-UAT-03-evidence');
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/${filename}`, fullPage: true });
}

async function expectAssistantComposerFits(page: import('@playwright/test').Page) {
  const launcher = page.getByRole('button', { name: 'Buka Asisten AI' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'Asisten Kepotret' });
  const input = page.getByRole('textbox', { name: 'Pesan untuk Asisten' });
  const send = page.getByRole('button', { name: 'Kirim pertanyaan' });
  await expect(dialog).toBeVisible();
  await input.fill('Pertanyaan uji');
  const [inputBox, sendBox, dialogBox] = await Promise.all([input.boundingBox(), send.boundingBox(), dialog.boundingBox()]);
  expect(inputBox).not.toBeNull();
  expect(sendBox).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(sendBox!.x);
  expect(dialogBox!.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  expect(dialogBox!.height).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test('H02-H05 and H08 public pages keep the Host/Guest guide, pricing, FAQ, contacts and responsive layouts', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cara-kerja');
  await expect(page.getByRole('heading', { name: /Untuk Host/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Untuk peserta/ })).toBeVisible();
  await expect(page.getByText(/Peserta tidak perlu install aplikasi atau membuat akun/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pertanyaan sebelum acara dimulai' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buat Album Gratis' }).first()).toHaveAttribute('href', '/masuk');
  await expect(page.locator('main [data-guide-visual][role="img"][aria-label]')).toHaveCount(7);
  for (const width of [360, 390, 768, 1024, 1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await captureEvidence(page, 'h02-host-guest-guide-id-light.png');

  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
  await expect(page.getByRole('heading', { name: /For Hosts/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /For participants/ })).toBeVisible();
  await page.getByRole('button', { name: 'Language: ENG' }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();

  await page.goto('/harga');
  await expect(page.getByText('Mulai gratis dengan 30 foto. Geser kapasitas dan pilih jumlah foto yang paling cocok untuk acaramu. Jumlah peserta tetap tidak dibatasi paket!')).toBeVisible();
  const priceSlider = page.getByRole('slider');
  await priceSlider.focus();
  await priceSlider.press('End');
  await expect(priceSlider).toHaveAttribute('aria-valuetext', '10.000 foto, Rp1.100.000');
  await expect(page.getByRole('link', { name: /Pilih 10K Foto/ })).toHaveAttribute('href', '/masuk');
  for (const width of [360, 390, 768, 1024, 1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }

  await page.goto('/faq');
  const liveQuestion = page.getByRole('button', { name: 'Kapan foto bisa dilihat peserta?' });
  const accountQuestion = page.getByRole('button', { name: 'Apakah peserta harus membuat akun?' });
  await liveQuestion.click();
  await expect(liveQuestion).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(/LIVE, D\+3, D\+5, atau D\+7/)).toBeVisible();
  await accountQuestion.click();
  await expect(liveQuestion).toHaveAttribute('aria-expanded', 'false');
  await expect(accountQuestion).toHaveAttribute('aria-expanded', 'true');
  const openPanel = await accountQuestion.getAttribute('aria-controls');
  await expect(page.locator(`#${openPanel}`)).toHaveCSS('opacity', '1');
  await captureEvidence(page, 'h04-faq-exclusive-open-id-light.png');

  await page.goto('/bantuan');
  await expect(page.getByRole('link', { name: 'kepotret123@gmail.com' })).toHaveAttribute('href', 'mailto:kepotret123@gmail.com');
  await expect(page.getByRole('link', { name: '+62 8138 7788 811' })).toHaveAttribute('href', 'https://wa.me/6281377888111');
  await expect(page.getByRole('link', { name: 'kepotret.official' }).first()).toHaveAttribute('href', 'https://www.tiktok.com/@kepotret.official');
  await expect(page.getByText(/asisten AI Kepotret/)).toBeVisible();

  await page.goto('/keamanan');
  await expect(page.locator('main ul li')).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  for (const width of [360, 390, 768, 1024, 1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expectNoHorizontalOverflow(page);
  await context.clearCookies();
});

test('H09-H13 system pages center their states and keep actions separated at narrow widths', async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/nonexistent-fe-uat-03-page');
    await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kembali ke Beranda/ })).toHaveClass(/rounded-full/);
    await expectNoHorizontalOverflow(page);
    if (width === 360) await expectAssistantComposerFits(page);

    await page.goto('/akses-ditolak');
    await expect(page.getByRole('heading', { name: 'Akses tidak tersedia' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kembali ke Beranda/ })).toHaveClass(/rounded-full/);
    await expectNoHorizontalOverflow(page);
    if (width === 360) await expectAssistantComposerFits(page);

    await page.goto('/maintenance');
    await expect(page.getByRole('heading', { name: 'Layanan sedang dalam pemeliharaan' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kembali ke Beranda/ })).toHaveClass(/rounded-full/);
    await expectNoHorizontalOverflow(page);
    if (width === 360) await expectAssistantComposerFits(page);

    await page.goto('/kompatibilitas');
    await expect(page.getByRole('heading', { name: 'Buka Kepotret melalui browser' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Buka Pusat Bantuan' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kembali ke Beranda/ })).toBeVisible();
    const helpBox = await page.getByRole('link', { name: 'Buka Pusat Bantuan' }).boundingBox();
    const homeBox = await page.getByRole('link', { name: /Kembali ke Beranda/ }).boundingBox();
    expect(helpBox).not.toBeNull();
    expect(homeBox).not.toBeNull();
    const separated = helpBox!.x + helpBox!.width <= homeBox!.x || homeBox!.x + homeBox!.width <= helpBox!.x || helpBox!.y + helpBox!.height <= homeBox!.y || homeBox!.y + homeBox!.height <= helpBox!.y;
    expect(separated).toBe(true);
    await expect(page.getByText(/pemilih berkas bukan alternatif/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (width === 360) await expectAssistantComposerFits(page);
    if (width === 390) await captureEvidence(page, 'h13-compatibility-mobile-id-light.png');
  }
});

test('H17-H23 invitation, account and admin identity states remain localized, theme aware and secure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/undangan/kolaborator/tidak-valid?state=expired');
  await expect(page.getByRole('button', { name: 'Bahasa: ID' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Undangan kedaluwarsa' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Masuk ke Kepotret/ })).toHaveClass(/rounded-full/);
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
  await expect(page.getByRole('heading', { name: 'Invitation expired' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Language: ENG' })).toBeVisible();
  await page.getByRole('button', { name: 'Language: ENG' }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();

  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: 200, json: { data: { user_id: '22222222-2222-4222-8222-222222222222', email: 'owner@example.test', display_name: 'Album Owner' } } }));
  let logoutCsrf = 0;
  let logoutCalls = 0;
  await page.route('**/api/v1/security/csrf', (route) => { logoutCsrf += 1; return route.fulfill({ status: 200, json: { data: { csrf_token: 'account-csrf' } } }); });
  await page.route('**/api/v1/auth/logout', (route) => { logoutCalls += 1; expect(route.request().headers()['x-csrf-token']).toBe('account-csrf'); return route.fulfill({ status: 200, json: { data: {} } }); });
  await page.goto('/akun');
  await expect(page.getByText('owner@example.test')).toBeVisible();
  await expect(page.getByText('Album Owner')).toBeVisible();
  await expect(page.getByText(/verified|terverifikasi/i)).toHaveCount(0);
  const logout = page.getByRole('button', { name: 'Keluar' });
  await expect(logout).toHaveCSS('background-color', 'rgb(252, 108, 133)');
  await logout.click();
  await expect(page).toHaveURL('/');
  expect(logoutCsrf).toBe(1);
  expect(logoutCalls).toBe(1);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  await page.goto('/admin/masuk');
  await expect(page.getByRole('button', { name: 'Bahasa: ID' })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('a[aria-label="Kepotret"] img[src="/brand/logo_white.svg"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan ke verifikasi MFA/ })).toHaveClass(/rounded-full/);
  await captureEvidence(page, 'h20-admin-login-dark.png');
  await page.goto('/admin/mfa');
  await expect(page.locator('a[aria-label="Kepotret"] img[src="/brand/logo_white.svg"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Verifikasi dan masuk/ })).toHaveClass(/rounded-full/);
  await page.goto('/admin/akses-ditolak');
  await expect(page.locator('a[aria-label="Kepotret"] img[src="/brand/logo_white.svg"]')).toBeVisible();
  await expect(page.getByRole('link', { name: /Kembali ke masuk admin/i })).toHaveClass(/rounded-full/);
});
