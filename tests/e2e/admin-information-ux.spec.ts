import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { uatIds } from '../uat/constants';
import { makeTransaction, uatPackages } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

const albumId = uatIds.album;
const routes = [
  ['h77', '/admin'], ['h78', '/admin/users'], ['h79', `/admin/users/${uatIds.user}`],
  ['h80', '/admin/albums'], ['h81', `/admin/albums/${albumId}`],
  ['h82', '/admin/payments'], ['h83', `/admin/payments/${uatIds.transaction}`],
  ['h84', '/admin/catalog'], ['h85', `/admin/catalog/packages/${uatIds.package}/versions/new`],
] as const;

async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test.beforeEach(async ({ page }) => { await installUatApi(page); });

test('H77 payment tiles and Admin shell branding respond to theme and width', async ({ page }) => {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin');
  const panel = page.getByRole('heading', { name: /Other payment states|Pembayaran selain berhasil/i }).locator('..');
  const tiles = panel.locator('div.grid > div');
  await expect(tiles).toHaveCount(3);
  await expect(tiles).toContainText(['Pending', 'Processing', 'Failed']);
  const boxes = await Promise.all([0, 1, 2].map(async (index) => tiles.nth(index).boundingBox()));
  expect(boxes.every((box) => box && Math.abs(box.y - boxes[0]!.y) < 2)).toBe(true);
  await expect(page.locator('aside').first().locator('img[src="/brand/logo.svg"]')).toBeVisible();
  await expect(page.locator('aside').first().locator('img[src="/brand/logo_white.svg"]')).toBeHidden();

  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('aside').first().locator('img[src="/brand/logo_white.svg"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tiles).toHaveCount(3);
  const mobile = await Promise.all([0, 1, 2].map(async (index) => tiles.nth(index).boundingBox()));
  expect(mobile[0]!.y).toBeLessThan(mobile[1]!.y);
  expect(mobile[1]!.y).toBeLessThan(mobile[2]!.y);
  await page.getByRole('button', { name: /Open navigation|Buka navigasi/i }).click();
  await expect(page.locator('aside').last().locator('img[src="/brand/logo_white.svg"]')).toBeVisible();
  await noPageOverflow(page);
});

test('H79, H81 and H83 explain diagnostics without broadening Admin actions', async ({ page }) => {
  await page.goto(`/admin/users/${uatIds.user}`);
  await expect(page.getByRole('heading', { name: /What these account details mean|Arti informasi akun ini/i })).toBeVisible();
  await expect(page.getByText(/does not delete or transfer|tidak menghapus atau memindahkan/i)).toBeVisible();
  const suspend = page.getByRole('button', { name: /Suspend account|Tangguhkan akun/i });
  await suspend.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /Cancel|Batal/i }).click();

  await page.goto(`/admin/albums/${albumId}`);
  await expect(page.getByRole('heading', { name: /About these diagnostics|Tentang diagnostik ini/i })).toBeVisible();
  const readiness = page.locator('dt').filter({ hasText: /Readiness|Kesiapan/i }).first();
  await expect(readiness).toHaveClass(/text-xs/);
  await expect(readiness).toHaveClass(/muted-foreground/);
  await expect(page.getByText(/require their own authorization and MFA|pemeriksaan otorisasi dan MFA masing-masing/i)).toBeVisible();

  await page.goto(`/admin/payments/${uatIds.transaction}`);
  await expect(page.getByRole('heading', { name: /About this transaction|Tentang transaksi ini/i })).toBeVisible();
  await expect(page.locator('dt').first()).toHaveClass(/text-xs/);
  await expect(page.getByText(/does not manually mark success|tidak menandai berhasil secara manual/i)).toBeVisible();
  await page.getByRole('button', { name: /Re-check with Provider|Periksa ulang ke provider/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('H80 album search uses the server query and resets to the first page', async ({ page }) => {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  const requests: URL[] = [];
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/v1/admin/albums') requests.push(new URL(request.url())); });
  await page.goto('/admin/albums');
  const search = page.getByRole('searchbox', { name: /Album search query|Kata kunci album/i });
  await search.fill('Wedding');
  await page.getByRole('button', { name: /^Search$|^Cari$/i }).click();
  await expect(page.getByText(/Wedding Demo/).first()).toBeVisible();
  expect(requests.at(-1)?.searchParams.get('query')).toBe('Wedding');
  expect(requests.at(-1)?.searchParams.has('cursor')).toBe(false);

  await search.fill('no-match');
  await page.getByRole('button', { name: /^Search$|^Cari$/i }).click();
  await expect(page.getByText(/No albums to display|Belum ada album/i)).toBeVisible();
  await page.getByRole('button', { name: /^Clear$|^Hapus$/i }).click();
  await expect(page.getByText(/Wedding Demo/).first()).toBeVisible();
  expect(requests.at(-1)?.searchParams.has('query')).toBe(false);
  expect(await page.getByRole('button', { name: /sort|urutkan/i }).count()).toBe(0);
});

test('H80 reports denied and offline states without showing stale album data', async ({ page }) => {
  await page.route('**/api/v1/admin/albums?*', (route) => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } }));
  await page.goto('/admin/albums');
  await expect(page.getByText(/Admin access is not available|Akses Admin tidak tersedia/i)).toBeVisible();
  await expect(page.getByText(/Wedding Demo/)).toHaveCount(0);
  await page.context().setOffline(true);
  await expect(page.getByText(/You are offline|sedang offline/i)).toBeVisible();
});

test('H82 shows payment timestamps accurately and preserves cursor pagination', async ({ page }) => {
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  const seen: string[] = [];
  await page.route('**/api/v1/admin/payments?*', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    seen.push(cursor ?? 'first');
    const payment = { ...makeTransaction('pending'), transaction_id: cursor ? '33333333-3333-4333-8333-000000000002' : uatIds.transaction };
    await route.fulfill({ status: 200, json: { data: [payment], meta: { has_more: !cursor, next_cursor: cursor ? null : 'next-page' } } });
  });
  await page.goto('/admin/payments');
  await expect(page.getByText(/Payment created|Pembayaran dibuat/i)).toBeVisible();
  await expect(page.getByText(/Payment dates are not event dates|Tanggal pembayaran bukan jadwal acara/i)).toBeVisible();
  expect(await page.getByRole('searchbox').count()).toBe(0);
  await page.getByRole('button', { name: /Load next page|Muat halaman berikutnya/i }).click();
  await expect(page.getByText('33333333-3333-4333-8333-000000000002')).toBeVisible();
  expect(seen.at(-1)).toBe('next-page');
  expect(seen.slice(0, -1).every((cursor) => cursor === 'first')).toBe(true);
});

test('H84 catalog keeps six packages in two columns, hides codes, and confirms sale IDs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/catalog');
  const cards = page.getByRole('heading', { name: /Paket .* Foto/ });
  await expect(cards).toHaveCount(6);
  await expect(page.locator('main')).not.toContainText('LOCKED100');
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  const third = await cards.nth(2).boundingBox();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  expect(first!.x).toBeLessThan(second!.x);
  expect(third!.x).toBe(first!.x);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFirst = await cards.nth(0).boundingBox();
  const mobileSecond = await cards.nth(1).boundingBox();
  expect(mobileFirst!.y).toBeLessThan(mobileSecond!.y);
  expect(mobileFirst!.x).toBe(mobileSecond!.x);
  await noPageOverflow(page);

  const changes: Array<{ url: string; body: unknown; csrf: string }> = [];
  await page.route('**/api/v1/admin/package-versions/*/sale-status', async (route) => {
    changes.push({ url: route.request().url(), body: route.request().postDataJSON(), csrf: route.request().headers()['x-csrf-token'] ?? '' });
    await route.fulfill({ status: 200, json: { data: { sale_enabled: false } } });
  });
  await page.getByRole('button', { name: /Retire|Pensiunkan|Nonaktifkan/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /Confirm|Konfirmasi/i }).click();
  await expect.poll(() => changes.length).toBe(1);
  expect(changes[0]!.url).toContain(uatPackages[0]!.package_version_id);
  expect(changes[0]!.body).toEqual({ sale_enabled: false });
  expect(changes[0]!.csrf).toBe('owner-uat-csrf');
});

test('H84 catalog supports odd counts and historical versions without exposing package codes', async ({ page }) => {
  const packages = uatPackages.slice(0, 5).map((option, index) => ({
    package_id: option.package_id, code: option.code, name: option.name,
    versions: [
      { package_version_id: option.package_version_id, price_amount: option.price_amount, currency: option.currency, quota_total: option.quota_total, sale_enabled: true, effective_at: '2026-10-01T00:00:00Z', retired_at: null },
      ...(index === 0 ? [{ package_version_id: 'eeeeeeee-eeee-4eee-8eee-000000000099', price_amount: 90000, currency: option.currency, quota_total: 90, sale_enabled: false, effective_at: '2026-09-01T00:00:00Z', retired_at: '2026-10-01T00:00:00Z' }] : []),
    ],
  }));
  await page.route('**/api/v1/admin/packages?*', (route) => route.fulfill({ status: 200, json: { data: packages, meta: { has_more: false, next_cursor: null } } }));
  await page.goto('/admin/catalog');
  await expect(page.getByRole('heading', { name: /Paket .* Foto/ })).toHaveCount(5);
  await expect(page.getByText(/Tidak dijual|Not for sale/i)).toBeVisible();
  await expect(page.locator('main')).not.toContainText('LOCKED100');
  await expect(page.getByText('eeeeeeee-eeee-4eee-8eee-000000000099')).toBeVisible();
});

test('H77–H85 remain responsive at supported widths and H85 keeps its original form', async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [, route] of routes) {
      await page.goto(route);
      await expect(page.locator('main h1').first()).toBeVisible();
      await noPageOverflow(page);
    }
  }
  await page.goto(routes[8][1]);
  await expect(page.getByRole('spinbutton', { name: /Price|Harga/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /quota|kuota/i })).toBeVisible();
});

test('synthetic Owner evidence for H77–H85', async ({ page }) => {
  test.skip(process.env.UAT_CAPTURE_EVIDENCE !== '1', 'Evidence is generated only when explicitly requested.');
  test.setTimeout(180_000);
  const directory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-02/evidence');
  mkdirSync(directory, { recursive: true });
  for (const [id, route] of routes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await page.screenshot({ path: resolve(directory, `${id}-desktop-1440-id-light.png`), fullPage: true, animations: 'disabled' });
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  for (const [id, route] of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await page.screenshot({ path: resolve(directory, `${id}-mobile-390-en-dark.png`), fullPage: true, animations: 'disabled' });
  }
});
