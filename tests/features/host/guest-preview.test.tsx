import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  album: vi.fn(), schedule: vi.fn(), design: vi.fn(), settings: vi.fn(),
  resolveGuestAccess: vi.fn(), createGuestSession: vi.fn(), createCaptureAttempt: vi.fn(),
  captureUpload: vi.fn(), captureCommit: vi.fn(), guestPhotos: vi.fn(),
}));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumId: api.album,
  getApiV1AlbumsAlbumIdSchedule: api.schedule,
  getApiV1AlbumsAlbumIdDesign: api.design,
  getApiV1AlbumsAlbumIdSettings: api.settings,
  postApiV1GuestAccessResolve: api.resolveGuestAccess,
  postApiV1GuestSessions: api.createGuestSession,
  postApiV1CaptureAttempts: api.createCaptureAttempt,
  postApiV1CaptureAttemptsAttemptIdUploadAuthorization: api.captureUpload,
  postApiV1CaptureAttemptsAttemptIdCommit: api.captureCommit,
  getApiV1GuestGalleryPhotos: api.guestPhotos,
}));

import { GuestPreview } from '@/features/host/components/guest-preview';
import messages from '@/messages/id.json';

const albumId = '11111111-1111-4111-8111-111111111111';
const previewUrl = 'https://media.test/short-lived-cover';

describe('H59 read-only guest experience simulator', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.album.mockResolvedValue({ status: 200, data: { data: {
      album_id: albumId, event_name: 'Preview event', event_location: 'Depok', timezone: 'Asia/Jakarta',
      capture_start: '2026-10-01T10:00:00Z', capture_end: '2026-10-02T10:00:00Z', readiness: 'READY',
      capture_state: 'OPEN', reveal_state: 'HIDDEN', reveal_state_at: null, guest_count_final: null,
      setup_revision: 3, schedule_version: 2, access_version: 1, export_revision: 0,
      confirmed_setup_revision: 3, confirmed_schedule_version: 2, confirmed_package_version_id: null,
      setup_confirmed_at: '2026-09-20T10:00:00Z', selected_package_version_id: null, event_category_id: null,
      quota_total: 30, committed_count: 4, actor_access: { relationship: 'OWNER', permission_version: null, collaborator_permissions: null },
    } } });
    api.schedule.mockResolvedValue({ status: 200, data: { data: {
      capture_start: '2026-10-01T10:00:00Z', capture_end: '2026-10-02T10:00:00Z', reveal_delay_days: 3,
      reveal_at: '2026-10-05T10:00:00Z', payment_cutoff_at: '2026-10-02T08:00:00Z', timezone: 'Asia/Jakarta',
      server_time: '2026-09-29T00:00:00Z', can_reschedule: false, earliest_capture_start: null, latest_capture_start: null,
      schedule_version: 2, first_confirmed_capture_start: null, first_confirmed_timezone: null, reschedule_cutoff_at: null,
    } } });
    api.design.mockResolvedValue({ status: 200, data: { data: { cover_asset_id: 'private-asset-id', cover_preview: { url: previewUrl, expires_at: '2026-09-30T00:00:00Z' }, setup_revision: 3 } } });
    api.settings.mockResolvedValue({ status: 200, data: { data: {
      revision: 3, visibility: 'GUEST', moderation_mode: 'APPROVAL', likes_enabled: true,
      downloads_enabled: false, share_enabled: true, per_guest_limit: 30,
    } } });
  });

  it('renders the safe cover, event, server capture/reveal phase, schedule and guest-facing settings', async () => {
    render(<NextIntlClientProvider locale="id" messages={messages}><GuestPreview albumId={albumId} /></NextIntlClientProvider>);
    expect(await screen.findByRole('region', { name: 'Pratinjau album untuk tamu' })).toBeInTheDocument();
    expect(screen.getByText('Pratinjau')).toBeInTheDocument();
    expect(screen.getByText('Preview event')).toBeInTheDocument();
    expect(screen.getByText('Depok')).toBeInTheDocument();
    expect(screen.getByAltText('Sampul album untuk pratinjau tamu')).toHaveAttribute('src', previewUrl);
    expect(screen.getByText('Pengambilan foto sedang berlangsung.')).toBeInTheDocument();
    expect(screen.getByText('Reveal terjadwal: 5 Okt 2026, 17.00')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('Foto peserta menunggu persetujuan Host.')).toBeInTheDocument();
    expect(screen.getByText('Tamu dapat menyukai foto.')).toBeInTheDocument();
    expect(screen.getByText('Unduh foto dinonaktifkan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka kamera' })).toBeDisabled();
  });

  it('uses only Host read projections and makes no Guest, PIN, capture, or gallery request', async () => {
    render(<NextIntlClientProvider locale="id" messages={messages}><GuestPreview albumId={albumId} /></NextIntlClientProvider>);
    expect(await screen.findByText('Preview event')).toBeInTheDocument();
    expect(api.album).toHaveBeenCalledWith(albumId);
    expect(api.schedule).toHaveBeenCalledWith(albumId);
    expect(api.design).toHaveBeenCalledWith(albumId);
    expect(api.settings).toHaveBeenCalledWith(albumId);
    expect(api.resolveGuestAccess).not.toHaveBeenCalled();
    expect(api.createGuestSession).not.toHaveBeenCalled();
    expect(api.createCaptureAttempt).not.toHaveBeenCalled();
    expect(api.captureUpload).not.toHaveBeenCalled();
    expect(api.captureCommit).not.toHaveBeenCalled();
    expect(api.guestPhotos).not.toHaveBeenCalled();
    expect(screen.getByRole('note')).toHaveTextContent(/tidak membuat sesi tamu/i);
  });
});
