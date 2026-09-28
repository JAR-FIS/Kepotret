import { expect, test } from '@playwright/test';

const invitationId = '11111111-1111-4111-8111-111111111111';
const albumId = '22222222-2222-4222-8222-222222222222';
const preview = { data: { invitation_id: invitationId, album_id: albumId, event_name: 'A long event name for permission and continuation checks', permissions: { can_setup: false, can_moderate: true, can_export_zip: false }, expires_at: '2026-10-01T00:00:00Z', status: 'PENDING', invited_email_hint: 'pl***@example.com' } };

test('H17 maps invalid, expired, used and revoked invitations safely and preserves retry UI on continuation errors', async ({ page }) => {
  let response: { status: number; code?: string } = { status: 404 };
  await page.route(`**/api/v1/collaborator-invitations/${invitationId}/resolve`, route => route.fulfill({
    status: response.status,
    json: response.status === 200 ? preview : { error: { code: response.code ?? 'INVITATION_INVALID' } },
  }));

  for (const scenario of [
    { state: 'invalid', response: { status: 404 }, heading: 'Undangan tidak tersedia' },
    { state: 'expired', response: { status: 410, code: 'INVITATION_EXPIRED' }, heading: 'Undangan kedaluwarsa' },
    { state: 'used', response: { status: 410, code: 'INVITATION_USED' }, heading: 'Undangan tidak lagi tersedia' },
    { state: 'used', response: { status: 410, code: 'INVITATION_REVOKED' }, heading: 'Undangan tidak lagi tersedia' },
  ]) {
    response = scenario.response;
    await page.goto(`/undangan/kolaborator/${invitationId}#one-time-secret`);
    await expect(page.getByRole('heading', { name: scenario.heading })).toBeVisible();
    expect(page.url()).not.toContain('one-time-secret');
  }

  response = { status: 429, code: 'RATE_LIMITED' };
  await page.goto(`/undangan/kolaborator/${invitationId}#one-time-secret`);
  await expect(page.getByRole('heading', { name: 'Undangan belum dapat diperiksa' })).toBeVisible();
  expect(page.url()).not.toContain('one-time-secret');

  await page.route(`**/api/v1/collaborator-invitations/${invitationId}/preview`, route => route.fulfill({ status: 503, json: { error: { code: 'CONTINUATION_UNAVAILABLE' } } }));
  await page.goto(`/undangan/kolaborator/${invitationId}`);
  await expect(page.getByRole('heading', { name: 'Undangan belum dapat diperiksa' })).toBeVisible();
});

test('H17 retries a recoverable resolve with the same in-memory secret after clearing the URL fragment @release-critical', async ({ page }) => {
  const resolveBodies: Array<{ invitation_secret?: string }> = [];
  let previewRequests = 0;
  let retryClicked = false;
  await page.route(`**/api/v1/collaborator-invitations/${invitationId}/resolve`, async route => {
    resolveBodies.push(route.request().postDataJSON() as { invitation_secret?: string });
    if (!retryClicked) {
      return route.fulfill({ status: 429, json: { error: { code: 'RATE_LIMITED' } } });
    }
    return route.fulfill({ status: 200, json: preview });
  });
  await page.route(`**/api/v1/collaborator-invitations/${invitationId}/preview`, route => {
    previewRequests += 1;
    return route.fulfill({ status: 200, json: preview });
  });
  await page.route('**/api/v1/auth/me', route => route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }));

  await page.goto(`/undangan/kolaborator/${invitationId}#retry-secret`);
  await expect(page.getByRole('heading', { name: 'Undangan belum dapat diperiksa' })).toBeVisible();
  await expect.poll(() => page.url()).not.toContain('retry-secret');
  expect(page.url()).not.toContain('#');
  expect(await page.evaluate(() => `${localStorage.length}:${sessionStorage.length}`)).toBe('0:0');
  expect(resolveBodies.length).toBeGreaterThanOrEqual(1);
  expect(resolveBodies.every(body => body.invitation_secret === 'retry-secret')).toBe(true);
  expect(previewRequests).toBe(0);

  retryClicked = true;
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeVisible();
  expect(resolveBodies.length).toBeGreaterThanOrEqual(2);
  expect(resolveBodies.every(body => body.invitation_secret === 'retry-secret')).toBe(true);
  expect(previewRequests).toBe(0);
  expect(page.url()).not.toContain('retry-secret');
  expect(page.url()).not.toContain('#');
  expect(await page.evaluate(() => `${localStorage.length}:${sessionStorage.length}`)).toBe('0:0');
});

test('H17 accept uses the continuation cookie and maps session, mismatch, terminal and rate-limit responses', async ({ page }) => {
  let acceptStatus = 401;
  let acceptCode: string | undefined;
  const acceptedRequests: Array<{ postData: string | null; url: string }> = [];
  await page.route(`**/api/v1/collaborator-invitations/${invitationId}/preview`, route => route.fulfill({ status: 200, json: preview }));
  await page.route('**/api/v1/auth/me', route => route.fulfill({ status: 200, json: { data: { email: 'planner@example.com', email_verified: true } } }));
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route(`**/api/v1/collaborator-invitations/${invitationId}/accept`, async route => {
    acceptedRequests.push({ postData: route.request().postData(), url: route.request().url() });
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    return route.fulfill({ status: acceptStatus, json: acceptStatus === 201 ? { data: {} } : { error: { code: acceptCode ?? 'ACCEPT_FAILED' } } });
  });
  await page.route('**/api/v1/auth/google/start**', route => route.fulfill({ status: 200, json: { data: { redirect_url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test' } } }));
  await page.route('https://accounts.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google sign-in stub</title>' }));

  await page.goto(`/undangan/kolaborator/${invitationId}`);
  await page.getByRole('button', { name: 'Terima undangan' }).click();
  await expect(page.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeVisible();
  await page.getByRole('button', { name: 'Lanjutkan dengan Google' }).click();
  await expect(page).toHaveURL(/accounts\.google\.com/);

  for (const scenario of [
    { status: 403, code: 'VERIFIED_EMAIL_MISMATCH', text: 'Gunakan alamat email yang diundang' },
    { status: 410, code: 'INVITATION_EXPIRED', text: 'Undangan kedaluwarsa' },
    { status: 410, code: 'INVITATION_USED', text: 'Undangan tidak lagi tersedia' },
    { status: 429, code: 'RATE_LIMITED', text: 'Undangan belum dapat diperiksa' },
  ]) {
    acceptStatus = scenario.status;
    acceptCode = scenario.code;
    await page.goto(`/undangan/kolaborator/${invitationId}`);
    await page.getByRole('button', { name: 'Terima undangan' }).click();
    await expect(page.getByRole('heading', { name: scenario.text })).toBeVisible();
  }

  acceptStatus = 401;
  acceptCode = 'UNAUTHENTICATED';
  await page.goto(`/undangan/kolaborator/${invitationId}`);
  await page.getByRole('button', { name: 'Terima undangan' }).click();
  await expect(page.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeVisible();
  expect(acceptedRequests).toHaveLength(6);
  for (const request of acceptedRequests) {
    expect(request.postData).toBeNull();
    expect(request.url).not.toContain('one-time-secret');
  }
  expect(await page.evaluate(() => `${localStorage.length}:${sessionStorage.length}`)).toBe('0:0');
});
