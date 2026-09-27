import { expect, test } from '@playwright/test';

const albumId = '11111111-1111-4111-8111-111111111111';
const packageVersionId = '44444444-4444-4444-8444-444444444444';
const transactionId = '55555555-5555-4555-8555-555555555555';
const transaction = { transaction_id: transactionId, album_id: albumId, type: 'UPGRADE', status: 'PENDING', package_version_id: packageVersionId, package_name_snapshot: 'Plus', target_quota_total_snapshot: 300, amount: 75000, currency: 'IDR', payment_cutoff_at: '2026-10-20T10:00:00Z', provider_expires_at: '2026-10-20T10:00:00Z', created_at: '2026-10-01T10:00:00Z', paid_at: null };

test('H37 uses server checkout eligibility and sends CSRF with a stable UUIDv7 before HTTPS navigation', async ({ page }) => {
  await page.route('**/api/v1/albums/' + albumId + '/package-options', route => route.fulfill({ status: 200, json: { data: {
    album_id: albumId, current_quota_total: 30, reserved_count: 1, committed_count: 2,
    payment_cutoff_at: '2026-10-20T10:00:00Z', server_time: '2026-10-01T10:00:00Z',
    can_create_checkout: true, checkout_block_reason: null, active_checkout: null,
    options: [{ package_id: '33333333-3333-4333-8333-333333333333', package_version_id: packageVersionId, code: 'PLUS', name: 'Plus', price_amount: 75000, currency: 'IDR', quota_total: 300 }],
  } } }));
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  let idempotencyKey = '';
  await page.route('**/api/v1/albums/' + albumId + '/payments', async route => {
    idempotencyKey = route.request().headers()['idempotency-key'] ?? '';
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(route.request().postDataJSON()).toEqual({ package_version_id: packageVersionId });
    return route.fulfill({ status: 201, json: { data: { transaction: {
      transaction_id: transactionId, album_id: albumId, type: 'UPGRADE', status: 'PENDING', package_version_id: packageVersionId,
      package_name_snapshot: 'Plus', target_quota_total_snapshot: 300, amount: 75000, currency: 'IDR',
      payment_cutoff_at: '2026-10-20T10:00:00Z', provider_expires_at: '2026-10-20T10:00:00Z', created_at: '2026-10-01T10:00:00Z', paid_at: null,
    }, checkout_url: 'https://pay.test/session/one' } } });
  });
  await page.route('https://pay.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Provider stub</title>' }));

  await page.goto(`/album/${albumId}/checkout/${packageVersionId}`);
  await expect(page.getByText('Plus', { exact: true })).toBeVisible();
  await expect(page.getByText('Kapasitas foto: 300')).toBeVisible();
  await page.getByRole('button', { name: 'Lanjutkan pembayaran' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lanjutkan pembayaran' }).click();
  await expect(page).toHaveURL('https://pay.test/session/one');
  expect(idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('H38 ignores provider return query parameters and shows only the server payment status', async ({ page }) => {
  await page.route('**/api/v1/payments/' + transactionId, route => route.fulfill({ status: 200, json: { data: {
    transaction_id: transactionId, album_id: albumId, type: 'UPGRADE', status: 'PENDING', package_version_id: packageVersionId,
    package_name_snapshot: 'Plus', target_quota_total_snapshot: 300, amount: 75000, currency: 'IDR',
    payment_cutoff_at: '2026-10-20T10:00:00Z', provider_expires_at: '2026-10-20T10:00:00Z', created_at: '2026-10-01T10:00:00Z', paid_at: null,
  } } }));
  await page.goto(`/album/${albumId}/pembayaran/${transactionId}/status?status=success&transaction_status=settlement`);
  await expect(page.getByText('Menunggu pembayaran')).toBeVisible();
  await expect(page.getByText('Pembayaran berhasil')).toHaveCount(0);
});

test('H47/H48 show server transaction snapshots; H49 offers only higher-quota packages', async ({ page }) => {
  await page.route(`**/api/v1/albums/${albumId}/payments**`, route => route.fulfill({ status: 200, json: { data: [transaction], meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/payments/${transactionId}`, route => route.fulfill({ status: 200, json: { data: transaction } }));
  await page.goto(`/album/${albumId}/pembayaran`);
  await expect(page.getByText('Plus', { exact: true })).toBeVisible();
  await expect(page.getByText('Menunggu pembayaran')).toBeVisible();
  await page.getByRole('link', { name: 'Detail transaksi' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/pembayaran/${transactionId}`);
  await expect(page.getByText('Plus', { exact: true })).toBeVisible();
  await expect(page.getByText(transactionId)).toBeVisible();
  await expect(page.getByText('Upgrade kapasitas')).toBeVisible();
  await expect(page.getByText('Batas pembayaran', { exact: false })).toBeVisible();
  await expect(page.getByText('Batas waktu penyedia', { exact: false })).toBeVisible();

  await page.route(`**/api/v1/albums/${albumId}/package-options`, route => route.fulfill({ status: 200, json: { data: {
    album_id: albumId, current_quota_total: 100, reserved_count: 4, committed_count: 6,
    payment_cutoff_at: '2026-10-20T10:00:00Z', server_time: '2026-10-01T10:00:00Z',
    can_create_checkout: true, checkout_block_reason: null, active_checkout: null,
    options: [{ package_id: '33333333-3333-4333-8333-333333333333', package_version_id: packageVersionId, code: 'PLUS', name: 'Plus', price_amount: 75000, currency: 'IDR', quota_total: 300 }],
  } } }));
  await page.goto(`/album/${albumId}/upgrade`);
  await expect(page.getByText('Kapasitas saat ini: 100')).toBeVisible();
  await expect(page.getByText('300', { exact: false })).toBeVisible();
  await expect(page.getByText('Pilih paket')).toBeVisible();
});

test('checkout preserves 401 and 403 returned by the CSRF endpoint', async ({ page }) => {
  await page.route('**/api/v1/albums/' + albumId + '/package-options', route => route.fulfill({ status: 200, json: { data: {
    album_id: albumId, current_quota_total: 30, reserved_count: 0, committed_count: 0,
    payment_cutoff_at: '2026-10-20T10:00:00Z', server_time: '2026-10-01T10:00:00Z',
    can_create_checkout: true, checkout_block_reason: null, active_checkout: null,
    options: [{ package_id: '33333333-3333-4333-8333-333333333333', package_version_id: packageVersionId, code: 'PLUS', name: 'Plus', price_amount: 75000, currency: 'IDR', quota_total: 300 }],
  } } }));
  let csrfStatus = 401;
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: csrfStatus, json: { error: { code: csrfStatus === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: 'Denied', request_id: 'test' } } }));
  let paymentRequests = 0;
  await page.route('**/api/v1/albums/' + albumId + '/payments', route => { paymentRequests += 1; return route.fulfill({ status: 500 }); });
  await page.goto(`/album/${albumId}/checkout/${packageVersionId}`);
  await page.getByRole('button', { name: 'Lanjutkan pembayaran' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lanjutkan pembayaran' }).click();
  await expect(page.getByText('Sesi perlu diperbarui')).toBeVisible();
  csrfStatus = 403;
  await page.goto(`/album/${albumId}/checkout/${packageVersionId}`);
  await page.getByRole('button', { name: 'Lanjutkan pembayaran' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lanjutkan pembayaran' }).click();
  await expect(page.getByText('Akses tidak tersedia')).toBeVisible();
  expect(paymentRequests).toBe(0);
});
