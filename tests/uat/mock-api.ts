import type { Page, Route } from '@playwright/test';
import type { OperationalConfig, OperationalIssue } from '../../src/lib/api/generated/index.schemas';
import { uatCaptureEnd, uatCaptureStart, uatEventName, uatIds, uatNow } from './constants';
import { makeAlbum, makeGuestContext, makeGuestPreview, makeInvitationPreview, makeLiveOverview, makeTransaction, uatActivityItem, uatCategories, uatPackages, uatPhoto, uatSchedule, uatSettings } from './fixtures';

const envelope = (data: unknown) => ({ data });
const list = (data: unknown[]) => ({ data, meta: { has_more: false, next_cursor: null } });
const futureTime = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const dateLater = '2026-10-04T17:00:00Z';
const photoMedia = { url: 'https://media.test/owner-uat/photo.svg', expires_at: '2026-10-01T08:15:00Z' };
const adminMe = { admin_user_id: uatIds.user, email: 'superadmin@kepotret.test', display_name: 'Superadmin UAT', mfa_verified: true, session_expires_at: futureTime(60), step_up_expires_at: null };
const operationalIssue: OperationalIssue = { issue_id: uatIds.issue, status: 'OPEN', issue_type: 'PHOTO_PROCESSING', severity: 'MEDIUM', summary: 'Synthetic Owner UAT operational issue.', error_code: 'UAT_SYNTHETIC', related_entity_type: 'ALBUM', related_entity_id: uatIds.album, created_at: uatNow, acknowledged_at: null, resolved_at: null };
const operationalConfigs: OperationalConfig[] = [
  { config_key: 'synthetic_maintenance_notice', display_name: 'Synthetic maintenance notice', description: 'Synthetic editable boolean for Owner Visual UAT only.', editable: true, value_type: 'BOOLEAN', typed_value: false, version: 1, minimum: null, maximum: null, allowed_values: [true, false], updated_at: uatNow, updated_by_admin_user_id: null },
  { config_key: 'synthetic_locked_capacity', display_name: 'Synthetic locked capacity rule', description: 'A locked product-rule example, never editable in this harness.', editable: false, value_type: 'INTEGER', typed_value: 10000, version: 1, minimum: 1, maximum: 10000, allowed_values: null, updated_at: uatNow, updated_by_admin_user_id: null },
];
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

  if (pathname === `/api/v1/albums/${uatIds.album}/capture-readiness`) {
    const state = scenario === 'waiting' ? 'WAITING' : scenario === 'closed' || scenario === 'closed-revealed' ? 'CLOSED' : 'READY';
    return { status: 200, body: envelope({ album_id: uatIds.album, state, can_capture: state === 'READY', server_time: uatNow, capture_start: uatCaptureStart, capture_end: uatCaptureEnd, reveal_at: scenario === 'closed-revealed' ? uatNow : dateLater, reveal_state: scenario === 'closed-revealed' ? 'REVEALED' : 'HIDDEN', album_remaining_count: state === 'CLOSED' ? 0 : 76, guest_remaining_count: 10 }) };
  }
  if (pathname === '/api/v1/guest/gallery/photos' || pathname.startsWith('/api/v1/guest/gallery/photos/')) {
    if (!['revealed', 'empty', 'permissions-off', 'detail-denied', 'closed-revealed'].includes(scenario)) return { status: 403, body: { error: { code: 'GALLERY_NOT_AVAILABLE' } } };
    const photo = scenario === 'permissions-off' ? { ...uatPhoto, actions: { can_like: false, liked_by_me: false, can_download: false, can_share: false } } : uatPhoto;
    if (pathname === '/api/v1/guest/gallery/photos' && method === 'GET') return { status: 200, body: list(scenario === 'empty' ? [] : [photo]) };
    if (scenario === 'detail-denied' || scenario === 'empty') return { status: 403, body: { error: { code: 'PHOTO_NOT_AVAILABLE' } } };
    if (pathname === `/api/v1/guest/gallery/photos/${uatIds.photo}` && method === 'GET') return { status: 200, body: envelope(photo) };
    if (scenario === 'permissions-off') return { status: 403, body: { error: { code: 'ACTION_NOT_ALLOWED' } } };
    if (pathname === `/api/v1/guest/gallery/photos/${uatIds.photo}/like` && method === 'PUT') return { status: 200, body: envelope({ ...photo, like_count: 4, actions: { ...photo.actions, liked_by_me: true } }) };
    if (pathname === `/api/v1/guest/gallery/photos/${uatIds.photo}/download` && method === 'GET') return { status: 200, body: envelope({ url: 'https://media.test/owner-uat/photo.svg' }) };
    if (pathname === `/api/v1/guest/gallery/photos/${uatIds.photo}/share-link` && method === 'POST') return { status: 200, body: envelope({ url: 'https://kepotret.test/synthetic-owner-uat-photo' }) };
    return { status: 404, body: { error: { code: 'PHOTO_NOT_FOUND' } } };
  }

  if (pathname === '/api/v1/auth/me') return { status: 200, body: envelope({ user_id: uatIds.user, email: 'owner@kepotret.test', display_name: 'Pemilik UAT' }) };
  if (pathname === '/api/v1/admin/auth/me') return { status: 200, body: envelope(adminMe) };
  if (pathname === '/api/v1/admin/overview') return { status: 200, body: envelope({ total_users: 128, suspended_users: 2, total_albums: 46, draft_albums: 8, payment_pending_albums: 3, ready_albums: 21, committed_photos: 1280, reserved_photos: 12, pending_payments: 2, processing_payments: 1, successful_payments: 15, failed_payments: 1, open_issues: 4, acknowledged_issues: 2, active_holds: 1, generated_at: uatNow }) };
  if (pathname === '/api/v1/admin/users') return { status: 200, body: list(scenario === 'empty' ? [] : [userSummary]) };
  if (pathname === `/api/v1/admin/users/${uatIds.user}`) return { status: 200, body: envelope({ summary: userSummary, last_activity_at: uatNow }) };
  if (pathname === '/api/v1/admin/albums') return { status: 200, body: list(scenario === 'empty' ? [] : [{ album_id: uatIds.album, owner_user_id: uatIds.user, owner_email: 'owner@kepotret.test', event_name: uatEventName, readiness: 'READY', capture_state: 'OPEN', reveal_state: 'HIDDEN', retention_state: 'ACTIVE', capture_start: uatCaptureStart, capture_end: uatCaptureEnd, quota_total: 100, reserved_count: 2, committed_count: 24, hold_active: scenario === 'hold' }]) };
  if (pathname === `/api/v1/admin/albums/${uatIds.album}`) return { status: 200, body: envelope({ summary: { album_id: uatIds.album, owner_user_id: uatIds.user, owner_email: 'owner@kepotret.test', event_name: uatEventName, readiness: 'READY', capture_state: 'OPEN', reveal_state: 'HIDDEN', retention_state: 'ACTIVE', capture_start: uatCaptureStart, capture_end: uatCaptureEnd, quota_total: 100, reserved_count: 2, committed_count: 24, hold_active: scenario === 'hold' }, event_location: 'Jakarta', timezone: 'Asia/Jakarta', schedule: uatSchedule, lifecycle: null, entitlement: { album_id: uatIds.album, quota_total: 100, reserved_count: 2, committed_count: 24, payment_cutoff_at: uatSchedule.payment_cutoff_at }, payment_transactions: [makeTransaction('pending')], related_issues: [] }) };
  if (pathname === '/api/v1/admin/payments') return { status: 200, body: list([makeTransaction('pending')]) };
  if (pathname === `/api/v1/admin/payments/${uatIds.transaction}`) return { status: 200, body: envelope({ transaction: makeTransaction(scenario), receipt_diagnostics: [], entitlement: null, can_reconcile: true, last_reconciled_at: null }) };
  if (pathname === '/api/v1/admin/packages') return { status: 200, body: list(uatPackages.map((option) => ({ package_id: option.package_id, code: option.code, name: option.name, versions: [{ package_version_id: option.package_version_id, price_amount: option.price_amount, currency: option.currency, quota_total: option.quota_total, sale_enabled: true, effective_at: uatNow, retired_at: null }] }))) };
  if (pathname === '/api/v1/admin/event-categories') return { status: 200, body: list(uatCategories) };
  if (pathname === '/api/v1/admin/audit-logs') return { status: 200, body: list([{ audit_id: uatIds.issue, actor_type: 'ADMIN', actor_id: uatIds.user, album_id: uatIds.album, action: 'UAT_FIXTURE_VIEW', object_type: 'ALBUM', object_ref: uatIds.album, request_id: null, result: 'SUCCESS', safe_change_summary: 'Synthetic Owner UAT fixture entry.', created_at: uatNow }]) };
  if (pathname === `/api/v1/admin/audit-logs/${uatIds.issue}`) return { status: 200, body: envelope({ summary: { audit_id: uatIds.issue, actor_type: 'ADMIN', actor_id: uatIds.user, album_id: uatIds.album, action: 'UAT_FIXTURE_VIEW', object_type: 'ALBUM', object_ref: uatIds.album, request_id: null, result: 'SUCCESS', safe_change_summary: 'Synthetic Owner UAT fixture entry.', created_at: uatNow } }) };
  if (pathname === '/api/v1/admin/admins') return { status: 200, body: list([{ admin_user_id: uatIds.user, email: 'superadmin@kepotret.test', display_name: 'Superadmin UAT', grant_status: 'ACTIVE', granted_at: uatNow, revoked_at: null, last_session_at: uatNow }]) };

  if (pathname === '/api/v1/albums') return { status: 200, body: list(scenario === 'empty' ? [] : [albumSummary(scenario, scenario === 'collaborator')]) };
  if (pathname === '/api/v1/event-categories') return { status: 200, body: list(uatCategories) };
  if (pathname === '/api/v1/packages') return { status: 200, body: list(uatPackages) };

  const albumMatch = pathname.match(new RegExp(`^/api/v1/albums/${uatIds.album}(?:/(.*))?$`));
  if (albumMatch) {
    const endpoint = albumMatch[1] ?? '';
    const live = scenario === 'live';
    if (!endpoint) {
      const ready = ['live', 'scheduled', 'ended', 'collaborator'].includes(scenario);
      const album = makeAlbum(ready ? 'live' : 'draft', scenario === 'collaborator');
      if (scenario === 'scheduled') album.capture_state = 'NOT_STARTED';
      if (scenario === 'ended') album.capture_state = 'CLOSED';
      return { status: 200, body: envelope(album) };
    }
    if (endpoint === 'live-overview') {
      const overview = makeLiveOverview(scenario, scenario === 'collaborator');
      if (scenario === 'scheduled') overview.capture_state = 'NOT_STARTED';
      if (scenario === 'ended') overview.capture_state = 'CLOSED';
      return { status: 200, body: envelope(overview) };
    }
    if (endpoint === 'schedule') return { status: 200, body: envelope(uatSchedule) };
    if (endpoint === 'settings') return { status: 200, body: envelope(uatSettings) };
    if (endpoint === 'design') return { status: 200, body: envelope({ cover_asset_id: null, cover_preview: null, setup_revision: 3 }) };
    if (endpoint === 'review') return { status: 200, body: envelope({ album_id: uatIds.album, setup_revision: 3, complete: false, issues: [], snapshot: { event_basics: { event_name: uatEventName, event_location: 'Jakarta', event_category_id: uatCategories[0].category_id, timezone: 'Asia/Jakarta' }, schedule: uatSchedule, access: { pin_enabled: false }, settings: { per_guest_limit: 30 }, design: { cover_asset_id: null, cover_preview: null, setup_revision: 3 }, selected_package_version_id: uatIds.packageVersion, collaborator_count: 1 } }) };
    if (endpoint === 'capture-readiness') return { status: 200, body: envelope({ album_id: uatIds.album, state: scenario === 'waiting' ? 'WAITING' : scenario === 'closed' ? 'CLOSED' : 'READY', can_capture: scenario !== 'waiting' && scenario !== 'closed', server_time: uatNow, capture_start: uatCaptureStart, capture_end: uatCaptureEnd, reveal_at: dateLater, reveal_state: scenario === 'closed' ? 'REVEALED' : 'HIDDEN', album_remaining_count: 76, guest_remaining_count: 10 }) };
    if (endpoint === 'package-options') return { status: 200, body: envelope({ album_id: uatIds.album, current_quota_total: live ? 100 : 30, reserved_count: 2, committed_count: 24, payment_cutoff_at: uatSchedule.payment_cutoff_at, server_time: uatNow, can_create_checkout: true, checkout_block_reason: null, active_checkout: null, options: uatPackages.filter((option) => option.quota_total > (live ? 100 : 30)) }) };
    if (endpoint === 'entitlement') return { status: 200, body: envelope({ album_id: uatIds.album, quota_total: 100, reserved_count: 2, committed_count: 24, payment_cutoff_at: uatSchedule.payment_cutoff_at }) };
    if (endpoint === 'lifecycle') {
      const recovery = scenario === 'recovery-active' || scenario === 'recovery-media';
      return { status: 200, body: envelope({ album_id: uatIds.album, retention_state: recovery ? 'RECOVERY' : 'ACTIVE', server_time: uatNow, recovery_access_granted_at: recovery ? uatNow : null, normal_access_end_at: '2027-10-01T00:00:00Z', recovery_end_at: '2027-11-01T00:00:00Z', backup_cleanup_deadline_at: '2027-12-01T00:00:00Z', can_activate_recovery: false, can_open_recovery_media: recovery, can_create_recovery_export: recovery }) };
    }
    if (endpoint === 'export-capabilities') return { status: 200, body: envelope({ max_photos_per_job: 100, eligible_photo_count: 24, allow_all: true, allow_selected: true }) };
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
  if (pathname.endsWith('/design-assets/upload-authorizations')) return { status: 201, body: envelope({ asset_id: uatIds.photo, upload_url: 'https://upload.test/owner-uat/design', expires_at: '2026-10-01T08:15:00Z', required_headers: { 'Content-Type': 'image/jpeg' } }) };

  if (method !== 'GET') return { status: 200, body: envelope({ synthetic: true, accepted: true }) };
  return { status: 200, body: list([]) };
}

function makeExportJob(scenario: string) {
  const status = ['queued', 'running', 'ready', 'failed'].includes(scenario) ? scenario.toUpperCase() : 'QUEUED';
  return { export_job_id: uatIds.export, album_id: uatIds.album, status, mode: 'ALL', selected_count: 0, source_export_revision: 2, processed_count: status === 'RUNNING' ? 12 : status === 'READY' ? 24 : 0, total_count: 24, created_at: uatNow, updated_at: uatNow, output_expires_at: status === 'READY' ? '2026-10-02T08:00:00Z' : null };
}

export async function installUatApi(page: Page) {
  let requestCount = 0;
  const unmatchedGuestRequests: string[] = [];
  const captureRequests: string[] = [];
  let currentScenario = 'normal';
  let reservationCount = 0;
  let putCount = 0;
  let commitCount = 0;
  let guestJoined = false;
  let attemptStatus: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'COMMITTED' | null = null;
  let uploaded = false;
  let finishPendingSave: (() => void) | null = null;
  await page.exposeFunction('__ownerUatCompleteSave', () => { finishPendingSave?.(); });
  let pendingAdminMfa = false;
  let stepUpVerified = false;
  let grantActive = false;
  let grantExpiresAt = '';
  let holdActive = false;
  let holdInitialized = false;
  let holdReason = 'Synthetic Owner UAT operational review';
  let holdCreatedAt = uatNow;
  let configState = operationalConfigs.map((config) => ({ ...config }));
  let issueState = { ...operationalIssue };
  let syntheticCover: { cover_asset_id: string; cover_preview: { url: string; expires_at: string }; setup_revision: number } | null = null;
  let coverRevision = 3;
  await page.route('**/api/v1/**', async (route: Route) => {
    requestCount += 1;
    const request = route.request();
    const url = new URL(request.url());
    try { currentScenario = new URL(page.url()).searchParams.get('uat') ?? currentScenario; } catch { /* about:blank before app navigation */ }
    const scenario = currentScenario;
    const respond = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const denied = (status = 403) => respond(status, { error: { code: status === 429 ? 'RATE_LIMITED' : 'GUEST_ACCESS_DENIED' } });
    const path = url.pathname;
    const method = request.method();
    const guestRoute = new URL(page.url()).pathname;
    const guestLinkId = guestRoute.match(/^\/j\/([^/]+)/)?.[1];
    const knownSyntheticLink = guestLinkId !== undefined && /^uat-event(?:-waiting-(?:id|en))?$/.test(guestLinkId);
    const galleryEntry = guestRoute.startsWith(`/j/${uatIds.link}/galeri`);
    if (path === '/api/v1/guest/access/resolve' && method === 'POST') {
      const payload = request.postDataJSON() as { link_id?: string; access_secret?: string };
      if (!knownSyntheticLink || payload.link_id !== guestLinkId || payload.access_secret !== 'synthetic-owner-uat-secret') { await denied(); return; }
      await respond(200, envelope(makeGuestPreview(scenario))); return;
    }
    if (path === '/api/v1/guest/sessions' && method === 'POST') {
      const payload = request.postDataJSON() as { link_id?: string; access_secret?: string; display_name?: string; accepted_consent_version?: string };
      if (!knownSyntheticLink || payload.link_id !== guestLinkId || payload.access_secret !== 'synthetic-owner-uat-secret' || !payload.display_name?.trim() || payload.accepted_consent_version !== 'owner-uat-photo-consent-v1' || !request.headers()['idempotency-key']) { await denied(); return; }
      guestJoined = true;
      await respond(201, envelope(makeGuestContext(scenario).guest_session)); return;
    }
    if (path === '/api/v1/guest/me') {
      if (scenario === 'unauthorized') { await denied(401); return; }
      if (scenario === 'denied') { await denied(403); return; }
      if (scenario === 'expired') { await denied(410); return; }
      if (!guestJoined && !galleryEntry) { await denied(401); return; }
      await respond(200, envelope(makeGuestContext(scenario))); return;
    }
    if (path === `/api/v1/albums/${uatIds.album}/capture-attempts` && method === 'POST') {
      captureRequests.push('reserve');
      if (scenario === 'reservation-denied') { await denied(403); return; }
      if (scenario === 'reservation-rate-limit') { await denied(429); return; }
      if (!guestJoined || request.headers()['x-csrf-token'] !== 'owner-uat-csrf' || !request.headers()['idempotency-key']) { await denied(); return; }
      reservationCount += 1;
      attemptStatus = 'ACTIVE';
      uploaded = false;
      await respond(201, envelope({ attempt_id: uatIds.captureAttempt, album_id: uatIds.album, status: 'ACTIVE', expires_at: '2026-10-01T17:00:00Z' }));
      return;
    }
    const attemptPath = path.match(/^\/api\/v1\/capture-attempts\/([^/]+)(?:\/(upload-authorization|release|commit))?$/);
    if (attemptPath) {
      const [, attemptId, action] = attemptPath;
      captureRequests.push(action ?? 'status');
      if (!guestJoined || attemptId !== uatIds.captureAttempt || !attemptStatus) { await denied(404); return; }
      if (scenario === 'reservation-expired' && !action) attemptStatus = 'EXPIRED';
      if (action && request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      const stateBody = () => envelope({ attempt_id: attemptId, album_id: uatIds.album, status: attemptStatus, expires_at: '2026-10-01T17:00:00Z', ...(attemptStatus === 'COMMITTED' ? { committed_at: uatNow } : {}) });
      if (!action && method === 'GET') { await respond(200, stateBody()); return; }
      if (action === 'release' && method === 'POST') {
        if (attemptStatus === 'ACTIVE') attemptStatus = 'RELEASED';
        await respond(200, stateBody()); return;
      }
      if (action === 'upload-authorization' && method === 'POST') {
        if (scenario === 'upload-denied') { await denied(403); return; }
        if (scenario === 'upload-rate-limit') { await denied(429); return; }
        const payload = request.postDataJSON() as { content_type?: string; size_bytes?: number };
        if (attemptStatus !== 'ACTIVE' || payload.content_type !== 'image/jpeg' || !Number.isInteger(payload.size_bytes) || payload.size_bytes! > 700_000 || payload.size_bytes! <= 0) { await denied(); return; }
        await respond(200, envelope({ upload_url: 'https://upload.test/owner-uat/capture', expires_at: '2026-10-01T17:00:00Z', object_key: 'synthetic/owner-uat/photo.jpg' })); return;
      }
      if (action === 'commit' && method === 'POST') {
        commitCount += 1;
        if (scenario === 'save-fail-commit' && commitCount === 1) { await respond(503, { error: { code: 'SYNTHETIC_COMMIT_FAILURE' } }); return; }
        if (attemptStatus !== 'ACTIVE' || !uploaded) { await denied(); return; }
        attemptStatus = 'COMMITTED';
        await respond(201, stateBody()); return;
      }
      unmatchedGuestRequests.push(`${method} ${path}`);
      await respond(501, { error: { code: 'UNMATCHED_GUEST_FIXTURE' } }); return;
    }
    if (path.startsWith('/api/v1/guest/gallery/')) {
      if (scenario === 'unauthorized') { await denied(401); return; }
      if (scenario === 'denied') { await denied(); return; }
      if (scenario === 'expired') { await denied(410); return; }
      if (!galleryEntry && !guestJoined) { await denied(401); return; }
      if ((method === 'PUT' || method === 'POST') && request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
    }
    if (url.pathname === '/api/v1/admin/auth/login' && request.method() === 'POST') {
      const credentials = request.postDataJSON() as { email?: string; password?: string };
      const csrfValid = request.headers()['x-csrf-token'] === 'owner-uat-csrf';
      const authorized = credentials.email === adminMe.email && credentials.password === 'synthetic-uat-password';
      pendingAdminMfa = csrfValid && authorized;
      const status = !csrfValid ? 403 : authorized ? 202 : 401;
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 202 ? envelope({}) : { error: { code: status === 403 ? 'CSRF_INVALID' : 'INVALID_CREDENTIALS' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/auth/mfa/verify' && request.method() === 'POST') {
      const code = (request.postDataJSON() as { totp_code?: string }).totp_code;
      const status = request.headers()['x-csrf-token'] !== 'owner-uat-csrf' ? 403 : !pendingAdminMfa ? 404 : code === '123456' ? 200 : 401;
      if (status === 200) pendingAdminMfa = false;
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? envelope(adminMe) : { error: { code: status === 403 ? 'CSRF_INVALID' : status === 404 ? 'MFA_CHALLENGE_MISSING' : 'MFA_CODE_INVALID' } }) });
      return;
    }
    if (path === '/api/v1/admin/auth/step-up' && method === 'POST') {
      stepUpVerified = false;
      const code = (request.postDataJSON() as { totp_code?: string }).totp_code;
      if (request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      if (!code || !/^[0-9]{6,12}$/.test(code)) { await respond(422, { error: { code: 'INVALID_CODE' } }); return; }
      stepUpVerified = true;
      await respond(200, envelope({ verified_at: new Date().toISOString(), expires_at: futureTime(10) })); return;
    }
    if (path === `/api/v1/admin/albums/${uatIds.album}/sensitive-access-grants` && method === 'POST') {
      const reason = (request.postDataJSON() as { reason?: string }).reason?.trim();
      if (!stepUpVerified || request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      stepUpVerified = false;
      if (!reason) { await respond(422, { error: { code: 'REASON_REQUIRED' } }); return; }
      grantActive = true;
      grantExpiresAt = futureTime(15);
      await respond(201, envelope({ grant_id: 'owner-uat-grant', album_id: uatIds.album, reason, expires_at: grantExpiresAt, view_only: true })); return;
    }
    if (path === '/api/v1/admin/sensitive-access-grants/owner-uat-grant' && method === 'DELETE') {
      if (!stepUpVerified || request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      stepUpVerified = false;
      if (!grantActive) { await denied(404); return; }
      grantActive = false;
      await respond(200, envelope({ grant_id: 'owner-uat-grant', album_id: uatIds.album, reason: 'Synthetic Owner UAT review', expires_at: grantExpiresAt, view_only: true })); return;
    }
    if (path === `/api/v1/admin/albums/${uatIds.album}/sensitive-media` && method === 'GET') {
      if (!grantActive || Date.parse(grantExpiresAt) <= Date.now() || url.searchParams.get('grant_id') !== 'owner-uat-grant') { await denied(410); return; }
      await respond(200, list(scenario === 'empty' ? [] : [{ photo_id: uatIds.photo, created_at: uatNow, media: { url: 'https://media.test/owner-uat/photo.svg', expires_at: futureTime(10) } }])); return;
    }
    if (path === `/api/v1/admin/albums/${uatIds.album}/operational-hold`) {
      if (!holdInitialized) { holdActive = scenario === 'hold'; holdInitialized = true; }
      if (method === 'GET') {
        if (scenario === 'error') { await denied(503); return; }
        await respond(200, envelope({ album_id: uatIds.album, active_hold: holdActive ? { hold_id: 'owner-uat-hold', album_id: uatIds.album, reason: holdReason, created_at: holdCreatedAt, released_at: null } : null })); return;
      }
      const reason = (request.postDataJSON() as { reason?: string }).reason?.trim();
      if (!stepUpVerified || request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      stepUpVerified = false;
      if (!reason) { await respond(422, { error: { code: 'REASON_REQUIRED' } }); return; }
      if ((method === 'POST' && holdActive) || (method === 'DELETE' && !holdActive)) { await denied(409); return; }
      holdActive = method === 'POST';
      holdReason = reason;
      if (holdActive) holdCreatedAt = new Date().toISOString();
      await respond(200, envelope({ hold_id: 'owner-uat-hold', album_id: uatIds.album, reason, created_at: holdCreatedAt, released_at: holdActive ? null : new Date().toISOString() })); return;
    }
    if (path === `/api/v1/admin/packages/${uatIds.package}/versions` && method === 'POST') {
      if (request.headers()['x-csrf-token'] !== 'owner-uat-csrf' || !request.headers()['idempotency-key']) { await denied(); return; }
      const body = request.postDataJSON() as { price_amount?: number; currency?: string; quota_total?: number };
      if (!Number.isSafeInteger(body.price_amount) || body.price_amount! < 0 || body.currency !== 'IDR' || !Number.isInteger(body.quota_total) || body.quota_total! < 1 || body.quota_total! > 10000) { await respond(422, { error: { code: 'SYNTHETIC_VALIDATION' } }); return; }
      await respond(201, envelope({ package_version_id: uatIds.createdPackageVersion, price_amount: body.price_amount, currency: 'IDR', quota_total: body.quota_total, sale_enabled: false, effective_at: uatNow, retired_at: null })); return;
    }
    if (path === '/api/v1/admin/operational-configs' && method === 'GET') { await respond(200, list(configState)); return; }
    const configMatch = path.match(/^\/api\/v1\/admin\/operational-configs\/([^/]+)$/);
    if (configMatch && method === 'PATCH') {
      if (request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      const config = configState.find((item) => item.config_key === decodeURIComponent(configMatch[1]));
      if (!config || !config.editable) { await denied(); return; }
      const body = request.postDataJSON() as { expected_version?: number; typed_value?: unknown };
      if (body.expected_version !== config.version) { await respond(409, { error: { code: 'VERSION_CONFLICT' } }); return; }
      if (typeof body.typed_value !== 'boolean') { await respond(422, { error: { code: 'SYNTHETIC_VALIDATION' } }); return; }
      const updated = { ...config, typed_value: body.typed_value, version: config.version + 1, updated_at: uatNow, updated_by_admin_user_id: uatIds.user };
      configState = configState.map((item) => item.config_key === config.config_key ? updated : item);
      await respond(200, envelope(updated)); return;
    }
    if (path === '/api/v1/admin/issues' && method === 'GET') {
      const status = url.searchParams.get('status');
      await respond(200, list(scenario === 'empty' || status && status !== issueState.status ? [] : [issueState])); return;
    }
    if (path === `/api/v1/admin/issues/${uatIds.issue}` && method === 'GET') { await respond(200, envelope(issueState)); return; }
    if (path === `/api/v1/admin/issues/${uatIds.issue}/acknowledge` && method === 'POST') {
      if (request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      if (issueState.status !== 'OPEN') { await respond(409, { error: { code: 'ISSUE_STATE_CONFLICT' } }); return; }
      issueState = { ...issueState, status: 'ACKNOWLEDGED', acknowledged_at: uatNow };
      await respond(200, envelope(issueState)); return;
    }
    if (path === `/api/v1/admin/issues/${uatIds.issue}/resolve` && method === 'POST') {
      if (request.headers()['x-csrf-token'] !== 'owner-uat-csrf') { await denied(); return; }
      const reason = (request.postDataJSON() as { reason?: string }).reason?.trim();
      if (!reason || reason.length > 500) { await respond(422, { error: { code: 'SYNTHETIC_VALIDATION' } }); return; }
      if (issueState.status === 'RESOLVED') { await respond(409, { error: { code: 'ISSUE_STATE_CONFLICT' } }); return; }
      issueState = { ...issueState, status: 'RESOLVED', resolved_at: uatNow };
      await respond(200, envelope(issueState)); return;
    }
    if (url.pathname === `/api/v1/albums/${uatIds.album}/design`) {
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON() as { cover_asset_id?: string | null };
        coverRevision += 1;
        syntheticCover = body.cover_asset_id ? { cover_asset_id: body.cover_asset_id, cover_preview: { url: 'https://media.test/owner-uat/cover.svg', expires_at: '2026-10-01T08:15:00Z' }, setup_revision: coverRevision } : null;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(syntheticCover ?? { cover_asset_id: null, cover_preview: null, setup_revision: coverRevision })) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(syntheticCover ?? { cover_asset_id: null, cover_preview: null, setup_revision: coverRevision })) });
      return;
    }
    if (path.startsWith('/api/v1/guest/') && !['/api/v1/guest/access/resolve', '/api/v1/guest/sessions', '/api/v1/guest/me'].includes(path) && !path.startsWith('/api/v1/guest/gallery/')) {
      unmatchedGuestRequests.push(`${method} ${path}`);
      await respond(501, { error: { code: 'UNMATCHED_GUEST_FIXTURE' } }); return;
    }
    if (path.includes('/capture-attempts')) {
      unmatchedGuestRequests.push(`${method} ${path}`);
      await respond(501, { error: { code: 'UNMATCHED_GUEST_FIXTURE' } }); return;
    }
    const result = requestFor(path, method, scenario);
    if (path === '/api/v1/admin/albums' && method === 'GET' && result.status === 200) {
      const query = url.searchParams.get('query')?.trim().toLocaleLowerCase() ?? '';
      if (query) {
        const albums = (result.body as { data: Array<{ event_name: string | null; owner_email: string }> }).data;
        const matches = albums.filter((album) => [album.event_name ?? '', album.owner_email].some((value) => value.toLocaleLowerCase().includes(query)));
        await respond(200, list(matches)); return;
      }
    }
    await route.fulfill({ status: result.status, contentType: 'application/json', body: JSON.stringify(result.body) });
  });
  await page.route('https://upload.test/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/owner-uat/design') {
      await route.fulfill({ status: 200, body: 'synthetic UAT design upload accepted' });
      return;
    }
    putCount += 1;
    if (currentScenario === 'save-pending') {
      const pending = new Promise<void>((resolve) => { finishPendingSave = resolve; });
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.id = '__owner-uat-finish-save';
        button.type = 'button';
        button.textContent = 'SYNTHETIC UAT · Complete save';
        button.setAttribute('aria-label', 'Synthetic UAT: complete save');
        Object.assign(button.style, { position: 'fixed', bottom: '12px', right: '12px', zIndex: '2147483647', minHeight: '44px', padding: '8px 14px', borderRadius: '999px', background: '#172117', color: '#d8ff3d', font: '600 12px system-ui,sans-serif', cursor: 'pointer' });
        button.addEventListener('click', () => {
          void (window as unknown as { __ownerUatCompleteSave: () => Promise<void> }).__ownerUatCompleteSave();
          button.remove();
        }, { once: true });
        document.body.append(button);
      });
      await pending;
      finishPendingSave = null;
    }
    if (currentScenario === 'save-fail-put' && putCount === 1) { await route.fulfill({ status: 503, body: 'synthetic upload failure' }); return; }
    if (route.request().method() !== 'PUT' || route.request().headers()['content-type'] !== 'image/jpeg' || !attemptStatus || attemptStatus !== 'ACTIVE') { await route.fulfill({ status: 403 }); return; }
    uploaded = true;
    await route.fulfill({ status: 200, body: 'synthetic UAT upload accepted' });
  });
  await page.route('https://media.test/**', (route) => {
    if (new URL(page.url()).pathname.startsWith('/j/') && !['revealed', 'permissions-off', 'detail-denied', 'closed-revealed'].includes(currentScenario)) return route.fulfill({ status: 403 });
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
  return { get requestCount() { return requestCount; }, captureRequests, unmatchedGuestRequests, get reservationCount() { return reservationCount; }, get putCount() { return putCount; }, get commitCount() { return commitCount; } };
}
