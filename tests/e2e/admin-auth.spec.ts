import { expect, test } from '@playwright/test';

test('FE-8 H20 uses the dedicated Admin CSRF and sends a valid password challenge to H21', async ({ page }) => {
  const csrfCalls: string[] = [];
  const loginBodies: Array<{ email?: string; password?: string }> = [];
  await page.route('**/api/v1/admin/security/csrf', async route => {
    csrfCalls.push(route.request().url());
    await route.fulfill({ status: 200, json: { data: { csrf_token: 'admin-csrf-test' } } });
  });
  await page.route('**/api/v1/admin/auth/login', async route => {
    loginBodies.push(route.request().postDataJSON() as { email?: string; password?: string });
    await route.fulfill({ status: 202, json: { data: {} } });
  });
  let ordinaryAuthCalls = 0;
  await page.route('**/api/v1/auth/**', route => { ordinaryAuthCalls += 1; return route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }); });

  await page.goto('/admin/masuk');
  await expect(page.getByRole('heading', { name: /superadmin sign in|masuk sebagai superadmin/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /google|sign up|forgot/i })).toHaveCount(0);
  await page.getByLabel(/email/i).fill('admin@example.test');
  await page.getByLabel(/password|kata sandi/i).fill('example-password');
  await page.getByRole('button', { name: /continue to mfa|lanjutkan ke verifikasi mfa/i }).click();
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  expect(csrfCalls).toHaveLength(1);
  expect(loginBodies).toEqual([{ email: 'admin@example.test', password: 'example-password' }]);
  expect(ordinaryAuthCalls).toBe(0);
  expect(await page.evaluate(() => `${localStorage.length}:${sessionStorage.length}`)).toBe('0:0');
});

test('FE-8 Admin workspace authorizes from AdminSession, not ordinary User auth', async ({ page }) => {
  let ordinarySessionCalls = 0;
  await page.route('**/api/v1/admin/auth/me', route => route.fulfill({ status: 200, json: { data: { admin_user_id: '11111111-1111-4111-8111-111111111111', email: 'operator@example.test', display_name: 'Operator', mfa_verified: true, session_expires_at: '2026-12-31T00:00:00Z', step_up_expires_at: null } } }));
  await page.route('**/api/v1/admin/overview', route => route.fulfill({ status: 200, json: { data: { total_users: 0, suspended_users: 0, total_albums: 0, draft_albums: 0, payment_pending_albums: 0, ready_albums: 0, committed_photos: 0, reserved_photos: 0, pending_payments: 0, processing_payments: 0, successful_payments: 0, failed_payments: 0, open_issues: 0, acknowledged_issues: 0, active_holds: 0, generated_at: '2026-09-28T00:00:00Z' } } }));
  await page.route('**/api/v1/auth/me', route => { ordinarySessionCalls += 1; return route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }); });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /operations overview|ringkasan operasional/i })).toBeVisible();
  expect(ordinarySessionCalls).toBe(0);
});
