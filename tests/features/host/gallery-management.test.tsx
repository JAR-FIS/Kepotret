import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagementPhoto, TrashPhoto } from '@/lib/api/generated/index.schemas';

const api = vi.hoisted(() => ({
  album: vi.fn(), list: vi.fn(), detail: vi.fn(), trash: vi.fn(), csrf: vi.fn(), approve: vi.fn(), hide: vi.fn(), unhide: vi.fn(), remove: vi.fn(), restore: vi.fn(), shareLink: vi.fn(), download: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumId: api.album,
  getApiV1AlbumsAlbumIdPhotos: api.list,
  getApiV1AlbumsAlbumIdPhotosPhotoId: api.detail,
  getApiV1AlbumsAlbumIdPhotosTrash: api.trash,
  getApiV1SecurityCsrf: api.csrf,
  postApiV1AlbumsAlbumIdPhotosPhotoIdApprove: api.approve,
  postApiV1AlbumsAlbumIdPhotosPhotoIdHide: api.hide,
  postApiV1AlbumsAlbumIdPhotosPhotoIdUnhide: api.unhide,
  deleteApiV1AlbumsAlbumIdPhotosPhotoId: api.remove,
  postApiV1AlbumsAlbumIdPhotosPhotoIdRestore: api.restore,
  postApiV1AlbumsAlbumIdPhotosPhotoIdShareLink: api.shareLink,
  getApiV1AlbumsAlbumIdPhotosPhotoIdDownload: api.download,
}));

import { AlbumGalleryManagement } from '@/features/host/components/gallery-management';
import messages from '@/messages/en.json';

const pendingPhoto: ManagementPhoto = {
  photo_id: 'photo-1', moderation_status: 'PENDING', created_at: '2026-09-27T00:00:00Z', photographer_display_name: 'Ari', like_count: 0,
  media: { url: 'https://media.test/photo-1', expires_at: '2026-09-27T00:05:00Z' },
  actions: { can_approve: true, can_hide: false, can_unhide: false, can_delete: true, can_download: false, can_share: false },
};
const deletedPhoto: TrashPhoto = {
  photo_id: 'deleted-1', moderation_status: 'PUBLISHED', created_at: '2026-09-27T00:00:00Z', deleted_at: '2026-09-28T00:00:00Z',
  photographer_display_name: 'Nia', media: null, can_restore: true,
};

function renderManager(props: { albumId: string; photoId?: string; trash?: boolean }) {
  return render(<NextIntlClientProvider locale="en" messages={messages}><AlbumGalleryManagement {...props} /></NextIntlClientProvider>);
}

describe('host gallery management', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.album.mockResolvedValue({ status: 200, data: { data: { actor_access: { relationship: 'OWNER', permission_version: 0, collaborator_permissions: null } } } });
    api.list.mockResolvedValue({ status: 200, data: { data: [pendingPhoto], meta: { has_more: false, next_cursor: null } } });
    api.detail.mockResolvedValue({ status: 200, data: { data: pendingPhoto } });
    api.trash.mockResolvedValue({ status: 200, data: { data: [], meta: { has_more: false, next_cursor: null } } });
    api.csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'host-csrf' } } });
    api.approve.mockResolvedValue({ status: 200, data: { data: pendingPhoto } });
    api.remove.mockResolvedValue({ status: 200, data: { data: pendingPhoto } });
  });

  it('shows only valid pending actions and protects moderation with CSRF', async () => {
    renderManager({ albumId: 'album-1' });
    expect(await screen.findByText('Ari')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unhide' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('album-1', 'photo-1', { headers: { 'X-CSRF-Token': 'host-csrf' } }));
  });

  it('explains that soft delete does not release quota', async () => {
    api.trash.mockResolvedValue({ status: 200, data: { data: [deletedPhoto], meta: { has_more: false, next_cursor: null } } });
    renderManager({ albumId: 'album-1', trash: true });
    expect(await screen.findByText(/continue to count toward album capacity/i)).toBeInTheDocument();
    expect(await screen.findByText('Nia')).toBeInTheDocument();
  });

  it('requires explicit confirmation before soft-delete and allows Cancel', async () => {
    renderManager({ albumId: 'album-1' });
    await screen.findByText('Ari');
    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
    expect(screen.getByRole('dialog', { name: 'Move photo to Trash?' })).toHaveTextContent(/does not free album photo capacity/i);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Move photo to Trash?' })).getByRole('button', { name: 'Delete photo' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('album-1', 'photo-1', { headers: { 'X-CSRF-Token': 'host-csrf' } }));
  });

  it('renders the Owner-only Trash denial returned by the server', async () => {
    api.trash.mockResolvedValue({ status: 403, data: { error: { code: 'FORBIDDEN' } } });
    renderManager({ albumId: 'album-1', trash: true });
    expect(await screen.findByText(/do not have permission to manage this gallery/i)).toBeInTheDocument();
  });
});
