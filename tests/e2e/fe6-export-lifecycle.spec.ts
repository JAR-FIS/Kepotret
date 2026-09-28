import { expect, test } from '@playwright/test';

const albumId = '11111111-1111-4111-8111-111111111111';
const jobId = '77777777-7777-4777-8777-777777777777';
const photoId = '88888888-8888-4888-8888-888888888888';
const readyJob = { export_job_id: jobId, album_id: albumId, status: 'READY', mode: 'ALL', selected_count: 1, source_export_revision: 1, processed_count: 1, total_count: 1, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:01:00Z', output_expires_at: '2026-10-02T10:01:00Z' };

test('H50 and H51 create an ALL export with CSRF, show server progress and request a short-lived download descriptor @release-critical', async ({ page }) => {
  await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 500, eligible_photo_count: 3, allow_all: true, allow_selected: false } } }));
  await page.route(`**/api/v1/albums/${albumId}/exports**`, async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } });
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({ mode: 'ALL' });
    return route.fulfill({ status: 201, json: { data: { export_job_id: jobId, album_id: albumId, status: 'QUEUED', mode: 'ALL', selected_count: 3, source_export_revision: 1, processed_count: 0, total_count: 3, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', output_expires_at: null } } });
  });
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route(`**/api/v1/exports/${jobId}`, route => route.fulfill({ status: 200, json: { data: { export_job_id: jobId, album_id: albumId, status: 'READY', mode: 'ALL', selected_count: 3, source_export_revision: 1, processed_count: 3, total_count: 3, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:01:00Z', output_expires_at: '2026-10-02T10:01:00Z' } } }));
  await page.route(`**/api/v1/exports/${jobId}/download`, route => route.fulfill({ status: 200, json: { data: { url: 'https://files.test/export.zip', expires_at: '2026-10-02T10:01:00Z' } } }));
  await page.route('https://files.test/**', route => route.fulfill({ status: 200, body: 'zip stub' }));

  await page.goto(`/album/${albumId}/ekspor`);
  await expect(page.getByRole('radio', { name: 'Pilih foto' })).toBeDisabled();
  await page.getByRole('button', { name: 'Buat ZIP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Buat ZIP' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/ekspor/${jobId}`);
  await expect(page.getByText('Siap diunduh')).toBeVisible();
  await expect(page.getByText('3 / 3')).toBeVisible();
  await page.getByRole('button', { name: 'Unduh ZIP' }).click();
  await expect(page).toHaveURL('https://files.test/export.zip');
});

test('H55 activation and H56 recovery media remain Owner-projected and support recovery ZIP', async ({ page }) => {
  let active = false;
  let ownerDownloadCalled = false;
  const lifecycle = () => ({ data: { album_id: albumId, retention_state: active ? 'RECOVERY' : 'ACTIVE', server_time: '2026-10-01T10:00:00Z', recovery_access_granted_at: active ? '2026-10-01T10:00:00Z' : null, normal_access_end_at: '2026-10-01T10:00:00Z', recovery_end_at: '2026-10-08T10:00:00Z', backup_cleanup_deadline_at: '2026-10-22T10:00:00Z', can_activate_recovery: !active, can_open_recovery_media: active, can_create_recovery_export: active } });
  await page.route(`**/api/v1/albums/${albumId}/lifecycle`, route => route.fulfill({ status: 200, json: lifecycle() }));
  await page.route(`**/api/v1/albums/${albumId}/recovery-access`, async route => {
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    active = true;
    return route.fulfill({ status: 200, json: lifecycle() });
  });
  await page.route(`**/api/v1/albums/${albumId}/recovery/photos**`, route => route.fulfill({ status: 200, json: { data: [{ photo_id: photoId, created_at: '2026-09-30T10:00:00Z', photographer_display_name: 'Rani', media: { url: 'https://media.test/photo', expires_at: '2026-10-02T10:00:00Z' }, can_download: true }], meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 500, eligible_photo_count: 1, allow_all: true, allow_selected: false } } }));
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}/download`, async route => {
    ownerDownloadCalled = true;
    return route.fulfill({ status: 200, json: { data: { url: 'https://media.test/authorized-download', expires_at: '2026-10-02T10:00:00Z' } } });
  });
  await page.route('https://media.test/authorized-download', route => route.fulfill({ status: 200, body: 'authorized photo download' }));
  await page.route('https://media.test/photo', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/V7sAAAAASUVORK5CYII=', 'base64') }));
  await page.route(`**/api/v1/albums/${albumId}/exports`, route => route.fulfill({ status: 201, json: { data: { export_job_id: jobId, album_id: albumId, status: 'QUEUED', mode: 'ALL', selected_count: 1, source_export_revision: 1, processed_count: 0, total_count: 1, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', output_expires_at: null } } }));

  await page.goto(`/album/${albumId}/pemulihan`);
  await page.getByRole('button', { name: 'Aktifkan pemulihan' }).click();
  await expect(page.getByRole('dialog')).toContainText('D+37');
  await expect(page.getByRole('dialog')).toContainText('D+30');
  await page.getByRole('dialog').getByRole('button', { name: 'Aktifkan pemulihan' }).click();
  await expect(page.getByRole('link', { name: 'Buka media pemulihan' })).toBeVisible();
  await page.getByRole('link', { name: 'Buka media pemulihan' }).click();
  await expect(page.getByText('Rani')).toBeVisible();
  await expect(page.locator('img[alt="Foto pemulihan oleh Rani"]')).toHaveAttribute('src', 'https://media.test/photo');
  await page.getByRole('button', { name: 'Buat ZIP pemulihan' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/ekspor/${jobId}`);
  await page.goto(`/album/${albumId}/pemulihan/media`);
  await page.getByRole('button', { name: 'Unduh media' }).click();
  await expect(page).toHaveURL('https://media.test/authorized-download');
  expect(ownerDownloadCalled).toBe(true);
});

test('SELECTED export retry reuses a UUIDv7 only for the identical canonical photo set', async ({ page }) => {
  const secondPhotoId = '99999999-9999-4999-8999-999999999999';
  await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 20, eligible_photo_count: 2, allow_all: true, allow_selected: true } } }));
  await page.route(`**/api/v1/albums/${albumId}/exports**`, async route => route.request().method() === 'GET' ? route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } }) : Promise.resolve(route.fulfill({ status: 201, json: { data: { export_job_id: jobId, album_id: albumId, status: 'QUEUED', mode: 'SELECTED', selected_count: 2, source_export_revision: 1, processed_count: 0, total_count: 2, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', output_expires_at: null } } })));
  await page.route(`**/api/v1/albums/${albumId}/export-selection/photos**`, route => route.fulfill({ status: 200, json: { data: [
    { photo_id: photoId, created_at: '2026-09-30T10:00:00Z', photographer_display_name: 'Rani' },
    { photo_id: secondPhotoId, created_at: '2026-09-30T11:00:00Z', photographer_display_name: 'Bima' },
  ], meta: { has_more: false, next_cursor: null } } }));
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  const attempts: Array<{ key: string; ids: string[] }> = [];
  await page.route(`**/api/v1/albums/${albumId}/exports`, async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { data: [], meta: { has_more: false, next_cursor: null } } });
    attempts.push({ key: route.request().headers()['idempotency-key'] ?? '', ids: route.request().postDataJSON().photo_ids });
    return attempts.length < 3 ? route.fulfill({ status: 503, json: { error: { code: 'TEMPORARY_UNAVAILABLE' } } }) : route.fulfill({ status: 201, json: { data: { export_job_id: jobId, album_id: albumId, status: 'QUEUED', mode: 'SELECTED', selected_count: 2, source_export_revision: 1, processed_count: 0, total_count: 2, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', output_expires_at: null } } });
  });

  await page.goto(`/album/${albumId}/ekspor`);
  await page.getByRole('radio', { name: 'Pilih foto' }).check();
  await page.getByLabel(/Rani/).check();
  await page.getByRole('button', { name: 'Buat ZIP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Buat ZIP' }).click();
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  await page.getByRole('button', { name: 'Buat ZIP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Buat ZIP' }).click();
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  await page.getByLabel(/Bima/).check();
  await page.getByRole('button', { name: 'Buat ZIP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Buat ZIP' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/ekspor/${jobId}`);
  expect(attempts).toHaveLength(3);
  expect(attempts[0].key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(attempts[2].key).not.toBe(attempts[0].key);
  expect(attempts[0].ids).toEqual([photoId]);
  expect(attempts[2].ids).toEqual([photoId, secondPhotoId]);
});

test('H51 disables READY descriptor requests while offline', async ({ page }) => {
  let descriptorRequests = 0;
  await page.route(`**/api/v1/exports/${jobId}`, route => route.fulfill({ status: 200, json: { data: { export_job_id: jobId, album_id: albumId, status: 'READY', mode: 'ALL', selected_count: 1, source_export_revision: 1, processed_count: 1, total_count: 1, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:01:00Z', output_expires_at: '2026-10-02T10:01:00Z' } } }));
  await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 20, eligible_photo_count: 1, allow_all: true, allow_selected: false } } }));
  await page.route(`**/api/v1/exports/${jobId}/download`, route => { descriptorRequests += 1; return route.fulfill({ status: 200, json: { data: { url: 'https://files.test/export.zip', expires_at: '2026-10-02T10:01:00Z' } } }); });
  await page.goto(`/album/${albumId}/ekspor/${jobId}`);
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeEnabled();
  await page.context().setOffline(true);
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  expect(descriptorRequests).toBe(0);
});

test('H51 stops polling after forbidden job access', async ({ page }) => {
  let requests = 0;
  await page.route(`**/api/v1/exports/${jobId}`, route => { requests += 1; return route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } }); });
  await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } }));
  await page.goto(`/album/${albumId}/ekspor/${jobId}`);
  await expect(page.getByText('Akses tidak tersedia')).toBeVisible();
  const initialRequests = requests;
  expect(initialRequests).toBeGreaterThan(0);
  await page.waitForTimeout(4300);
  expect(requests).toBe(initialRequests);
});

for (const [status, feedback] of [[401, 'Sesi perlu diperbarui'], [403, 'Akses tidak tersedia'], [410, 'Arsip ekspor ini sudah kedaluwarsa.'], [429, 'Terlalu banyak permintaan.']] as const) {
  test(`H51 handles download descriptor HTTP ${status} without automatic retry`, async ({ page }) => {
    let requests = 0;
    await page.route(`**/api/v1/exports/${jobId}`, route => route.fulfill({ status: 200, json: { data: readyJob } }));
    await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 20, eligible_photo_count: 1, allow_all: true, allow_selected: false } } }));
    await page.route(`**/api/v1/exports/${jobId}/download`, route => { requests += 1; return route.fulfill({ status, json: { error: { code: 'DENIED' } } }); });
    await page.goto(`/album/${albumId}/ekspor/${jobId}`);
    await page.getByRole('button', { name: 'Unduh ZIP' }).click();
    await expect(page.getByText(feedback, { exact: false })).toBeVisible();
    expect(requests).toBe(1);
  });
}

test('H55 and H56 keep recovery actions closed offline and after the server projects PURGED', async ({ page }) => {
  let retentionState: 'ACTIVE'|'RECOVERY'|'PURGED' = 'ACTIVE';
  let activationRequests = 0;
  let downloadRequests = 0;
  const projection = () => ({ data: { album_id: albumId, retention_state: retentionState, server_time: '2026-10-01T10:00:00Z', recovery_access_granted_at: retentionState === 'RECOVERY' ? '2026-10-01T10:00:00Z' : null, normal_access_end_at: '2026-10-01T10:00:00Z', recovery_end_at: '2026-10-08T10:00:00Z', backup_cleanup_deadline_at: '2026-10-22T10:00:00Z', can_activate_recovery: retentionState === 'ACTIVE', can_open_recovery_media: retentionState === 'RECOVERY', can_create_recovery_export: retentionState === 'RECOVERY' } });
  await page.route(`**/api/v1/albums/${albumId}/lifecycle`, route => route.fulfill({ status: 200, json: projection() }));
  await page.route(`**/api/v1/albums/${albumId}/recovery-access`, route => { activationRequests += 1; return route.fulfill({ status: 200, json: projection() }); });
  await page.route(`**/api/v1/albums/${albumId}/recovery/photos**`, route => route.fulfill({ status: 200, json: { data: retentionState === 'RECOVERY' ? [{ photo_id: photoId, created_at: '2026-09-30T10:00:00Z', photographer_display_name: 'Rani', media: { url: 'https://media.test/photo', expires_at: '2026-10-02T10:00:00Z' }, can_download: true }] : [], meta: { has_more: false, next_cursor: null } } }));
  await page.route(`**/api/v1/albums/${albumId}/export-capabilities`, route => route.fulfill({ status: 200, json: { data: { max_photos_per_job: 20, eligible_photo_count: 1, allow_all: true, allow_selected: false } } }));
  await page.route(`**/api/v1/albums/${albumId}/photos/${photoId}/download`, route => { downloadRequests += 1; return route.fulfill({ status: 200, json: { data: { url: 'https://media.test/download', expires_at: '2026-10-02T10:00:00Z' } } }); });
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));

  await page.goto(`/album/${albumId}/pemulihan`);
  await page.context().setOffline(true);
  await expect(page.getByRole('button', { name: 'Aktifkan pemulihan' })).toBeDisabled();
  expect(activationRequests).toBe(0);
  await page.context().setOffline(false);
  retentionState = 'RECOVERY';
  await page.goto(`/album/${albumId}/pemulihan/media`);
  await page.context().setOffline(true);
  await expect(page.getByRole('button', { name: 'Buat ZIP pemulihan' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Unduh media' })).toBeDisabled();
  expect(downloadRequests).toBe(0);

  retentionState = 'PURGED';
  await page.context().setOffline(false);
  await page.goto(`/album/${albumId}/pemulihan/media`);
  await expect(page.getByText('Akses pengguna sudah berakhir.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh media' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Buat ZIP pemulihan' })).toHaveCount(0);
});

test('H53 uses server schedule version and preserves the proposal after a stale conflict', async ({ page }) => {
  let scheduleVersion = 7;
  const currentSchedule = () => ({ capture_start: '2026-10-01T14:00:00Z', capture_end: '2026-10-02T14:00:00Z', reveal_delay_days: 3, reveal_at: '2026-10-05T14:00:00Z', payment_cutoff_at: '2026-10-02T12:00:00Z', timezone: 'Asia/Jakarta', server_time: '2026-09-27T00:00:00Z', can_reschedule: true, earliest_capture_start: null, latest_capture_start: null, schedule_version: scheduleVersion, first_confirmed_capture_start: '2026-10-01T14:00:00Z', first_confirmed_timezone: 'Asia/Jakarta', reschedule_cutoff_at: '2026-09-29T14:00:00Z' });
  await page.route(`**/api/v1/albums/${albumId}/schedule`, route => route.fulfill({ status: 200, json: { data: currentSchedule() } }));
  await page.route(`**/api/v1/albums/${albumId}/package-options`, route => route.fulfill({ status: 200, json: { data: { album_id: albumId, current_quota_total: 30, reserved_count: 0, committed_count: 0, payment_cutoff_at: '2026-10-02T12:00:00Z', server_time: '2026-09-27T00:00:00Z', can_create_checkout: false, checkout_block_reason: null, active_checkout: { transaction_id: '66666666-6666-4666-8666-666666666666', package_version_id: '44444444-4444-4444-8444-444444444444', status: 'PENDING', provider_expires_at: '2026-10-02T12:00:00Z' }, options: [] } } }));
  await page.route(`**/api/v1/albums/${albumId}/lifecycle`, route => route.fulfill({ status: 200, json: { data: { album_id: albumId, retention_state: 'ACTIVE', server_time: '2026-09-27T00:00:00Z', recovery_access_granted_at: null, normal_access_end_at: '2026-10-02T14:00:00Z', recovery_end_at: '2026-10-09T14:00:00Z', backup_cleanup_deadline_at: '2026-10-23T14:00:00Z', can_activate_recovery: false, can_open_recovery_media: false, can_create_recovery_export: false } } }));
  await page.route(`**/api/v1/albums/${albumId}/entitlement`, route => route.fulfill({ status: 200, json: { data: { album_id: albumId, quota_total: 30, source: 'FREE30' } } }));
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route(`**/api/v1/albums/${albumId}/reschedule`, async route => {
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(route.request().postDataJSON()).toMatchObject({ expected_schedule_version: 7, capture_start: '2026-10-01T15:00:00Z', capture_end: '2026-10-02T15:00:00Z', reveal_delay_days: 5 });
    scheduleVersion = 8;
    return route.fulfill({ status: 409, json: { error: { code: 'SCHEDULE_VERSION_CONFLICT' } } });
  });

  await page.goto(`/album/${albumId}/jadwal-ulang`);
  await expect(page.getByText('Pembayaran aktif sedang diproses.')).toBeVisible();
  await expect(page.getByText(/Batas pembayaran: 2 Okt 2026, 19\.00/)).toBeVisible();
  await page.getByLabel('Mulai pengambilan').fill('2026-10-01T22:00');
  await page.getByLabel('Akhir pengambilan').fill('2026-10-02T22:00');
  await page.getByLabel('Jeda publikasi (hari)').selectOption('5');
  await page.getByRole('button', { name: 'Tinjau jadwal' }).click();
  await expect(page.getByText(/Pembayaran masih tertunda/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan jadwal' }).click();
  await expect(page.getByText('Jadwal berubah di server.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Mulai pengambilan')).toHaveValue('2026-10-01T22:00');
  await expect(page.getByLabel('Jeda publikasi (hari)')).toHaveValue('5');
});

test('H53 refetches schedule, package options, lifecycle, and entitlement after successful reschedule', async ({ page }) => {
  let updated = false;
  const reads = { schedule: 0, packages: 0, lifecycle: 0, entitlement: 0 };
  const schedule = () => ({ capture_start: updated ? '2026-10-01T15:00:00Z' : '2026-10-01T14:00:00Z', capture_end: updated ? '2026-10-02T15:00:00Z' : '2026-10-02T14:00:00Z', reveal_delay_days: updated ? 5 : 3, reveal_at: '2026-10-05T14:00:00Z', payment_cutoff_at: '2026-10-02T12:00:00Z', timezone: 'Asia/Jakarta', server_time: '2026-09-27T00:00:00Z', can_reschedule: true, earliest_capture_start: null, latest_capture_start: null, schedule_version: updated ? 8 : 7, first_confirmed_capture_start: '2026-10-01T14:00:00Z', first_confirmed_timezone: 'Asia/Jakarta', reschedule_cutoff_at: '2026-09-29T14:00:00Z' });
  await page.route(`**/api/v1/albums/${albumId}/schedule`, route => { reads.schedule += 1; return route.fulfill({ status: 200, json: { data: schedule() } }); });
  await page.route(`**/api/v1/albums/${albumId}/package-options`, route => { reads.packages += 1; return route.fulfill({ status: 200, json: { data: { album_id: albumId, current_quota_total: updated ? 100 : 30, reserved_count: 0, committed_count: 0, payment_cutoff_at: '2026-10-02T12:00:00Z', server_time: '2026-09-27T00:00:00Z', can_create_checkout: false, checkout_block_reason: null, active_checkout: null, options: [] } } }); });
  await page.route(`**/api/v1/albums/${albumId}/lifecycle`, route => { reads.lifecycle += 1; return route.fulfill({ status: 200, json: { data: { album_id: albumId, retention_state: 'ACTIVE', server_time: '2026-09-27T00:00:00Z', recovery_access_granted_at: null, normal_access_end_at: '2026-10-02T14:00:00Z', recovery_end_at: '2026-10-09T14:00:00Z', backup_cleanup_deadline_at: '2026-10-23T14:00:00Z', can_activate_recovery: false, can_open_recovery_media: false, can_create_recovery_export: false } } }); });
  await page.route(`**/api/v1/albums/${albumId}/entitlement`, route => { reads.entitlement += 1; return route.fulfill({ status: 200, json: { data: { album_id: albumId, quota_total: updated ? 100 : 30, source: updated ? 'PURCHASE' : 'FREE30' } } }); });
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  let posts = 0;
  await page.route(`**/api/v1/albums/${albumId}/reschedule`, route => {
    posts += 1;
    expect(route.request().postDataJSON()).toMatchObject({ expected_schedule_version: 7, capture_start: '2026-10-01T15:00:00Z', capture_end: '2026-10-02T15:00:00Z', reveal_delay_days: 5 });
    updated = true;
    return route.fulfill({ status: 200, json: { data: schedule() } });
  });

  await page.goto(`/album/${albumId}/jadwal-ulang`);
  await expect(page.getByLabel('Mulai pengambilan')).toHaveValue('2026-10-01T21:00');
  const before = { ...reads };
  expect(Object.values(before).every(count => count > 0)).toBe(true);
  await page.getByLabel('Mulai pengambilan').fill('2026-10-01T22:00');
  await page.getByLabel('Akhir pengambilan').fill('2026-10-02T22:00');
  await page.getByLabel('Jeda publikasi (hari)').selectOption('5');
  await page.getByRole('button', { name: 'Tinjau jadwal' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan jadwal' }).click();
  await expect.poll(() => (Object.keys(before) as Array<keyof typeof before>).every(key => reads[key] > before[key])).toBe(true);
  await expect(page.getByLabel('Mulai pengambilan')).toHaveValue('2026-10-01T22:00');
  expect(posts).toBe(1);
});
