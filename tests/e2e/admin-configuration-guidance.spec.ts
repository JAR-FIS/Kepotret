import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

const versionRoute = `/admin/catalog/packages/${uatIds.package}/versions/new`;
const issueRoute = `/admin/issues/${uatIds.issue}`;
const routes = [
  ['h85', versionRoute], ['h86', '/admin/config'], ['h87', '/admin/issues'],
  ['h88', issueRoute], ['h90', '/admin/admins'], ['help-admin', '/help/admin'],
  ['help-host', '/help/host'], ['help-collaborator', '/help/collaborator'],
] as const;

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test.beforeEach(async ({ page }) => { await installUatApi(page); });
test.describe.configure({ mode: 'serial' });

test('H85 groups IDR, validates the contract, reviews unusual terms, and confirms the integer payload', async ({ page }) => {
  const requests: Array<{ body: unknown; csrf: string; key: string }> = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/packages/${uatIds.package}/versions`)) {
      requests.push({ body: request.postDataJSON(), csrf: request.headers()['x-csrf-token'] ?? '', key: request.headers()['idempotency-key'] ?? '' });
    }
  });
  await page.goto(versionRoute);
  const price = page.getByLabel(/Harga \(IDR\)|Price \(IDR\)/i);
  const quota = page.getByLabel(/Kuota total|Total quota/i);
  const review = page.getByRole('button', { name: /Tinjau sebelum membuat|Review before creating/i });
  await price.fill('450000');
  await expect(price).toHaveValue('450.000');
  await quota.fill('25');
  await expect(page.getByText(/450.000 untuk 25 foto/i)).toBeVisible();
  await expect(review).toBeEnabled();

  await price.press('End');
  await price.press('Backspace');
  await expect(price).toHaveValue('45.000');
  await price.press('End');
  await price.press('0');
  await expect(price).toHaveValue('450.000');
  await price.fill('Rp 450.000');
  await expect(price).toHaveValue('450.000');
  await price.fill('12.5');
  await expect(page.getByRole('alert').filter({ hasText: /jumlah Rupiah bulat/i })).toBeVisible();
  await expect(review).toBeDisabled();
  await price.fill('450000');
  await quota.fill('0');
  await expect(review).toBeDisabled();
  await quota.fill('25');
  await review.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(uatIds.package);
  await expect(dialog).toContainText('450.000');
  await dialog.getByRole('button', { name: 'Batal' }).click();
  expect(requests).toHaveLength(0);
  await review.click();
  await dialog.getByRole('button', { name: /Buat versi immutable/i }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].body).toEqual({ price_amount: 450000, currency: 'IDR', quota_total: 25 });
  expect(requests[0].csrf).toBe('owner-uat-csrf');
  expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.getByText(uatIds.createdPackageVersion)).toBeVisible();
  await expect(page.getByText(/Status penjualan: Tidak dijual/i)).toBeVisible();
});

test('H85 keeps a draft through EN/Dark preference changes and warns without blocking zero price', async ({ page }) => {
  await page.goto(versionRoute);
  await page.getByLabel('Harga (IDR)').fill('75000');
  await page.getByLabel('Kuota total').fill('100');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('listbox', { name: 'Bahasa' }).getByRole('option', { name: 'English' }).click();
  await expect(page.getByLabel('Price (IDR)')).toHaveValue('75,000');
  await expect(page.getByLabel('Total quota')).toHaveValue('100');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByLabel('Price (IDR)')).toHaveValue('75,000');
  await page.getByLabel('Price (IDR)').fill('0');
  await expect(page.getByText(/An IDR 0 price can be created/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review before creating' })).toBeEnabled();
  await noOverflow(page);
});

test('H85 reports 409, 422, 403, and 429 without losing safe retry semantics', async ({ page }) => {
  const statuses = [409, 422, 403, 429];
  const keys: string[] = [];
  await page.route(`**/api/v1/admin/packages/${uatIds.package}/versions`, async (route) => {
    keys.push(route.request().headers()['idempotency-key'] ?? '');
    await route.fulfill({ status: statuses[keys.length - 1], json: { error: { code: 'SYNTHETIC_REJECTION' } } });
  });
  await page.goto(versionRoute);
  await page.getByLabel('Harga (IDR)').fill('450000');
  await page.getByLabel('Kuota total').fill('25');
  for (const status of statuses) {
    await page.getByRole('button', { name: 'Tinjau sebelum membuat' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Buat versi immutable' }).click();
    await expect.poll(() => keys.length).toBe(statuses.indexOf(status) + 1);
    await expect(page.getByRole('alert').filter({ hasText: status === 409 ? /Konflik versi/ : new RegExp(`HTTP ${status}`) })).toBeVisible();
  }
  expect(keys[0]).toBe(keys[1]);
  expect(keys[2]).not.toBe(keys[1]);
  expect(keys[2]).toBe(keys[3]);
});

test('H85 blocks a second submit while the server request is pending', async ({ page }) => {
  let posts = 0;
  let finish: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  await page.route(`**/api/v1/admin/packages/${uatIds.package}/versions`, async (route) => {
    posts += 1;
    await pending;
    await route.fulfill({ status: 503, json: { error: { code: 'SYNTHETIC_DELAY' } } });
  });
  await page.goto(versionRoute);
  await page.getByLabel('Harga (IDR)').fill('450000');
  await page.getByLabel('Kuota total').fill('25');
  await page.getByRole('button', { name: 'Tinjau sebelum membuat' }).click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Buat versi immutable' });
  try {
    await confirm.click();
    await expect.poll(() => posts).toBe(1);
    await expect(confirm).toBeDisabled();
    await confirm.press('Enter');
    expect(posts).toBe(1);
  } finally {
    finish?.();
  }
  await expect(page.getByRole('alert').filter({ hasText: 'HTTP 503' })).toBeVisible();
});

test('H86 keeps locked values read only and saves an editable typed value with version and CSRF', async ({ page }) => {
  const patches: Array<{ body: unknown; csrf: string }> = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname.includes('/admin/operational-configs/')) patches.push({ body: request.postDataJSON(), csrf: request.headers()['x-csrf-token'] ?? '' });
  });
  await page.goto('/admin/config');
  await expect(page.getByRole('heading', { name: 'Synthetic locked capacity rule' })).toBeVisible();
  const locked = page.getByRole('heading', { name: 'Synthetic locked capacity rule' }).locator('..');
  await expect(locked.getByRole('button')).toHaveCount(0);
  await expect(page.getByText(/Aturan produk dan izin yang terkunci tetap sama/i)).toBeVisible();
  const editable = page.getByRole('heading', { name: 'Synthetic maintenance notice' }).locator('..');
  await editable.getByRole('combobox').selectOption('true');
  await editable.getByRole('button', { name: /Simpan versi ini/i }).click();
  await expect.poll(() => patches.length).toBe(1);
  expect(patches[0]).toEqual({ body: { expected_version: 1, typed_value: true }, csrf: 'owner-uat-csrf' });
  await expect(editable).toContainText('v2');
});

test('H86 reloads current server configuration after a version conflict', async ({ page }) => {
  let patches = 0;
  await page.route('**/api/v1/admin/operational-configs/synthetic_maintenance_notice', async (route) => {
    patches += 1;
    await route.fulfill({ status: 409, json: { error: { code: 'VERSION_CONFLICT' } } });
  });
  await page.goto('/admin/config');
  const editable = page.getByRole('heading', { name: 'Synthetic maintenance notice' }).locator('..');
  await editable.getByRole('button', { name: 'Simpan versi ini' }).click();
  await expect.poll(() => patches).toBe(1);
  await expect(page.getByRole('status').filter({ hasText: /Konfigurasi terkini sudah dimuat ulang/i })).toBeVisible();
  await expect(editable).toContainText('v1');
});

test('H87 native status filter keeps the applied server filter across pagination', async ({ page }) => {
  const seen: URL[] = [];
  await page.route('**/api/v1/admin/issues?*', async (route) => {
    const url = new URL(route.request().url()); seen.push(url);
    await route.fulfill({ status: 200, json: { data: [{ issue_id: uatIds.issue, status: 'OPEN', issue_type: 'PHOTO_PROCESSING', severity: 'MEDIUM', summary: 'Synthetic Owner UAT operational issue.', error_code: 'UAT_SYNTHETIC', related_entity_type: 'ALBUM', related_entity_id: uatIds.album, created_at: '2026-10-01T08:00:00Z', acknowledged_at: null, resolved_at: null }], meta: { has_more: !url.searchParams.has('cursor'), next_cursor: url.searchParams.has('cursor') ? null : 'next-page' } } });
  });
  await page.goto('/admin/issues');
  const status = page.getByRole('combobox', { name: 'Status' });
  await expect(status).toHaveCSS('appearance', 'none');
  await status.focus();
  await status.press('ArrowDown');
  await expect(status).toHaveValue('OPEN');
  await page.getByRole('button', { name: 'Terapkan' }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get('status')).toBe('OPEN');
  await status.selectOption('RESOLVED');
  await page.getByRole('button', { name: /Muat halaman berikutnya/i }).click();
  expect(seen.at(-1)?.searchParams.get('status')).toBe('OPEN');
  expect(seen.at(-1)?.searchParams.get('cursor')).toBe('next-page');
  await page.getByRole('button', { name: 'Terapkan' }).click();
  expect(seen.at(-1)?.searchParams.get('status')).toBe('RESOLVED');
  expect(seen.at(-1)?.searchParams.has('cursor')).toBe(false);
  await expect(page.getByText(/tidak otomatis memperbaiki insiden/i)).toBeVisible();
});

test('H88 confirms acknowledgement and reasoned resolution under server-owned states', async ({ page }) => {
  const actions: Array<{ path: string; csrf: string; body: unknown }> = [];
  page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname.includes(`/issues/${uatIds.issue}/`)) actions.push({ path: new URL(request.url()).pathname, csrf: request.headers()['x-csrf-token'] ?? '', body: request.postData() }); });
  await page.goto(issueRoute);
  await expect(page.locator('main dt').first()).toHaveClass(/text-xs/);
  await expect(page.locator('main dt').first()).toHaveClass(/muted-foreground/);
  const acknowledge = page.getByRole('button', { name: 'Tanggapi', exact: true });
  const resolveButton = page.getByRole('button', { name: 'Selesaikan', exact: true });
  await expect(resolveButton).toBeDisabled();
  await acknowledge.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click();
  expect(actions).toHaveLength(0);
  await acknowledge.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Konfirmasi' }).click();
  await expect.poll(() => actions.length).toBe(1);
  expect(actions[0].csrf).toBe('owner-uat-csrf');
  await expect(page.locator('main')).toContainText('ACKNOWLEDGED');
  await expect(acknowledge).toBeDisabled();
  await page.getByLabel('Alasan penyelesaian').fill('Synthetic incident reviewed and corrected.');
  await resolveButton.click();
  await expect(page.getByRole('dialog')).toContainText('Synthetic incident reviewed and corrected.');
  await page.getByRole('dialog').getByRole('button', { name: 'Konfirmasi' }).click();
  await expect.poll(() => actions.length).toBe(2);
  await expect(page.locator('main')).toContainText('RESOLVED');
  await expect(resolveButton).toBeDisabled();
  await expect(page.getByText(/tidak otomatis membatalkan atau memperbaiki insiden/i)).toBeVisible();
});

test('H88 disables triage actions while offline', async ({ page }) => {
  await page.goto(issueRoute);
  await page.context().setOffline(true);
  await expect(page.getByText(/sedang offline/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tanggapi', exact: true })).toBeDisabled();
  await page.getByLabel('Alasan penyelesaian').fill('Reviewed');
  await expect(page.getByRole('button', { name: 'Selesaikan', exact: true })).toBeDisabled();
});

test('H90 explains the read-only roster without mutation controls', async ({ page }) => {
  await page.goto('/admin/admins');
  await expect(page.getByText('superadmin@kepotret.test')).toBeVisible();
  await expect(page.getByText(/proses operator di luar konsol ini/i)).toBeVisible();
  await expect(page.locator('main').getByRole('button')).toHaveCount(0);
});

test('Admin, Host, and Collaborator guides search localized body and notes with reset', async ({ page }) => {
  await page.goto('/help/admin');
  await expect(page.getByRole('navigation', { name: 'Isi panduan' })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Cari dalam panduan' });
  await search.fill('provider');
  await expect(page.getByRole('heading', { name: 'Pembayaran' })).toBeVisible();
  await search.fill('nothing-matches-this-guide');
  await expect(page.getByRole('status')).toContainText('Tidak ada bagian');
  await page.getByRole('button', { name: 'Hapus pencarian' }).click();
  await expect(page.locator('main section[id]')).toHaveCount(11);

  await page.goto('/help/host');
  const hostSearch = page.getByRole('searchbox', { name: 'Cari dalam panduan' });
  await hostSearch.fill('QR atau tautan dapat tetap berguna');
  await expect(page.locator('main li[id]')).toHaveCount(1);
  await expect(page.locator('main li[id]')).toHaveAttribute('id', 'waktu-potret');
  await expect(page.getByRole('navigation', { name: 'Isi panduan' }).getByRole('link', { name: /Mulai album/ }).first()).toHaveAttribute('href', '#mulai-album');
  await page.getByRole('button', { name: 'Hapus pencarian' }).click();
  await expect(page.locator('main li[id]')).toHaveCount(19);

  await page.goto('/help/collaborator');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('listbox', { name: 'Bahasa' }).getByRole('option', { name: 'Bahasa Inggris' }).click();
  const collaboratorSearch = page.getByRole('searchbox', { name: 'Search this guide' });
  await collaboratorSearch.fill('invitation continues safely');
  await expect(page.locator('main ol li')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Accepting an invitation' })).toBeVisible();
  await collaboratorSearch.fill('  no-match  ');
  await expect(page.getByRole('status')).toContainText('No guide sections match');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('main ol li')).toHaveCount(4);
});

test('H85–H90 and Help fit desktop/mobile widths in ID Light and EN Dark', async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [, route] of routes) {
      await page.goto(route);
      await expect(page.locator('main h1').first()).toBeVisible();
      await noOverflow(page);
    }
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [, route] of routes) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await noOverflow(page);
  }
});

test('synthetic H85–H90 and Help evidence', async ({ page }) => {
  test.skip(process.env.UAT_CAPTURE_EVIDENCE !== '1', 'Evidence capture runs only on request.');
  test.setTimeout(180_000);
  const directory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-03/evidence');
  mkdirSync(directory, { recursive: true });
  for (const [id, route] of routes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.screenshot({ path: resolve(directory, `${id}-desktop-1440-id-light.png`), fullPage: true, animations: 'disabled' });
    if (id === 'h85') {
      await page.getByLabel('Harga (IDR)').fill('450000');
      await page.getByLabel('Kuota total').fill('25');
      await expect(page.getByText(/450.000 untuk 25 foto/i)).toBeVisible();
      await page.screenshot({ path: resolve(directory, 'h85-review-desktop-1440-id-light.png'), fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Tinjau sebelum membuat' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({ path: resolve(directory, 'h85-confirm-desktop-1440-id-light.png'), animations: 'disabled' });
      await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click();
    }
  }
  await page.context().addCookies([{ name: 'kepotret-locale', value: 'en', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => localStorage.setItem('kepotret-theme', 'dark'));
  for (const [id, route] of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${route}?uat=normal`);
    await expect(page.locator('#__owner-visual-uat-badge')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: resolve(directory, `${id}-mobile-390-en-dark.png`), fullPage: true, animations: 'disabled' });
    if (id === 'h85') {
      await page.getByLabel('Price (IDR)').fill('450000');
      await page.getByLabel('Total quota').fill('25');
      await expect(page.getByText(/450,000 for 25 photos/i)).toBeVisible();
      await page.screenshot({ path: resolve(directory, 'h85-review-mobile-390-en-dark.png'), fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Review before creating' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({ path: resolve(directory, 'h85-confirm-mobile-390-en-dark.png'), animations: 'disabled' });
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    }
  }
});
