import { expect, test, type Page } from '@playwright/test';

const albumId = '22222222-2222-4222-8222-222222222222';
const albumDetail = { data: { summary: { album_id: albumId, owner_user_id: '11111111-1111-4111-8111-111111111111', owner_email: 'owner@example.test', event_name: 'Operations review album', readiness: 'READY', capture_state: 'OPEN', reveal_state: 'AVAILABLE', retention_state: 'ACTIVE', capture_start: '2026-09-28T09:00:00Z', capture_end: '2026-09-28T17:00:00Z', quota_total: 100, reserved_count: 0, committed_count: 12, hold_active: false }, event_location: null, timezone: 'Asia/Jakarta', schedule: null, lifecycle: null, entitlement: null, payment_transactions: [], related_issues: [] } };

async function adminSession(page: Page) {
  await page.route('**/api/v1/admin/auth/me', route => route.fulfill({ status: 200, json: { data: { admin_user_id: '11111111-1111-4111-8111-111111111111', email: 'operator@example.test', display_name: 'Operator', mfa_verified: true, session_expires_at: '2026-12-31T00:00:00Z', step_up_expires_at: null } } }));
  await page.route(`**/api/v1/admin/albums/${albumId}`, route => route.fulfill({ status: 200, json: albumDetail }));
}

test('FE-8 H91 requires reason and step-up before creating an album-scoped view-only grant, then revoke closes it', async ({ page }) => {
  await adminSession(page);
  let grantRequests = 0;
  let revokeRequests = 0;
  let mediaRequests = 0;
  const grantExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await page.route('**/api/v1/admin/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'admin-csrf' } } }));
  await page.route('**/api/v1/admin/auth/step-up', route => route.fulfill({ status: 200, json: { data: { verified_at: '2026-09-28T10:00:00Z', expires_at: '2026-09-28T10:10:00Z' } } }));
  await page.route(`**/api/v1/admin/albums/${albumId}/sensitive-access-grants`, async route => {
    grantRequests += 1;
    expect(route.request().postDataJSON()).toEqual({ reason: 'Review reported photo' });
    await route.fulfill({ status: 201, json: { data: { grant_id: 'grant-1', album_id: albumId, reason: 'Review reported photo', expires_at: grantExpiresAt, view_only: true } } });
  });
  await page.route(`**/api/v1/admin/albums/${albumId}/sensitive-media**`, route => { mediaRequests += 1; return route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } }); });
  await page.route('**/api/v1/admin/sensitive-access-grants/grant-1', async route => {
    revokeRequests += 1;
    await route.fulfill({ status: 200, json: { data: { grant_id: 'grant-1', album_id: albumId, reason: 'Review reported photo', expires_at: grantExpiresAt, view_only: true } } });
  });

  await page.goto(`/admin/albums/${albumId}`);
  await page.getByRole('link', { name: /Sensitive media access|Akses media sensitif/i }).click();
  await expect(page.getByRole('heading', { name: /Sensitive media access|Akses media sensitif/i })).toBeVisible();
  await expect(page.getByText(/No download|Tidak ada unduhan/i)).toBeVisible();
  await page.getByLabel(/Audit reason|Alasan audit/i).fill('Review reported photo');
  await page.getByLabel(/TOTP code|Kode TOTP/i).fill('123456');
  await page.getByRole('button', { name: /Continue to confirmation|Lanjutkan setelah konfirmasi/i }).click();
  const createDialog = page.getByRole('dialog');
  await expect(createDialog).toContainText(/temporary|sementara/i);
  await createDialog.getByRole('button', { name: /Confirm|Konfirmasi/i }).click();
  await expect.poll(() => grantRequests).toBe(1);
  await expect.poll(() => mediaRequests).toBe(1);
  await expect(page.getByText('grant-1')).toBeVisible();
  await page.getByRole('button', { name: /Revoke access and close workspace|Cabut akses dan tutup workspace/i }).click();
  const revokeDialog = page.getByRole('dialog');
  await revokeDialog.getByRole('button', { name: /Confirm|Konfirmasi/i }).click();
  await expect(page.getByRole('heading', { name: /Request temporary grant|Minta grant sementara/i })).toBeVisible();
  expect(revokeRequests).toBe(1);
});

test('FE-8 H92 requires reason and step-up for hold create and release without claiming the album reopened', async ({ page }) => {
  await adminSession(page);
  let active = false;
  let stepUps = 0;
  await page.route('**/api/v1/admin/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'admin-csrf' } } }));
  await page.route('**/api/v1/admin/auth/step-up', async route => { stepUps += 1; await route.fulfill({ status: 200, json: { data: { verified_at: '2026-09-28T10:00:00Z', expires_at: '2026-09-28T10:10:00Z' } } }); });
  await page.route(`**/api/v1/admin/albums/${albumId}/operational-hold`, async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: { data: { album_id: albumId, active_hold: active ? { hold_id: 'hold-1', album_id: albumId, reason: 'Contain suspicious activity', created_at: '2026-09-28T10:00:00Z', released_at: null } : null } } });
    }
    const body = route.request().postDataJSON() as { reason?: string };
    expect(body.reason).toBe(active ? 'Resume review complete' : 'Contain suspicious activity');
    active = route.request().method() === 'POST';
    await route.fulfill({ status: 200, json: { data: { hold_id: 'hold-1', album_id: albumId, reason: body.reason, created_at: '2026-09-28T10:00:00Z', released_at: active ? null : '2026-09-28T10:05:00Z' } } });
  });

  await page.goto(`/admin/albums/${albumId}`);
  await page.getByRole('link', { name: /Manage Operational Hold|Kelola Operational Hold/i }).click();
  await expect(page.getByText(/does not grant private-photo access|tidak memberikan hak untuk melihat foto privat/i)).toBeVisible();
  await page.getByLabel(/Required reason|Alasan wajib/i).fill('Contain suspicious activity');
  await page.getByLabel(/TOTP code|Kode TOTP/i).fill('123456');
  await page.getByRole('button', { name: /Confirm Operational Hold|Konfirmasi Operational Hold/i }).click();
  const createDialog = page.getByRole('dialog');
  await expect(createDialog).toContainText(/not deleted|does not change|tidak dihapus/i);
  await createDialog.getByRole('button', { name: /Continue|Lanjutkan/i }).click();
  await expect.poll(() => active).toBe(true);
  await expect(page.getByText('Contain suspicious activity')).toBeVisible();

  await page.getByLabel(/Required reason|Alasan wajib/i).fill('Resume review complete');
  await page.getByLabel(/TOTP code|Kode TOTP/i).fill('654321');
  await page.getByRole('button', { name: /Confirm release|Konfirmasi pelepasan/i }).click();
  const releaseDialog = page.getByRole('dialog');
  await expect(releaseDialog).toContainText(/does not guarantee capture will reopen|tidak menjamin kamera dibuka kembali/i);
  await releaseDialog.getByRole('button', { name: /Continue|Lanjutkan/i }).click();
  await expect.poll(() => active).toBe(false);
  await expect(page.getByText(/NO ACTIVE HOLD|TIDAK ADA HOLD/i)).toBeVisible();
  expect(stepUps).toBe(2);
  await expect(page.getByText(/album reopened|album dibuka kembali/i)).toHaveCount(0);
});

test('FE-8 login and help pages have no horizontal overflow at supported widths', async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/masuk');
    await expect(page.getByRole('heading', { name: /Superadmin sign in|Masuk sebagai Superadmin/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `H20 overflow at ${width}px`).toBe(true);
    await page.goto('/help/admin');
    await expect(page.getByRole('heading', { name: /Clear operations with clear authority|Operasi yang jelas/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `/help/admin overflow at ${width}px`).toBe(true);
  }
});
