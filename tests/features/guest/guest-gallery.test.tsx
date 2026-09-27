import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getMe: vi.fn(), list: vi.fn(), detail: vi.fn(), like: vi.fn(), download: vi.fn(), share: vi.fn(), csrf: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1GuestMe: api.getMe,
  getApiV1GuestGalleryPhotos: api.list,
  getApiV1GuestGalleryPhotosPhotoId: api.detail,
  putApiV1GuestGalleryPhotosPhotoIdLike: api.like,
  getApiV1GuestGalleryPhotosPhotoIdDownload: api.download,
  postApiV1GuestGalleryPhotosPhotoIdShareLink: api.share,
  getApiV1SecurityCsrf: api.csrf,
}));

import { GuestGallery } from '@/features/guest/components/guest-gallery';
import messages from '@/messages/en.json';

const eventContext = {
  guest_session: { guest_session_id: 'guest-1', album_id: 'album-1', display_name: 'Guest', created_at: '2026-09-27T00:00:00Z' },
  event: { album_id: 'album-1', event_name: 'Shared event', event_location: null, timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, reveal_at: '2026-09-28T00:00:00Z', capture_state: 'CLOSED', reveal_state: 'REVEALED' },
};
const photo = {
  photo_id: 'photo-1', created_at: '2026-09-28T01:00:00Z', photographer_display_name: 'Ari', like_count: 2,
  media: { url: 'https://media.test/short-lived/photo-1', expires_at: '2026-09-28T01:05:00Z' },
  actions: { can_like: true, liked_by_me: false, can_download: true, can_share: true },
};
const page = (items: typeof photo[], nextCursor: string | null = null) => ({ status: 200, data: { data: items, meta: { has_more: Boolean(nextCursor), next_cursor: nextCursor } } });

function renderGallery(props: { linkId: string; photoId?: string }) {
  return render(<NextIntlClientProvider locale="en" messages={messages}><GuestGallery {...props} /></NextIntlClientProvider>);
}

describe('guest gallery', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getMe.mockResolvedValue({ status: 200, data: { data: eventContext } });
    api.list.mockResolvedValue(page([photo]));
    api.detail.mockResolvedValue({ status: 200, data: { data: photo } });
    api.csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'test-csrf' } } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('does not request gallery photos before the server reports reveal', async () => {
    api.getMe.mockResolvedValue({ status: 200, data: { data: { ...eventContext, event: { ...eventContext.event, reveal_state: 'HIDDEN' } } } });
    renderGallery({ linkId: 'link-1' });
    expect(await screen.findByText(/available after reveal time/i)).toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('uses bounded server cursors and deduplicates repeated photos', async () => {
    api.list.mockResolvedValueOnce(page([photo], 'next-1')).mockResolvedValueOnce(page([photo, { ...photo, photo_id: 'photo-2' }]));
    renderGallery({ linkId: 'link-1' });
    expect(await screen.findByText('Ari')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ sort: 'NEWEST', limit: 24 });
    fireEvent.click(await screen.findByRole('button', { name: 'Load more photos' }));
    await waitFor(() => expect(screen.getAllByText('Ari')).toHaveLength(2));
    expect(api.list).toHaveBeenLastCalledWith({ sort: 'NEWEST', limit: 24, cursor: 'next-1' });
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'MOST_LIKED' } });
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ sort: 'MOST_LIKED', limit: 24 }));
  });

  it('likes once from server state and exposes no unlike control', async () => {
    api.like.mockResolvedValue({ status: 200, data: { data: { ...photo, like_count: 3, actions: { ...photo.actions, liked_by_me: true } } } });
    renderGallery({ linkId: 'link-1', photoId: 'photo-1' });
    const likeButton = await screen.findByRole('button', { name: /like photo/i });
    fireEvent.click(likeButton);
    await waitFor(() => expect(api.like).toHaveBeenCalledWith('photo-1', { headers: { 'X-CSRF-Token': 'test-csrf' } }));
    expect(await screen.findByRole('button', { name: /photo liked/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /unlike/i })).not.toBeInTheDocument();
  });
});
