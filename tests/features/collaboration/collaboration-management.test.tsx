import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ list: vi.fn(), patch: vi.fn(), revoke: vi.fn(), invitations: vi.fn(), revokeInvitation: vi.fn(), csrf: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumIdCollaborators: api.list,
  patchApiV1AlbumsAlbumIdCollaboratorsUserId: api.patch,
  deleteApiV1AlbumsAlbumIdCollaboratorsUserId: api.revoke,
  getApiV1AlbumsAlbumIdCollaboratorInvitations: api.invitations,
  postApiV1CollaboratorInvitationsInvitationIdRevoke: api.revokeInvitation,
  getApiV1SecurityCsrf: api.csrf,
}));
vi.mock('@/hooks/use-connectivity', () => ({ useConnectivity: () => true }));

import { OwnerCollaborators } from '@/features/collaboration/components/owner-collaborators';
import { InvitationHistory } from '@/features/collaboration/components/invitation-history';
import idMessages from '@/messages/id.json';
import enMessages from '@/messages/en.json';

const albumId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const invitationId = '33333333-3333-4333-8333-333333333333';
const collaborator = { user_id: userId, email: 'eo@example.com', display_name: 'Event Organizer', joined_at: '2026-09-01T00:00:00Z', permission_version: 8, permissions: { can_setup: false, can_moderate: true, can_export_zip: false } };
const invitation = (status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED', index = '') => ({ invitation_id: `${invitationId}${index}`, email: `${status.toLowerCase()}${index}@example.com`, status, created_at: '2026-09-01T00:00:00Z', expires_at: '2026-10-01T00:00:00Z', accepted_at: status === 'ACCEPTED' ? '2026-09-02T00:00:00Z' : null, revoked_at: status === 'REVOKED' ? '2026-09-03T00:00:00Z' : null, permissions: { can_setup: true, can_moderate: false, can_export_zip: false } });
const renderId = (node: React.ReactNode) => render(<NextIntlClientProvider locale="id" messages={idMessages}>{node}</NextIntlClientProvider>);
const listResponse = (rows = [collaborator]) => ({ status: 200, data: { data: rows, meta: { has_more: false, next_cursor: null } } });
const invitationsResponse = (rows: ReturnType<typeof invitation>[], hasMore = false, nextCursor: string | null = null) => ({ status: 200, data: { data: rows, meta: { has_more: hasMore, next_cursor: nextCursor } } });

describe('FE-7 collaborator management', () => {
  beforeEach(() => {
    for (const mock of Object.values(api)) mock.mockReset();
    api.csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
  });

  it('updates one independent capability with the current permission version', async () => {
    api.list.mockResolvedValue({ status: 200, data: { data: [collaborator], meta: { has_more: false, next_cursor: null } } });
    api.patch.mockResolvedValue({ status: 200, data: { data: { ...collaborator, permission_version: 9, permissions: { ...collaborator.permissions, can_export_zip: true } } } });
    renderId(<OwnerCollaborators albumId={albumId} />);
    const check = await screen.findByRole('checkbox', { name: /Mengekspor ZIP/ });
    fireEvent.click(check);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan izin' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(albumId, userId, { expected_permission_version: 8, can_setup: false, can_moderate: true, can_export_zip: true }, { headers: { 'X-CSRF-Token': 'csrf' } }));
    expect(await screen.findByText('Versi 9')).toBeInTheDocument();
  });

  it('offers revocation only for pending invitations', async () => {
    api.invitations.mockResolvedValue({ status: 200, data: { data: [invitation('PENDING'), invitation('ACCEPTED')], meta: { has_more: false, next_cursor: null } } });
    api.revokeInvitation.mockResolvedValue({ status: 200, data: { data: { ...invitation('PENDING'), status: 'REVOKED', revoked_at: '2026-09-28T00:00:00Z' } } });
    renderId(<InvitationHistory albumId={albumId} />);
    expect(await screen.findByText('Diterima')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cabut undangan' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cabut undangan' }));
    fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child') as HTMLButtonElement);
    await waitFor(() => expect(api.revokeInvitation).toHaveBeenCalledWith(invitationId, { headers: { 'X-CSRF-Token': 'csrf' } }));
  });

  it.each([401, 403, 404, 409, 422, 429])('maps H45 permission PATCH %s to its safe response state', async (status) => {
    api.list.mockResolvedValue(listResponse());
    api.patch.mockResolvedValue({ status, data: {} });
    renderId(<OwnerCollaborators albumId={albumId} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Mengekspor ZIP/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan izin' }));
    if (status === 401 || status === 403) {
      expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
    } else {
      const expected = status === 404 ? 'Kolaborator ini sudah tidak aktif.' : status === 409 ? 'Izin telah berubah. Nilai terbaru sudah dimuat.' : status === 422 ? 'Server menolak perubahan izin ini.' : 'Terlalu banyak permintaan. Coba lagi sebentar.';
      expect(await screen.findByRole('status')).toHaveTextContent(expected);
    }
  });

  it('requires confirmation before H45 membership deletion and uses the server result after success', async () => {
    api.list.mockResolvedValueOnce(listResponse()).mockResolvedValueOnce(listResponse([]));
    api.revoke.mockResolvedValue({ status: 200, data: { data: collaborator } });
    renderId(<OwnerCollaborators albumId={albumId} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cabut akses' }));
    expect(api.revoke).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cabut akses' }));
    await waitFor(() => expect(api.revoke).toHaveBeenCalledWith(albumId, userId, { headers: { 'X-CSRF-Token': 'csrf' } }));
    expect(await screen.findByText('Akses kolaborator dicabut.')).toBeInTheDocument();
    expect(screen.queryByText('Event Organizer')).not.toBeInTheDocument();
  });

  it('loads H45 cursor pages and refreshes the server permission version', async () => {
    const nextCollaborator = { ...collaborator, user_id: '44444444-4444-4444-8444-444444444444', email: 'next@example.com' };
    api.list.mockResolvedValueOnce({ status: 200, data: { data: [collaborator], meta: { has_more: true, next_cursor: 'cursor-1' } } })
      .mockResolvedValueOnce({ status: 200, data: { data: [nextCollaborator], meta: { has_more: false, next_cursor: null } } });
    renderId(<OwnerCollaborators albumId={albumId} />);
    await screen.findByText('Event Organizer');
    fireEvent.click(screen.getByRole('button', { name: 'Muat lainnya' }));
    expect(await screen.findByText('next@example.com')).toBeInTheDocument();
    expect(api.list).toHaveBeenNthCalledWith(2, albumId, { limit: 25, cursor: 'cursor-1' });
  });

  it.each([401, 403, 409, 429])('maps H45 membership DELETE %s to a safe state', async (status) => {
    api.list.mockResolvedValue(listResponse());
    api.revoke.mockResolvedValue({ status, data: {} });
    renderId(<OwnerCollaborators albumId={albumId} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cabut akses' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cabut akses' }));
    if (status === 401 || status === 403) {
      expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
    } else {
      expect(await screen.findByRole('status')).toHaveTextContent(status === 409 ? 'Izin telah berubah. Nilai terbaru sudah dimuat.' : 'Terlalu banyak permintaan. Coba lagi sebentar.');
    }
  });

  it('renders all H46 server states and gives revoke only to pending rows', async () => {
    api.invitations.mockResolvedValue(invitationsResponse([
      invitation('PENDING', '1'), invitation('ACCEPTED', '2'), invitation('REVOKED', '3'), invitation('EXPIRED', '4'),
    ]));
    renderId(<InvitationHistory albumId={albumId} />);
    for (const label of ['Tertunda', 'Diterima', 'Dicabut', 'Kedaluwarsa']) expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cabut undangan' })).toHaveLength(1);
  });

  it('loads H46 cursor pages using the server cursor', async () => {
    api.invitations.mockResolvedValueOnce(invitationsResponse([invitation('PENDING', '1')], true, 'cursor-1'))
      .mockResolvedValueOnce(invitationsResponse([invitation('EXPIRED', '2')]));
    renderId(<InvitationHistory albumId={albumId} />);
    await screen.findByText('pending1@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Muat lainnya' }));
    expect(await screen.findByText('expired2@example.com')).toBeInTheDocument();
    expect(api.invitations).toHaveBeenNthCalledWith(2, albumId, { limit: 25, cursor: 'cursor-1' });
  });

  it.each([401, 403])('shows the correct H46 list access state for GET %s', async (status) => {
    api.invitations.mockResolvedValue({ status, data: {} });
    renderId(<InvitationHistory albumId={albumId} />);
    expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
  });

  it.each([401, 403, 409, 422, 429])('maps H46 pending revoke %s to the correct result', async (status) => {
    api.invitations.mockResolvedValue(invitationsResponse([invitation('PENDING')]));
    api.revokeInvitation.mockResolvedValue({ status, data: {} });
    renderId(<InvitationHistory albumId={albumId} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cabut undangan' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cabut undangan' }));
    if (status === 401 || status === 403) {
      expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
    } else {
      const expected = status === 409 ? 'Status undangan berubah. Muat riwayat terbaru.' : status === 422 ? 'Server menolak tindakan ini.' : 'Terlalu banyak permintaan. Coba lagi sebentar.';
      expect(await screen.findByRole('status')).toHaveTextContent(expected);
    }
  });

  it('formats owner dates using the selected Indonesian and English app locales', async () => {
    api.list.mockResolvedValue(listResponse());
    const { rerender } = renderId(<OwnerCollaborators albumId={albumId} />);
    expect(await screen.findByText('Bergabung 1 Sep 2026')).toBeInTheDocument();
    api.invitations.mockResolvedValue(invitationsResponse([invitation('PENDING')]));
    rerender(<NextIntlClientProvider locale="en" messages={enMessages}><InvitationHistory albumId={albumId} /></NextIntlClientProvider>);
    expect(await screen.findByText(/Created Sep 1, 2026/)).toBeInTheDocument();
  });
});
