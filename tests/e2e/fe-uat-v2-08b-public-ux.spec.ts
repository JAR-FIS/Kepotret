import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { uatCategories, uatPackages, uatSchedule } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

const album = `/album/${uatIds.album}`;
const evidenceDirectory = resolve(process.cwd(), 'docs/reviews/FE-UAT-V2-08-B/evidence');

async function capture(page: Page, name: string) {
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.evaluate(() => {
    if (document.getElementById('v2-08b-synthetic-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'v2-08b-synthetic-badge';
    badge.textContent = 'OWNER VISUAL UAT · SYNTHETIC FIXTURES';
    badge.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;padding:6px 10px;border-radius:6px;background:#111;color:#fff;font:700 11px Arial,sans-serif;pointer-events:none';
    document.body.append(badge);
  });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true, animations: 'disabled' });
}

test('H14/H15/H16/H23 share the outer auth header and retain retry routing', async ({ page }) => {
  for (const route of ['/masuk', '/auth/google/memproses', '/masuk/gagal', '/masuk-ulang']) {
    await page.goto(route);
    const header = page.locator('main > div > header');
    const card = page.locator('main > div > section');
    await expect(header.getByRole('link', { name: 'Kepotret' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Bahasa: ID' })).toBeVisible();
    await expect(header.getByRole('button', { name: /tema/i })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Bahasa: ID' })).toHaveCount(0);
    const headerBounds = await header.boundingBox();
    const cardBounds = await card.boundingBox();
    expect(headerBounds).not.toBeNull();
    expect(cardBounds).not.toBeNull();
    expect(headerBounds!.y + headerBounds!.height).toBeLessThan(cardBounds!.y);
  }
  await page.goto('/masuk/gagal');
  await page.getByRole('link', { name: /Coba lagi/i }).click();
  await expect(page).toHaveURL('/masuk');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('option', { name: 'Bahasa Inggris' }).click();
  await expect(page.getByRole('button', { name: 'Language: ENG' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.route('**/api/v1/auth/google/start*', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE' } } }));
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  await expect(page).toHaveURL('/masuk/gagal');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('H29/H53 expose four accessible reveal chips and keep server eligibility', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  await page.goto(`${album}/setup/jadwal`);
  const setupGroup = page.getByRole('group', { name: 'Jeda reveal' });
  await expect(setupGroup.getByRole('radio')).toHaveCount(4);
  await expect(setupGroup).not.toContainText('LIVE');
  await expect(setupGroup.getByRole('radio', { name: 'D+3' })).toBeChecked();
  await setupGroup.getByRole('radio', { name: 'D+3' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(setupGroup.getByRole('radio', { name: 'D+5' })).toBeChecked();
  await setupGroup.getByRole('radio', { name: 'D+7' }).locator('..').click();
  await expect(setupGroup.getByRole('radio', { name: 'D+7' })).toBeChecked();

  await page.goto(`${album}/jadwal-ulang`);
  const rescheduleGroup = page.getByRole('group', { name: 'Jeda publikasi (hari)' });
  await expect(rescheduleGroup.getByRole('radio')).toHaveCount(4);
  await expect(rescheduleGroup).not.toContainText('LIVE');
  await rescheduleGroup.getByRole('radio', { name: 'D+5' }).locator('..').click();
  await expect(rescheduleGroup.getByRole('radio', { name: 'D+5' })).toBeChecked();
  await expect(page.getByRole('region', { name: 'Tinjauan perubahan' })).toContainText('D+5');

  await page.route(`**/api/v1/albums/${uatIds.album}/schedule`, (route) => route.fulfill({ status: 200, json: { data: { ...uatSchedule, can_reschedule: false } } }));
  await page.reload();
  await expect(page.getByRole('group', { name: 'Jeda publikasi (hari)' }).getByRole('radio', { name: 'D+3' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tinjau jadwal' })).toBeDisabled();
});

test('H33/H35 show API prices, keep free choice, and handle missing catalog', async ({ page }) => {
  await installUatApi(page);
  await page.goto(`${album}/setup/paket`);
  const paid = page.getByRole('radio', { name: /Paket 100 Foto/ }).locator('..');
  await expect(paid.locator('span.mt-1')).toContainText(/Rp\s?100\.000/);
  await expect(paid.locator('span.mt-1')).not.toContainText(/foto/i);
  const free = page.getByRole('radio', { name: /Paket Gratis/ });
  await free.locator('..').click();
  await expect(free).toBeChecked();

  await page.goto(`${album}/setup/review`);
  const paidSummary = page.getByText('Paket draft').locator('..').locator('dd');
  await expect(paidSummary).toContainText(/Paket 100 Foto.*Rp\s?100\.000/);

  await page.route('**/api/v1/packages', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE' } } }));
  await page.reload();
  await expect(page.getByText('Paket berbayar (detail paket tidak tersedia)')).toBeVisible();

  await page.unroute('**/api/v1/packages');
  await page.route(`**/api/v1/albums/${uatIds.album}/review`, (route) => route.fulfill({ status: 200, json: { data: {
    album_id: uatIds.album, setup_revision: 3, complete: false, issues: [],
    snapshot: { event_basics: { event_name: 'Synthetic event', event_location: 'Jakarta', event_category_id: uatCategories[0]!.category_id, timezone: 'Asia/Jakarta' }, schedule: uatSchedule, access: { pin_enabled: false }, settings: { per_guest_limit: 30 }, design: { cover_asset_id: null, cover_preview: null, setup_revision: 3 }, selected_package_version_id: null, collaborator_count: 1 },
  } } }));
  await page.reload();
  await expect(page.getByText('Paket draft').locator('..').locator('dd')).toContainText('Paket Gratis');
  expect(uatPackages[0]!.price_amount).toBe(100000);
});

test('H79 branded status filter preserves query values and clears the cursor on apply', async ({ page }) => {
  await installUatApi(page);
  const seen: URL[] = [];
  await page.route('**/api/v1/admin/users?*', (route) => {
    seen.push(new URL(route.request().url()));
    return route.fulfill({ status: 200, json: { data: [{ user_id: uatIds.user, email: 'owner@kepotret.test', display_name: 'Pemilik UAT', suspended: false, created_at: '2026-09-01T08:00:00Z', owned_album_count: 1, collaborator_album_count: 1, active_session_count: 1 }], meta: { has_more: true, next_cursor: 'synthetic-next' } } });
  });
  await page.goto('/admin/users');
  const status = page.getByRole('combobox', { name: 'Status akun' });
  await expect(status).toBeVisible();
  await status.focus();
  await page.keyboard.press('ArrowDown');
  await expect(status).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(status).toHaveText('Semua');
  await status.click();
  await page.getByRole('option', { name: 'Aktif', exact: true }).click();
  await page.getByRole('button', { name: 'Terapkan filter' }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get('suspended')).toBe('false');
  await page.getByRole('button', { name: 'Muat halaman berikutnya' }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get('cursor')).toBe('synthetic-next');
  await status.click();
  await page.getByRole('option', { name: 'Ditangguhkan' }).click();
  await page.getByRole('button', { name: 'Terapkan filter' }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get('suspended')).toBe('true');
  expect(seen.at(-1)?.searchParams.has('cursor')).toBe(false);
  await status.click();
  await page.getByRole('option', { name: 'Semua' }).click();
  await page.getByRole('button', { name: 'Terapkan filter' }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.has('suspended')).toBe(false);
});

test('footer and public pages preserve visible content with normal and reduced motion', async ({ page, browser }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const route of ['/', '/cara-kerja', '/harga', '/faq', '/bantuan', '/keamanan', '/kebijakan-privasi', '/syarat-ketentuan', '/help', '/help/guest']) {
    await page.goto(route);
    const animated = route === '/' ? page.locator('.public-page-enter') : page.locator('main').first();
    await expect(animated).toBeVisible();
    await expect(animated).toHaveCSS('animation-name', 'h01-reveal');
    await expect(animated).toHaveCSS('animation-duration', '0.3s');
    await expect(page.locator('h1').first()).toBeVisible();
  }
  await page.goto('/bantuan');
  const helpFooter = page.locator('footer').getByRole('heading', { name: 'Bantuan' }).locator('..');
  await expect(helpFooter.getByRole('link', { name: 'Pusat Bantuan' })).toHaveAttribute('href', '/bantuan');
  await expect(helpFooter.getByRole('link', { name: 'Panduan' })).toHaveAttribute('href', '/help');
  await expect(helpFooter.getByRole('link', { name: 'Keamanan' })).toHaveAttribute('href', '/keamanan');
  await expect(helpFooter.getByText('Hubungi Kami')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '+62 8138 7788 811' })).toHaveAttribute('href', 'https://wa.me/6281377888111');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/faq');
  await expect(page.locator('main')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('h1')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ['/', '/faq', '/help']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
  const noScript = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://localhost:3000' });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto('/faq');
    await expect(staticPage.getByRole('heading', { level: 1 })).toBeVisible();
  } finally { await noScript.close(); }
});

test('synthetic V2-08B desktop and mobile evidence', async ({ page }) => {
  test.skip(process.env.UAT_CAPTURE_EVIDENCE !== '1', 'Evidence capture runs locally with synthetic fixtures.');
  await installUatApi(page);
  const routes = [
    ['h14-auth', '/masuk', 'h1'],
    ['h29-schedule', `${album}/setup/jadwal`, 'fieldset'],
    ['h33-packages', `${album}/setup/paket`, 'form'],
    ['h35-review', `${album}/setup/review`, 'dl'],
    ['h79-users', '/admin/users', 'main a[href*="/admin/users/"]:visible'],
    ['h84-catalog', '/admin/catalog', 'a[href*="/versions/new"]'],
    ['footer-help', '/bantuan', 'footer'],
    ['h01-home', '/', '.public-page-enter'],
    ['h04-faq', '/faq', '.public-page-enter'],
  ] as const;
  for (const variant of [{ width: 1440, height: 900, locale: 'id', theme: 'light', suffix: 'desktop-1440-id-light' }, { width: 390, height: 844, locale: 'en', theme: 'dark', suffix: 'mobile-390-en-dark' }] as const) {
    await page.setViewportSize({ width: variant.width, height: variant.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: variant.locale, domain: 'localhost', path: '/' }]);
    await page.goto('/');
    await page.evaluate((theme) => localStorage.setItem('kepotret-theme', theme), variant.theme);
    for (const [name, route, ready] of routes) {
      await page.goto(route);
      await expect(page.locator(ready).first()).toBeVisible();
      await capture(page, `${name}-${variant.suffix}`);
    }
  }
});
