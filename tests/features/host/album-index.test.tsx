import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listAlbums, getAlbum, getCsrf, patchSettings, getInvitations, createInvitation, setPin } = vi.hoisted(() => ({ listAlbums: vi.fn(), getAlbum: vi.fn(), getCsrf: vi.fn(), patchSettings: vi.fn(), getInvitations: vi.fn(), createInvitation: vi.fn(), setPin: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1Albums: listAlbums, getApiV1AlbumsAlbumId: getAlbum, getApiV1SecurityCsrf: getCsrf, patchApiV1AlbumsAlbumIdSettings: patchSettings, getApiV1AlbumsAlbumIdCollaboratorInvitations: getInvitations, postApiV1AlbumsAlbumIdCollaboratorInvitations: createInvitation, putApiV1AlbumsAlbumIdAccessPin: setPin }));

import { AlbumIndex } from '@/features/host/components/album-index';
import { AlbumOverview } from '@/features/host/components/album-overview';
import { GuestLimitForm } from '@/features/host/components/guest-limit-form';
import { CollaboratorSetup } from '@/features/host/components/collaborator-setup';
import { AccessPinForm } from '@/features/host/components/access-pin-form';
import idMessages from '@/messages/id.json';
import type { AlbumDetail, AlbumSummary, InvitationSummary } from '@/lib/api/generated/index.schemas';

const draft: AlbumSummary = {
  album_id: '11111111-1111-4111-8111-111111111111',
  readiness: 'DRAFT', capture_state: 'NOT_STARTED', reveal_state: 'HIDDEN', setup_revision: 1, schedule_version: 0,
};
const readyAlbum: AlbumDetail = {
  ...draft, readiness: 'READY', access_version: 1, export_revision: 1, guest_count_final: 27,
};

function renderHost(node: React.ReactNode) {
  return render(<NextIntlClientProvider locale="id" messages={idMessages}>{node}</NextIntlClientProvider>);
}

describe('FE-3 Host album surfaces', () => {
  beforeEach(() => { listAlbums.mockReset(); getAlbum.mockReset(); getCsrf.mockReset(); patchSettings.mockReset(); getInvitations.mockReset(); createInvitation.mockReset(); setPin.mockReset(); });

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

  it('requires an explicit per-participant limit choice and writes the generated value with the current revision', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: draft } });
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    patchSettings.mockResolvedValue({ status: 200, data: {} });
    renderHost(<GuestLimitForm albumId={draft.album_id} />);
    const select = await screen.findByRole('combobox', { name: 'Batas foto per peserta' });
    expect(Array.from((select as HTMLSelectElement).options).slice(1).map((option) => Number(option.value))).toEqual([5, 10, 30, 50, 70, 100]);
    expect(select).toHaveValue('');
    fireEvent.change(select, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan batas' }));
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith(draft.album_id, { expected_revision: 1, per_guest_limit: 100 }, { headers: { 'X-CSRF-Token': 'csrf' } }));
    expect(await screen.findByText('Batas foto per peserta berhasil disimpan.')).toBeInTheDocument();
  });

  it('submits collaborator permissions as independent contract flags without billing access', async () => {
    const invitation: InvitationSummary = { invitation_id: '22222222-2222-4222-8222-222222222222', email: 'planner@example.com', expires_at: '2026-10-01T00:00:00Z', permissions: { can_setup: true, can_moderate: false, can_export_zip: true } };
    getInvitations.mockResolvedValue({ status: 200, data: { data: [], meta: { has_more: false } } });
    getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    createInvitation.mockResolvedValue({ status: 201, data: { data: invitation } });
    renderHost(<CollaboratorSetup albumId={draft.album_id} />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Email kolaborator' }), { target: { value: invitation.email } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Setup album' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ekspor ZIP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat undangan' }));
    await waitFor(() => expect(createInvitation).toHaveBeenCalledWith(draft.album_id, { email: invitation.email, can_setup: true, can_moderate: false, can_export_zip: true }, { headers: { 'X-CSRF-Token': 'csrf' } }));
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
