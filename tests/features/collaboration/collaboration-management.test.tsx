import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const albumId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const invitationId = '33333333-3333-4333-8333-333333333333';
const collaborator = { user_id: userId, email: 'eo@example.com', display_name: 'Event Organizer', joined_at: '2026-09-01T00:00:00Z', permission_version: 8, permissions: { can_setup: false, can_moderate: true, can_export_zip: false } };
const invitation = (status: 'PENDING' | 'ACCEPTED') => ({ invitation_id: invitationId + (status === 'PENDING' ? '' : 'a'), email: `${status.toLowerCase()}@example.com`, status, created_at: '2026-09-01T00:00:00Z', expires_at: '2026-10-01T00:00:00Z', accepted_at: status === 'ACCEPTED' ? '2026-09-02T00:00:00Z' : null, revoked_at: null, permissions: { can_setup: true, can_moderate: false, can_export_zip: false } });
const renderId = (node: React.ReactNode) => render(<NextIntlClientProvider locale="id" messages={idMessages}>{node}</NextIntlClientProvider>);

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
});
