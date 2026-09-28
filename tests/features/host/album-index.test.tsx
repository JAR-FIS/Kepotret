import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listAlbums, getAlbum, getSettings, getCsrf, patchSettings, getInvitations, createInvitation, setPin } = vi.hoisted(() => ({ listAlbums: vi.fn(), getAlbum: vi.fn(), getSettings: vi.fn(), getCsrf: vi.fn(), patchSettings: vi.fn(), getInvitations: vi.fn(), createInvitation: vi.fn(), setPin: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1Albums: listAlbums, getApiV1AlbumsAlbumId: getAlbum, getApiV1AlbumsAlbumIdSettings: getSettings, getApiV1SecurityCsrf: getCsrf, patchApiV1AlbumsAlbumIdSettings: patchSettings, getApiV1AlbumsAlbumIdCollaboratorInvitations: getInvitations, postApiV1AlbumsAlbumIdCollaboratorInvitations: createInvitation, putApiV1AlbumsAlbumIdAccessPin: setPin }));

import { AlbumIndex } from '@/features/host/components/album-index';
import { AlbumOverview } from '@/features/host/components/album-overview';
import { GuestLimitForm } from '@/features/host/components/guest-limit-form';
import { CollaboratorSetup } from '@/features/host/components/collaborator-setup';
import { AccessPinForm } from '@/features/host/components/access-pin-form';
import idMessages from '@/messages/id.json';
import enMessages from '@/messages/en.json';
import type { AlbumDetail, AlbumSummary, InvitationSummary } from '@/lib/api/generated/index.schemas';

const draft: AlbumSummary = {
  album_id: '11111111-1111-4111-8111-111111111111',
  readiness: 'DRAFT', capture_state: 'NOT_STARTED', reveal_state: 'HIDDEN', setup_revision: 1, schedule_version: 0,
  event_name: null, timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, guest_count_final: null, quota_total: null, committed_count: null,
  actor_access: { relationship: 'OWNER', permission_version: 0, collaborator_permissions: null },
};
const readyAlbum: AlbumDetail = {
  ...draft, event_location: null, event_category_id: null, selected_package_version_id: null, readiness: 'READY', access_version: 1, export_revision: 1,
  confirmed_setup_revision: null, confirmed_schedule_version: null, confirmed_package_version_id: null, setup_confirmed_at: null, guest_count_final: 27,
};

function renderHost(node: React.ReactNode) {
  return render(<NextIntlClientProvider locale="id" messages={idMessages}>{node}</NextIntlClientProvider>);
}

describe('FE-3 Host album surfaces', () => {
  beforeEach(() => { listAlbums.mockReset(); getAlbum.mockReset(); getSettings.mockReset(); getCsrf.mockReset(); patchSettings.mockReset(); getInvitations.mockReset(); createInvitation.mockReset(); setPin.mockReset(); });

  it('shows an actionable empty dashboard state', async () => {
    listAlbums.mockResolvedValue({ status: 200, data: { data: [], meta: {} } });
    renderHost(<AlbumIndex dashboard />);
    expect(await screen.findByText('Buat album pertamamu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buat Album' })).toHaveAttribute('href', '/album/baru');
  });

  it('renders server lifecycle state in the album list', async () => {
    listAlbums.mockResolvedValue({ status: 200, data: { data: [draft], meta: {} } });
    renderHost(<AlbumIndex />);
    expect(await screen.findByText(draft.album_id)).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(draft.album_id) })).toHaveAttribute('href', `/album/${draft.album_id}`);
  });

  it('provides retry on recoverable album list failures', async () => {
    listAlbums.mockResolvedValueOnce({ status: 503, data: {} }).mockResolvedValueOnce({ status: 200, data: { data: [draft], meta: {} } });
    renderHost(<AlbumIndex />);
    expect(await screen.findByText('Album belum dapat dimuat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.getByText(draft.album_id)).toBeInTheDocument());
  });

  it('presents final participant count from album detail only', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: readyAlbum } });
    renderHost(<AlbumOverview albumId={readyAlbum.album_id} />);
    expect(await screen.findByText('27')).toBeInTheDocument();
    expect(getAlbum).toHaveBeenCalledWith(readyAlbum.album_id);
  });

  it('rehydrates the default and writes only the selected limit with the settings revision', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: { ...draft, quota_total: 100 } } });
    getSettings.mockResolvedValueOnce({ status: 200, data: { data: { revision: 7, per_guest_limit: 30 } } }).mockResolvedValueOnce({ status: 200, data: { data: { revision: 8, per_guest_limit: 100 } } });
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    patchSettings.mockResolvedValue({ status: 200, data: {} });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    expect(await screen.findByRole('radio', { name: /30/ })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: /100/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan batas' }));
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith(draft.album_id, { expected_revision: 7, per_guest_limit: 100 }, { headers: { 'X-CSRF-Token': 'csrf' } }));
    expect(screen.getByRole('radio', { name: /100/ })).toBeChecked();
    expect(await screen.findByText('Batas foto per peserta berhasil disimpan.')).toBeInTheDocument();
  });

  it('filters choices above the FREE30 album quota and preserves the saved choice', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: draft } });
    getSettings.mockResolvedValue({ status: 200, data: { data: { revision: 4, per_guest_limit: 10 } } });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    expect(await screen.findByRole('radio', { name: /^10 foto per sesi$/ })).toBeChecked();
    for (const value of [50, 70, 100]) expect(screen.getByRole('radio', { name: new RegExp(`^${value} foto per sesi$`) })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /30 foto per sesi/ })).toBeEnabled();
  });

  it('keeps the defined per-session maximum at 100 even for a 10,000-photo album', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: { ...draft, quota_total: 10_000 } } });
    getSettings.mockResolvedValue({ status: 200, data: { data: { revision: 4, per_guest_limit: 70 } } });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    expect(await screen.findByRole('radio', { name: /^70 foto per sesi$/ })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeEnabled();
  });

  it('formats the album quota using the active app locale', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: { ...draft, quota_total: 10_000 } } });
    getSettings.mockResolvedValue({ status: 200, data: { data: { revision: 4, per_guest_limit: 30 } } });
    const { rerender } = renderHost(<GuestLimitForm albumId={draft.album_id} />);
    expect(await screen.findByText(/10\.000 foto/)).toBeInTheDocument();

    rerender(<NextIntlClientProvider locale="en" messages={enMessages}><GuestLimitForm albumId={draft.album_id} /></NextIntlClientProvider>);
    expect(await screen.findByText(/10,000 photos/)).toBeInTheDocument();
  });

  it.each([409, 422, 429, 503])('shows a recoverable settings error for PATCH %s', async status => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: draft } });
    getSettings.mockResolvedValue({ status: 200, data: { data: { revision: 4, per_guest_limit: 30 } } });
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    patchSettings.mockResolvedValue({ status, data: {} });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    await screen.findByRole('radio', { name: /30/ });
    fireEvent.click(screen.getByRole('radio', { name: /^5 foto per sesi$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan batas' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(patchSettings).toHaveBeenCalledWith(draft.album_id, { expected_revision: 4, per_guest_limit: 5 }, { headers: { 'X-CSRF-Token': 'csrf' } });
    if (status === 409) expect(screen.getByRole('button', { name: 'Muat ulang pengaturan' })).toBeInTheDocument();
  });

  it.each([401, 403])('shows access state for settings GET %s', async status => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: draft } });
    getSettings.mockResolvedValue({ status, data: {} });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    expect(await screen.findByRole('heading')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it.each([401, 403])('shows access state for settings PATCH %s', async status => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: draft } });
    getSettings.mockResolvedValue({ status: 200, data: { data: { revision: 4, per_guest_limit: 30 } } });
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    patchSettings.mockResolvedValue({ status, data: {} });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    fireEvent.click(await screen.findByRole('radio', { name: /^5 foto per sesi$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan batas' }));
    expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
  });

  it('shows a retryable load error on network failure', async () => {
    getAlbum.mockRejectedValue(new Error('offline'));
    getSettings.mockResolvedValue({ status: 200, data: { data: { revision: 4, per_guest_limit: 30 } } });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    expect(await screen.findByRole('heading', { name: 'Pengaturan belum dapat dimuat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });

  it('submits collaborator permissions as independent contract flags without billing access', async () => {
    const invitation: InvitationSummary = { invitation_id: '22222222-2222-4222-8222-222222222222', email: 'planner@example.com', status: 'PENDING', created_at: '2026-09-27T00:00:00Z', expires_at: '2026-10-01T00:00:00Z', accepted_at: null, revoked_at: null, permissions: { can_setup: true, can_moderate: false, can_export_zip: true } };
    getInvitations.mockResolvedValue({ status: 200, data: { data: [], meta: { has_more: false } } });
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    createInvitation.mockResolvedValue({ status: 201, data: { data: invitation } });
    renderHost(<CollaboratorSetup albumId={draft.album_id} />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Email kolaborator' }), { target: { value: invitation.email } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Setup album' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ekspor ZIP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat undangan' }));
    await waitFor(() => expect(createInvitation).toHaveBeenCalledWith(draft.album_id, { email: invitation.email, can_setup: true, can_moderate: false, can_export_zip: true }, { headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf', 'Idempotency-Key': expect.any(String) }) }));
    expect(await screen.findByText(invitation.email)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /billing|payment|pembayaran/i })).not.toBeInTheDocument();
  });

  it('sets an optional album PIN through the generated endpoint and clears the sensitive input after success', async () => {
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    setPin.mockResolvedValue({ status: 200, data: { data: {} } });
    renderHost(<AccessPinForm albumId={draft.album_id} />);
    const input = screen.getByLabelText('PIN album');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.change(input, { target: { value: 'host-secret-pin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan PIN' }));
    await waitFor(() => expect(setPin).toHaveBeenCalledWith(draft.album_id, { pin: 'host-secret-pin' }, { headers: { 'X-CSRF-Token': 'csrf' } }));
    expect(await screen.findByText('PIN album berhasil disimpan.')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });
});
