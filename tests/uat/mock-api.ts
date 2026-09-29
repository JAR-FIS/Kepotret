import type { Page, Route } from '@playwright/test';
import type { OperationalIssue } from '../../src/lib/api/generated/index.schemas';
import { uatCaptureEnd, uatCaptureStart, uatEventName, uatIds, uatNow } from './constants';
import { makeAlbum, makeGuestContext, makeGuestPreview, makeInvitationPreview, makeLiveOverview, makeTransaction, uatActivityItem, uatPhoto, uatSchedule, uatSettings } from './fixtures';

const envelope = (data: unknown) => ({ data });
const list = (data: unknown[]) => ({ data, meta: { has_more: false, next_cursor: null } });
const dateLater = '2026-10-04T17:00:00Z';
const photoMedia = { url: 'https://media.test/owner-uat/photo.svg', expires_at: '2026-10-01T08:15:00Z' };
const adminMe = { admin_user_id: uatIds.user, email: 'superadmin@kepotret.test', display_name: 'Superadmin UAT', mfa_verified: true, session_expires_at: '2026-10-02T08:00:00Z', step_up_expires_at: null };
const operationalIssue: OperationalIssue = { issue_id: uatIds.issue, status: 'OPEN', issue_type: 'PHOTO_PROCESSING', severity: 'MEDIUM', summary: 'Synthetic Owner UAT operational issue.', error_code: 'UAT_SYNTHETIC', related_entity_type: 'ALBUM', related_entity_id: uatIds.album, created_at: uatNow, acknowledged_at: null, resolved_at: null };
const userSummary = { user_id: uatIds.user, email: 'owner@kepotret.test', display_name: 'Pemilik UAT', suspended: false, created_at: '2026-09-01T08:00:00Z', owned_album_count: 1, collaborator_album_count: 1, active_session_count: 1 };
const albumSummary = (scenario: string, collaborator = false) => {
  const album = makeAlbum(scenario, collaborator);
  return { album_id: album.album_id, actor_access: album.actor_access, readiness: album.readiness, capture_state: album.capture_state, reveal_state: album.reveal_state, event_name: album.event_name, timezone: album.timezone, capture_start: album.capture_start, capture_end: album.capture_end, setup_revision: album.setup_revision, schedule_version: album.schedule_version, guest_count_final: album.guest_count_final, quota_total: album.quota_total, committed_count: album.committed_count };
};

function requestFor(pathname: string, method: string, scenario: string): { status: number; body: unknown } {
  if (scenario === 'error' && method === 'GET' && !pathname.endsWith('/security/csrf')) {
    return { status: 503, body: { error: { code: 'UAT_UNAVAILABLE', message: 'Synthetic Owner UAT unavailable state.' } } };
  }

  if (pathname === '/api/v1/security/csrf' || pathname === '/api/v1/admin/security/csrf') return { status: 200, body: envelope({ csrf_token: 'owner-uat-csrf' }) };

  const invitationPath = `/api/v1/collaborator-invitations/${uatIds.invitation}`;
  const invitationTerminal = scenario === 'invalid'
    ? { status: 404, code: 'INVITATION_INVALID' }
    : scenario === 'expired'
      ? { status: 410, code: 'INVITATION_EXPIRED' }
      : scenario === 'used'
        ? { status: 410, code: 'INVITATION_USED' }
        : null;
  if (pathname === `${invitationPath}/resolve` && method === 'POST') {
    return invitationTerminal
      ? { status: invitationTerminal.status, body: { error: { code: invitationTerminal.code } } }
      : { status: 200, body: envelope(makeInvitationPreview(scenario)) };
  }
  if (pathname === `${invitationPath}/preview` && method === 'GET') {
    return invitationTerminal
      ? { status: invitationTerminal.status, body: { error: { code: invitationTerminal.code } } }
      : { status: 200, body: envelope(makeInvitationPreview(scenario)) };
  }
  if (pathname === `${invitationPath}/accept` && method === 'POST') {
    return invitationTerminal
      ? { status: invitationTerminal.status, body: { error: { code: invitationTerminal.code } } }
      : { status: 201, body: envelope({ user_id: uatIds.user, display_name: 'Pemilik UAT', email: 'owner@kepotret.test', permission_version: 1, permissions: { can_setup: false, can_moderate: true, can_export_zip: false }, joined_at: uatNow }) };
  }

  if (pathname === '/api/v1/guest/access/resolve') return { status: 200, body: envelope(makeGuestPreview(scenario)) };
  if (pathname === '/api/v1/guest/sessions') return { status: 201, body: envelope(makeGuestContext(scenario).guest_session) };
  if (pathname === '/api/v1/guest/me') return { status: 200, body: envelope(makeGuestContext(scenario)) };
  if (pathname === `/api/v1/albums/${uatIds.album}/capture-readiness`) {
    const state = scenario === 'waiting' ? 'WAITING' : scenario === 'closed' ? 'CLOSED' : 'READY';
    return { status: 200, body: envelope({ album_id: uatIds.album, state, can_capture: state === 'READY', server_time: uatNow, capture_start: uatCaptureStart, capture_end: uatCaptureEnd, reveal_at: dateLater, reveal_state: state === 'CLOSED' ? 'REVEALED' : 'HIDDEN', album_remaining_count: state === 'CLOSED' ? 0 : 76, guest_remaining_count: 10 }) };
  }
  if (pathname === '/api/v1/guest/gallery/photos') return { status: 200, body: list(scenario === 'empty' ? [] : [uatPhoto]) };
  if (pathname.startsWith('/api/v1/guest/gallery/photos/')) return { status: 200, body: envelope(uatPhoto) };

  if (pathname === '/api/v1/auth/me') return { status: 200, body: envelope({ user_id: uatIds.user, email: 'owner@kepotret.test', display_name: 'Pemilik UAT' }) };
  if (pathname === '/api/v1/admin/auth/me') return { status: 200, body: envelope(adminMe) };
  if (pathname === '/api/v1/admin/auth/step-up') return { status: 200, body: envelope({ verified_at: uatNow, expires_at: '2026-10-01T08:10:00Z' }) };
  if (pathname === `/api/v1/admin/albums/${uatIds.album}/sensitive-access-grants`) return { status: 201, body: envelope({ grant_id: 'owner-uat-grant', album_id: uatIds.album, reason: 'Synthetic Owner UAT review', expires_at: '2026-10-01T08:15:00Z', view_only: true }) };
  if (pathname === '/api/v1/admin/overview') return { status: 200, body: envelope({ total_users: 128, suspended_users: 2, total_albums: 46, draft_albums: 8, payment_pending_albums: 3, ready_albums: 21, committed_photos: 1280, reserved_photos: 12, pending_payments: 2, processing_payments: 1, successful_payments: 15, failed_payments: 1, open_issues: 4, acknowledged_issues: 2, active_holds: 1, generated_at: uatNow }) };
  if (pathname === '/api/v1/admin/users') return { status: 200, body: list(scenario === 'empty' ? [] : [userSummary]) };
  if (pathname === `/api/v1/admin/users/${uatIds.user}`) return { status: 200, body: envelope({ summary: userSummary, last_activity_at: uatNow }) };
  if (pathname === '/api/v1/admin/albums') return { status: 200, body: list(scenario === 'empty' ? [] : [{ album_id: uatIds.album, owner_user_id: uatIds.user, owner_email: 'owner@kepotret.test', event_name: uatEventName, readiness: 'READY', capture_state: 'OPEN', reveal_state: 'HIDDEN', retention_state: 'ACTIVE', capture_start: uatCaptureStart, capture_end: uatCaptureEnd, quota_total: 100, reserved_count: 2, committed_count: 24, hold_active: scenario === 'hold' }]) };
  if (pathname === `/api/v1/admin/albums/${uatIds.album}`) return { status: 200, body: envelope({ summary: { album_id: uatIds.album, owner_user_id: uatIds.user, owner_email: 'owner@kepotret.test', event_name: uatEventName, readiness: 'READY', capture_state: 'OPEN', reveal_state: 'HIDDEN', retention_state: 'ACTIVE', capture_start: uatCaptureStart, capture_end: uatCaptureEnd, quota_total: 100, reserved_count: 2, committed_count: 24, hold_active: scenario === 'hold' }, event_location: 'Jakarta', timezone: 'Asia/Jakarta', schedule: uatSchedule, lifecycle: null, entitlement: { album_id: uatIds.album, quota_total: 100, reserved_count: 2, committed_count: 24, payment_cutoff_at: uatSchedule.payment_cutoff_at }, payment_transactions: [makeTransaction('pending')], related_issues: [] }) };
  if (pathname === `/api/v1/admin/albums/${uatIds.album}/sensitive-media`) return { status: 200, body: list([]) };
  if (pathname === '/api/v1/admin/payments') return { status: 200, body: list([makeTransaction('pending')]) };
  if (pathname === `/api/v1/admin/payments/${uatIds.transaction}`) return { status: 200, body: envelope({ transaction: makeTransaction(scenario), receipt_diagnostics: [], entitlement: null, can_reconcile: true, last_reconciled_at: null }) };
  if (pathname === '/api/v1/admin/packages') return { status: 200, body: list([{ package_id: uatIds.package, code: 'PAKET-UAT', name: 'Paket Pesta UAT', versions: [{ package_version_id: uatIds.packageVersion, price_amount: 75000, currency: 'IDR', quota_total: 100, sale_enabled: true, effective_at: uatNow, retired_at: null }] }]) };
  if (pathname === '/api/v1/admin/event-categories') return { status: 200, body: list([{ category_id: uatIds.package, code: 'WEDDING', label_id: 'Pernikahan', label_en: 'Wedding', display_order: 1, active: true }]) };
  if (pathname === '/api/v1/admin/operational-configs') return { status: 200, body: list([{ config_key: 'maintenance_mode', typed_value: false, revision: 1, updated_at: uatNow }]) };
  if (pathname === '/api/v1/admin/issues') return { status: 200, body: list(scenario === 'empty' ? [] : [operationalIssue]) };
  if (pathname === `/api/v1/admin/issues/${uatIds.issue}`) return { status: 200, body: envelope(operationalIssue) };
  if (pathname === '/api/v1/admin/audit-logs') return { status: 200, body: list([{ audit_id: uatIds.issue, actor_type: 'ADMIN', actor_id: uatIds.user, album_id: uatIds.album, action: 'UAT_FIXTURE_VIEW', object_type: 'ALBUM', object_ref: uatIds.album, request_id: null, result: 'SUCCESS', safe_change_summary: 'Synthetic Owner UAT fixture entry.', created_at: uatNow }]) };
  if (pathname === `/api/v1/admin/audit-logs/${uatIds.issue}`) return { status: 200, body: envelope({ summary: { audit_id: uatIds.issue, actor_type: 'ADMIN', actor_id: uatIds.user, album_id: uatIds.album, action: 'UAT_FIXTURE_VIEW', object_type: 'ALBUM', object_ref: uatIds.album, request_id: null, result: 'SUCCESS', safe_change_summary: 'Synthetic Owner UAT fixture entry.', created_at: uatNow } }) };
  if (pathname === '/api/v1/admin/admins') return { status: 200, body: list([{ admin_user_id: uatIds.user, email: 'superadmin@kepotret.test', display_name: 'Superadmin UAT', grant_status: 'ACTIVE', granted_at: uatNow, revoked_at: null, last_session_at: uatNow }]) };

  if (pathname === '/api/v1/albums') return { status: 200, body: list(scenario === 'empty' ? [] : [albumSummary(scenario, scenario === 'collaborator')]) };
  if (pathname === '/api/v1/event-categories') return { status: 200, body: list([{ category_id: uatIds.package, code: 'WEDDING', label_id: 'Pernikahan', label_en: 'Wedding', display_order: 1, active: true }]) };
  if (pathname === '/api/v1/packages') return { status: 200, body: list([{ package_id: uatIds.package, package_version_id: uatIds.packageVersion, code: 'PAKET-UAT', name: 'Paket Pesta UAT', price_amount: 75000, currency: 'IDR', quota_total: 100 }]) };

  const albumMatch = pathname.match(new RegExp(`^/api/v1/albums/${uatIds.album}(?:/(.*))?$`));
  if (albumMatch) {
    const endpoint = albumMatch[1] ?? '';
    const live = scenario === 'live';
    if (!endpoint) return { status: 200, body: envelope(makeAlbum(scenario, scenario === 'collaborator')) };
    if (endpoint === 'live-overview') return { status: 200, body: envelope(makeLiveOverview(scenario, scenario === 'collaborator')) };
    if (endpoint === 'schedule') return { status: 200, body: envelope(uatSchedule) };
    if (endpoint === 'settings') return { status: 200, body: envelope(uatSettings) };
    if (endpoint === 'design') return { status: 200, body: envelope({ cover_asset_id: null, cover_preview: null, setup_revision: 3 }) };
    if (endpoint === 'review') return { status: 200, body: envelope({ album_id: uatIds.album, setup_revision: 3, complete: false, issues: [], snapshot: { event_basics: { event_name: uatEventName, event_location: 'Jakarta', event_category_id: uatIds.package, timezone: 'Asia/Jakarta' }, schedule: uatSchedule, access: { pin_enabled: false }, settings: { per_guest_limit: 30 }, design: { cover_asset_id: null, cover_preview: null, setup_revision: 3 }, selected_package_version_id: uatIds.packageVersion, collaborator_count: 1 } }) };
    if (endpoint === 'capture-readiness') return { status: 200, body: envelope({ album_id: uatIds.album, state: scenario === 'waiting' ? 'WAITING' : scenario === 'closed' ? 'CLOSED' : 'READY', can_capture: scenario !== 'waiting' && scenario !== 'closed', server_time: uatNow, capture_start: uatCaptureStart, capture_end: uatCaptureEnd, reveal_at: dateLater, reveal_state: scenario === 'closed' ? 'REVEALED' : 'HIDDEN', album_remaining_count: 76, guest_remaining_count: 10 }) };
    if (endpoint === 'package-options') return { status: 200, body: envelope({ album_id: uatIds.album, current_quota_total: live ? 100 : 30, reserved_count: 2, committed_count: 24, payment_cutoff_at: uatSchedule.payment_cutoff_at, server_time: uatNow, can_create_checkout: true, checkout_block_reason: null, active_checkout: null, options: [{ package_id: uatIds.package, package_version_id: uatIds.packageVersion, code: 'PAKET-UAT', name: 'Paket Pesta UAT', price_amount: 75000, currency: 'IDR', quota_total: 100 }] }) };
    if (endpoint === 'entitlement') return { status: 200, body: envelope({ album_id: uatIds.album, quota_total: 100, reserved_count: 2, committed_count: 24, payment_cutoff_at: uatSchedule.payment_cutoff_at }) };
    if (endpoint === 'lifecycle') return { status: 200, body: envelope({ album_id: uatIds.album, retention_state: scenario === 'recovery-media' ? 'RECOVERY' : 'ACTIVE', server_time: uatNow, recovery_access_granted_at: scenario === 'recovery-media' ? uatNow : null, normal_access_end_at: '2027-10-01T00:00:00Z', recovery_end_at: '2027-11-01T00:00:00Z', backup_cleanup_deadline_at: '2027-12-01T00:00:00Z' }) };
    if (endpoint === 'export-capabilities') return { status: 200, body: envelope({ can_export_all: true, can_export_selected: true, max_photos_per_job: 100, selection_revision: 1 }) };
    if (endpoint === 'activity') return { status: 200, body: list(scenario === 'empty' ? [] : [uatActivityItem]) };
    if (endpoint === 'photos' || endpoint === 'photos/trash') return { status: 200, body: list(scenario === 'empty' ? [] : [{ photo_id: uatIds.photo, moderation_status: 'APPROVED', created_at: uatNow, deleted_at: null, photographer_display_name: 'Ari UAT', like_count: 3, media: photoMedia, actions: { can_approve: false, can_hide: true, can_unhide: false, can_delete: true, can_download: true, can_share: true }, can_restore: true }]) };
    if (endpoint === `photos/${uatIds.photo}`) return { status: 200, body: envelope({ photo_id: uatIds.photo, moderation_status: 'APPROVED', created_at: uatNow, photographer_display_name: 'Ari UAT', like_count: 3, media: photoMedia, actions: { can_approve: false, can_hide: true, can_unhide: false, can_delete: true, can_download: true, can_share: true } }) };
    if (endpoint === 'collaborators') return { status: 200, body: list([{ user_id: uatIds.user, display_name: 'Kolaborator UAT', email: 'collaborator@kepotret.test', permission_version: 1, permissions: { can_setup: false, can_moderate: true, can_export_zip: false }, joined_at: uatNow }]) };
    if (endpoint === 'collaborator-invitations') return { status: 200, body: list([{ invitation_id: uatIds.invitation, email: 'invitee@kepotret.test', permissions: { can_setup: false, can_moderate: true, can_export_zip: false }, status: 'PENDING', created_at: uatNow, expires_at: '2026-10-08T08:00:00Z', accepted_at: null, revoked_at: null }]) };
    if (endpoint === 'sharing') return { status: 200, body: envelope({ url: `https://kepotret.test/j/${uatIds.link}`, can_rotate: true }) };
    if (endpoint === 'exports') return { status: 200, body: list([makeExportJob(scenario)]) };
    if (endpoint === 'recovery/photos') return { status: 200, body: list(scenario === 'empty' ? [] : [{ photo_id: uatIds.photo, created_at: uatNow, photographer_display_name: 'Ari UAT', media: photoMedia, can_download: true }]) };
    if (endpoint === 'payments') return { status: 200, body: list([makeTransaction(scenario)]) };
  }

  if (pathname === `/api/v1/payments/${uatIds.transaction}`) return { status: 200, body: envelope(makeTransaction(scenario)) };
  if (pathname === `/api/v1/exports/${uatIds.export}`) return { status: 200, body: envelope(makeExportJob(scenario)) };
  if (pathname === `/api/v1/admin/albums/${uatIds.album}/operational-hold`) {
    const active = scenario === 'hold';
    return { status: 200, body: envelope({ album_id: uatIds.album, active, reason: active ? 'Synthetic Owner UAT operational review' : null, created_at: active ? uatNow : null, released_at: null }) };
  }
  if (pathname.endsWith('/design-assets/upload-authorizations')) return { status: 201, body: envelope({ asset_id: uatIds.photo, upload_url: 'https://upload.test/owner-uat/design', expires_at: '2026-10-01T08:15:00Z', required_headers: { 'Content-Type': 'image/jpeg' } }) };
  if (pathname.endsWith('/upload-authorization')) return { status: 200, body: envelope({ upload_url: 'https://upload.test/owner-uat/capture', expires_at: '2026-10-01T08:15:00Z', object_key: 'synthetic/owner-uat/photo.jpg' }) };
  if (pathname.includes('/capture-attempts/')) return { status: 200, body: envelope({ attempt_id: uatIds.captureAttempt, album_id: uatIds.album, status: scenario === 'recovery-active' ? 'ACTIVE' : 'COMMITTED', expires_at: '2026-10-01T09:00:00Z', committed_at: uatNow }) };

  if (method !== 'GET') return { status: 200, body: envelope({ synthetic: true, accepted: true }) };
  return { status: 200, body: list([]) };
}

function makeExportJob(scenario: string) {
  const status = ['queued', 'running', 'ready', 'failed'].includes(scenario) ? scenario.toUpperCase() : 'QUEUED';
  return { export_job_id: uatIds.export, album_id: uatIds.album, status, mode: 'ALL', selected_count: 0, source_export_revision: 2, processed_count: status === 'RUNNING' ? 12 : status === 'READY' ? 24 : 0, total_count: 24, created_at: uatNow, updated_at: uatNow, output_expires_at: status === 'READY' ? '2026-10-02T08:00:00Z' : null };
}

export async function installUatApi(page: Page) {
  let requestCount = 0;
  await page.route('**/api/v1/**', async (route: Route) => {
    requestCount += 1;
    const request = route.request();
    const url = new URL(request.url());
    let scenario = 'normal';
    try { scenario = new URL(page.url()).searchParams.get('uat') ?? 'normal'; } catch { /* about:blank before app navigation */ }
    const result = requestFor(url.pathname, request.method(), scenario);
    await route.fulfill({ status: result.status, contentType: 'application/json', body: JSON.stringify(result.body) });
  });
  await page.route('https://upload.test/**', (route) => route.fulfill({ status: 200, body: 'synthetic UAT upload accepted' }));
  await page.route('https://media.test/**', (route) => {
    const body = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="960" height="720" fill="#d7dfc8"/><rect x="40" y="40" width="880" height="640" rx="30" fill="#fbf8ef"/><circle cx="220" cy="260" r="88" fill="#d6a66b"/><path d="M60 620 330 350l170 160 140-130 260 240Z" fill="#64826d"/><text x="480" y="690" font-size="24" text-anchor="middle" fill="#333">SYNTHETIC OWNER UAT PHOTO</text></svg>';
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body });
  });
  await page.addInitScript(() => {
    const badgeId = '__owner-visual-uat-badge';
    let badgeTimerScheduled = false;
    const addBadge = () => {
      if (!document.body || document.getElementById(badgeId)) return;
      const badge = document.createElement('div');
      badge.id = badgeId;
      badge.textContent = 'OWNER VISUAL UAT · SYNTHETIC FIXTURES';
      badge.setAttribute('aria-label', 'Owner Visual UAT synthetic fixtures');
      Object.assign(badge.style, { position: 'fixed', top: '8px', left: '8px', zIndex: '2147483647', padding: '6px 10px', borderRadius: '999px', background: '#172117', color: '#d8ff3d', font: '600 11px/1.2 system-ui,sans-serif', letterSpacing: '.04em', pointerEvents: 'none', boxShadow: '0 2px 10px #0004' });
      document.body.appendChild(badge);
    };
    // Add the badge after hydration so it cannot disturb React's first render.
    const afterLoad = () => {
      if (badgeTimerScheduled) return;
      badgeTimerScheduled = true;
      window.setTimeout(() => {
        badgeTimerScheduled = false;
        addBadge();
      }, 1000);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    new MutationObserver(() => {
      if (document.body && !document.getElementById(badgeId)) afterLoad();
    }).observe(document, { childList: true, subtree: true });

    // Chromium's fake-device/fake-UI launch flags provide a synthetic camera stream.
  });
  return { get requestCount() { return requestCount; } };
}
