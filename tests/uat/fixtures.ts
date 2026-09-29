import type {
  AlbumDetail,
  AlbumLiveOverview,
  AlbumSchedule,
  AlbumSettings,
  GuestAccessPreview,
  GuestContext,
  GuestGalleryPhoto,
  PaymentTransaction,
} from '../../src/lib/api/generated/index.schemas';
import { uatCaptureEnd, uatCaptureStart, uatEventName, uatIds, uatNow } from './constants';

export function makeAlbum(scenario: string, collaborator = false): AlbumDetail {
  const live = scenario === 'live';
  return {
    album_id: uatIds.album,
    actor_access: { relationship: collaborator ? 'COLLABORATOR' : 'OWNER', permission_version: 1, collaborator_permissions: collaborator ? { can_setup: false, can_moderate: true, can_export_zip: false } : null },
    event_name: uatEventName,
    event_location: 'Jakarta',
    event_category_id: null,
    timezone: 'Asia/Jakarta',
    capture_start: uatCaptureStart,
    capture_end: uatCaptureEnd,
    selected_package_version_id: uatIds.packageVersion,
    readiness: live ? 'READY' : 'DRAFT',
    capture_state: live ? 'OPEN' : 'NOT_STARTED',
    reveal_state: 'HIDDEN',
    setup_revision: 3,
    schedule_version: 1,
    access_version: 1,
    export_revision: 2,
    confirmed_setup_revision: live ? 3 : null,
    confirmed_schedule_version: live ? 1 : null,
    confirmed_package_version_id: live ? uatIds.packageVersion : null,
    setup_confirmed_at: live ? '2026-09-20T09:00:00Z' : null,
    guest_count_final: null,
    quota_total: live ? 100 : null,
    committed_count: live ? 24 : 0,
  };
}

export const uatSchedule: AlbumSchedule = {
  capture_start: uatCaptureStart,
  capture_end: uatCaptureEnd,
  reveal_delay_days: 3,
  reveal_at: '2026-10-04T17:00:00Z',
  payment_cutoff_at: '2026-10-01T15:00:00Z',
  timezone: 'Asia/Jakarta',
  server_time: uatNow,
  can_reschedule: true,
  earliest_capture_start: null,
  latest_capture_start: null,
  schedule_version: 1,
};

export const uatSettings: AlbumSettings = {
  revision: 2,
  visibility: 'GUEST',
  moderation_mode: 'APPROVAL',
  likes_enabled: true,
  downloads_enabled: true,
  share_enabled: true,
  per_guest_limit: 30,
};

export function makeLiveOverview(scenario: string, collaborator = false): AlbumLiveOverview {
  const album = makeAlbum(scenario === 'live' ? 'live' : 'draft', collaborator);
  return {
    album_id: uatIds.album,
    server_time: uatNow,
    event_name: uatEventName,
    event_location: 'Jakarta',
    timezone: 'Asia/Jakarta',
    readiness: 'READY',
    capture_state: 'OPEN',
    reveal_state: 'HIDDEN',
    capture_start: uatCaptureStart,
    capture_end: uatCaptureEnd,
    reveal_at: '2026-10-04T17:00:00Z',
    quota_total: 100,
    committed_count: 24,
    reserved_current_count: 2,
    live_guest_session_count: 7,
    guest_count_final: null,
    actor_access: album.actor_access,
  };
}

export function makeGuestPreview(scenario: string): GuestAccessPreview {
  return {
    album_id: uatIds.album,
    event_name: uatEventName,
    event_location: 'Jakarta',
    timezone: 'Asia/Jakarta',
    capture_start: uatCaptureStart,
    capture_end: uatCaptureEnd,
    reveal_at: '2026-10-04T17:00:00Z',
    capture_state: 'OPEN',
    reveal_state: 'HIDDEN',
    pin_required: scenario === 'pin',
    consent_version: 'owner-uat-photo-consent-v1',
  };
}

export function makeGuestContext(scenario: string): GuestContext {
  const closed = scenario === 'closed';
  return {
    guest_session: {
      guest_session_id: uatIds.guestSession,
      album_id: uatIds.album,
      display_name: 'Tamu UAT',
      created_at: uatNow,
    },
    event: {
      album_id: uatIds.album,
      event_name: uatEventName,
      event_location: 'Jakarta',
      timezone: 'Asia/Jakarta',
      capture_start: uatCaptureStart,
      capture_end: uatCaptureEnd,
      reveal_at: '2026-10-04T17:00:00Z',
      capture_state: closed ? 'CLOSED' : 'OPEN',
      reveal_state: closed ? 'REVEALED' : 'HIDDEN',
    },
  };
}

export const uatPhoto: GuestGalleryPhoto = {
  photo_id: uatIds.photo,
  created_at: '2026-10-01T10:30:00Z',
  photographer_display_name: 'Ari UAT',
  like_count: 3,
  media: { url: 'https://media.test/owner-uat/photo.svg', expires_at: '2026-10-01T08:15:00Z' },
  actions: { can_like: true, liked_by_me: false, can_download: true, can_share: true },
};

export function makeTransaction(scenario: string): PaymentTransaction {
  const status = scenario === 'success' ? 'SUCCESS' : scenario === 'failure' ? 'FAILURE' : 'PENDING';
  return {
    transaction_id: uatIds.transaction,
    album_id: uatIds.album,
    type: 'INITIAL_PURCHASE',
    status,
    package_version_id: uatIds.packageVersion,
    package_name_snapshot: 'Paket Pesta UAT',
    target_quota_total_snapshot: 100,
    amount: 75000,
    currency: 'IDR',
    payment_cutoff_at: '2026-10-01T15:00:00Z',
    provider_expires_at: '2026-10-01T10:00:00Z',
    created_at: uatNow,
    paid_at: status === 'SUCCESS' ? uatNow : null,
  };
}
