import { expect, test } from '@playwright/test';

const albumId = '11111111-1111-4111-8111-111111111111';
const jobId = '77777777-7777-4777-8777-777777777777';
const photoId = '88888888-8888-4888-8888-888888888888';

test('H50 and H51 create an ALL export with CSRF, show server progress and request a short-lived download descriptor', async ({ page }) => {
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
  await page.route(`**/api/v1/albums/${albumId}/exports`, route => route.fulfill({ status: 201, json: { data: { export_job_id: jobId, album_id: albumId, status: 'QUEUED', mode: 'ALL', selected_count: 1, source_export_revision: 1, processed_count: 0, total_count: 1, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', output_expires_at: null } } }));

  await page.goto(`/album/${albumId}/pemulihan`);
  await page.getByRole('button', { name: 'Aktifkan pemulihan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Aktifkan pemulihan' }).click();
  await expect(page.getByRole('link', { name: 'Buka media pemulihan' })).toBeVisible();
  await page.getByRole('link', { name: 'Buka media pemulihan' }).click();
  await expect(page.getByText('Rani')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Unduh media' })).toHaveAttribute('href', 'https://media.test/photo');
  await page.getByRole('button', { name: 'Buat ZIP pemulihan' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/ekspor/${jobId}`);
});

test('H53 uses server schedule version and preserves the proposal after a stale conflict', async ({ page }) => {
  let scheduleVersion = 7;
  const currentSchedule = () => ({ capture_start: '2026-10-01T14:00:00Z', capture_end: '2026-10-02T14:00:00Z', reveal_delay_days: 3, reveal_at: '2026-10-05T14:00:00Z', payment_cutoff_at: '2026-10-02T12:00:00Z', timezone: 'Asia/Jakarta', server_time: '2026-09-27T00:00:00Z', can_reschedule: true, earliest_capture_start: null, latest_capture_start: null, schedule_version: scheduleVersion, first_confirmed_capture_start: '2026-10-01T14:00:00Z', first_confirmed_timezone: 'Asia/Jakarta', reschedule_cutoff_at: '2026-09-29T14:00:00Z' });
  await page.route(`**/api/v1/albums/${albumId}/schedule`, route => route.fulfill({ status: 200, json: { data: currentSchedule() } }));
  await page.route(`**/api/v1/albums/${albumId}/package-options`, route => route.fulfill({ status: 200, json: { data: { album_id: albumId, current_quota_total: 30, reserved_count: 0, committed_count: 0, payment_cutoff_at: '2026-10-02T12:00:00Z', server_time: '2026-09-27T00:00:00Z', can_create_checkout: false, checkout_block_reason: null, active_checkout: { transaction_id: '66666666-6666-4666-8666-666666666666', package_version_id: '44444444-4444-4444-8444-444444444444', status: 'PENDING', provider_expires_at: '2026-10-02T12:00:00Z' }, options: [] } } }));
  await page.route('**/api/v1/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route(`**/api/v1/albums/${albumId}/reschedule`, async route => {
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(route.request().postDataJSON()).toMatchObject({ expected_schedule_version: 7, capture_start: '2026-10-01T15:00:00Z', capture_end: '2026-10-02T15:00:00Z', reveal_delay_days: 5 });
    scheduleVersion = 8;
    return route.fulfill({ status: 409, json: { error: { code: 'SCHEDULE_VERSION_CONFLICT' } } });
  });

  await page.goto(`/album/${albumId}/jadwal-ulang`);
  await expect(page.getByText('Pembayaran aktif sedang diproses.')).toBeVisible();
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
