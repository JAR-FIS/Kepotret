import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuestGalleryPhoto } from '@/lib/api/generated/index.schemas';

const api = vi.hoisted(() => ({
  getMe: vi.fn(), list: vi.fn(), detail: vi.fn(), like: vi.fn(), download: vi.fn(), share: vi.fn(), csrf: vi.fn(), readiness: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumIdCaptureReadiness: api.readiness,
  getApiV1GuestMe: api.getMe,
  getApiV1GuestGalleryPhotos: api.list,
  getApiV1GuestGalleryPhotosPhotoId: api.detail,
  putApiV1GuestGalleryPhotosPhotoIdLike: api.like,
  getApiV1GuestGalleryPhotosPhotoIdDownload: api.download,
  postApiV1GuestGalleryPhotosPhotoIdShareLink: api.share,
  getApiV1SecurityCsrf: api.csrf,
}));

import { GuestGallery } from '@/features/guest/components/guest-gallery';
import { LocaleProvider } from '@/providers/locale-provider';

const eventContext = {
  guest_session: { guest_session_id: 'guest-1', album_id: 'album-1', display_name: 'Guest', created_at: '2026-09-27T00:00:00Z' },
  event: { album_id: 'album-1', event_name: 'Shared event', event_location: null, timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, reveal_at: '2026-09-28T00:00:00Z', capture_state: 'CLOSED', reveal_state: 'REVEALED' },
};
const photo: GuestGalleryPhoto = {
  photo_id: 'photo-1', created_at: '2026-09-28T01:00:00Z', photographer_display_name: 'Ari', like_count: 2,
  media: { url: 'https://media.test/short-lived/photo-1', expires_at: '2026-09-28T01:05:00Z' },
  actions: { can_like: true, liked_by_me: false, can_download: true, can_share: true },
};
const page = (items: typeof photo[], nextCursor: string | null = null) => ({ status: 200, data: { data: items, meta: { has_more: Boolean(nextCursor), next_cursor: nextCursor } } });

function renderGallery(props: { linkId: string; photoId?: string }) {
  return render(<LocaleProvider initialLocale="en"><GuestGallery {...props} /></LocaleProvider>);
}

describe('guest gallery', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    Object.values(router).forEach((mock) => mock.mockReset());
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    api.getMe.mockResolvedValue({ status: 200, data: { data: eventContext } });
    api.list.mockResolvedValue(page([photo]));
    api.detail.mockResolvedValue({ status: 200, data: { data: photo } });
    api.readiness.mockResolvedValue({ status: 200, data: { data: { album_id: 'album-1', state: 'CLOSED', can_capture: false } } });
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort' }));
    fireEvent.click(screen.getByRole('option', { name: 'Most liked' }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ sort: 'MOST_LIKED', limit: 24 }));
  });

  it('retains at most 240 lazy thumbnails after paging through a large gallery', async () => {
    api.list.mockImplementation(({ cursor }: { cursor?: string }) => {
      const index = cursor ? Number(cursor) : 0;
      const photos = Array.from({ length: 24 }, (_, offset) => ({
        ...photo,
        photo_id: `photo-${index * 24 + offset}`,
        photographer_display_name: `Guest ${index * 24 + offset}`,
      }));
      return Promise.resolve(page(photos, index < 10 ? String(index + 1) : null));
    });
    const { container } = renderGallery({ linkId: 'link-1' });
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(24));
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledWith({ sort: 'NEWEST', limit: 24 });
    expect(Array.from(container.querySelectorAll('img')).every((image) => image.getAttribute('loading') === 'lazy')).toBe(true);

    for (let index = 1; index <= 10; index += 1) {
      fireEvent.click(await screen.findByRole('button', { name: 'Load more photos' }));
      await waitFor(() => expect(api.list).toHaveBeenCalledTimes(index + 1));
      await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(Math.min((index + 1) * 24, 240)));
    }
    expect(container.textContent).not.toContain('Guest 0');
    expect(container.textContent).toContain('Guest 263');
    expect(screen.queryByRole('button', { name: 'Load more photos' })).not.toBeInTheDocument();
  }, 30_000);

  it('likes once from server state and exposes no unlike control', async () => {
    api.like.mockResolvedValue({ status: 200, data: { data: { ...photo, like_count: 3, actions: { ...photo.actions, liked_by_me: true } } } });
    renderGallery({ linkId: 'link-1', photoId: 'photo-1' });
    const likeButton = await screen.findByRole('button', { name: /like photo/i });
    fireEvent.click(likeButton);
    await waitFor(() => expect(api.like).toHaveBeenCalledWith('photo-1', { headers: { 'X-CSRF-Token': 'test-csrf' } }));
    expect(await screen.findByRole('button', { name: /photo liked/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /unlike/i })).not.toBeInTheDocument();
  });

  it('disables like, download, and sharing while offline and restores them when online', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    renderGallery({ linkId: 'link-1', photoId: 'photo-1' });
    expect(await screen.findByRole('button', { name: /like photo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    expect(api.like).not.toHaveBeenCalled();
    expect(api.download).not.toHaveBeenCalled();
    expect(api.share).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(screen.getByRole('button', { name: /like photo/i })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeEnabled();
  });

  it('switches grid and list without losing loaded photos or requesting another page', async () => {
    api.list.mockResolvedValueOnce(page([photo], 'next-1')).mockResolvedValueOnce(page([{ ...photo, photo_id: 'photo-2', photographer_display_name: 'Bima' }]));
    renderGallery({ linkId: 'link-1' });
    await screen.findByRole('link', { name: 'View photo by Ari' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more photos' }));
    await screen.findByRole('link', { name: 'View photo by Bima' });
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'View photo by Ari' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View photo by Bima' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveTextContent('Newest');
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('likes from a card without opening detail or offering unlike', async () => {
    api.like.mockResolvedValue({ status: 200, data: { data: { ...photo, like_count: 3, actions: { ...photo.actions, liked_by_me: true } } } });
    renderGallery({ linkId: 'link-1' });
    fireEvent.click(await screen.findByRole('button', { name: 'Like photo' }));
    expect(await screen.findByRole('button', { name: 'Photo liked' })).toBeDisabled();
    expect(api.like).toHaveBeenCalledWith('photo-1', { headers: { 'X-CSRF-Token': 'test-csrf' } });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('offers only Gallery and the public Guest guide in the navigation', async () => {
    renderGallery({ linkId: 'link-1' });
    await screen.findByRole('heading', { name: 'Shared event' });
    expect(screen.getByRole('navigation', { name: 'Guest gallery navigation' })).toBeInTheDocument();
    expect(screen.queryByText(/guest directory|guest menu|host guide/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute('href', '/help/guest');
  });

  it('does not expose capture from a revealed and closed gallery despite inconsistent readiness', async () => {
    const ready = { album_id: 'album-1', state: 'READY', can_capture: true };
    const closed = { album_id: 'album-1', state: 'QUOTA_FULL', can_capture: false };
    api.readiness.mockResolvedValueOnce({ status: 200, data: { data: ready } }).mockResolvedValueOnce({ status: 200, data: { data: closed } });
    renderGallery({ linkId: 'link-1' });
    await screen.findByRole('heading', { name: 'Shared event' });
    await waitFor(() => expect(api.readiness).toHaveBeenCalledTimes(1));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Take a photo' })).not.toBeInTheDocument();
  });

  it('shows only loaded and fresh server counts, caps selection at 20, and keeps ZIP unavailable', async () => {
    const items = Array.from({ length: 22 }, (_, index) => ({ ...photo, photo_id: `photo-${index}`, photographer_display_name: `Guest ${index}`, actions: { ...photo.actions, can_download: index !== 21 } }));
    api.list.mockResolvedValue(page(items));
    api.readiness.mockResolvedValue({ status: 200, data: { data: { album_id: 'album-1', state: 'CLOSED', can_capture: false, album_remaining_count: 76 } } });
    renderGallery({ linkId: 'link-1' });
    expect(await screen.findByText('22 photos displayed')).toBeInTheDocument();
    expect(await screen.findByText('Album photo slots remaining: 76')).toBeInTheDocument();
    const zip = screen.getByRole('button', { name: 'Download ZIP' });
    expect(zip).toBeDisabled();
    for (let index = 0; index < 20; index += 1) fireEvent.click(screen.getByRole('checkbox', { name: `Select photo by Guest ${index}` }));
    expect(screen.getByText('Selected: 20 of 20')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select photo by Guest 20' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select photo by Guest 21' })).toBeDisabled();
    expect(zip).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText('Selected: 0 of 20')).toBeInTheDocument();
  }, 15_000);

  it('drops a selected photo when a later page removes its download permission', async () => {
    api.list.mockResolvedValueOnce(page([photo], 'next-1')).mockResolvedValueOnce(page([{ ...photo, actions: { ...photo.actions, can_download: false } }, { ...photo, photo_id: 'photo-2', photographer_display_name: 'Bima' }]));
    renderGallery({ linkId: 'link-1' });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select photo by Ari' }));
    expect(screen.getByText('Selected: 1 of 20')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more photos' }));
    await waitFor(() => expect(screen.getByText('Selected: 0 of 20')).toBeInTheDocument());
    expect(screen.getByRole('checkbox', { name: 'Select photo by Ari' })).toBeDisabled();
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort' }));
    fireEvent.click(screen.getByRole('option', { name: 'Oldest' }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ sort: 'OLDEST', limit: 24 }));
  });

  it('keeps denied detail media and actions out of the accessible dialog', async () => {
    api.detail.mockResolvedValue({ status: 403, data: { error: { code: 'DENIED' } } });
    renderGallery({ linkId: 'link-1', photoId: 'photo-1' });
    const dialog = await screen.findByRole('dialog', { name: 'Photo details' });
    expect(await screen.findByText('This photo is no longer available to guests.')).toBeInTheDocument();
    expect(dialog.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(router.replace).toHaveBeenCalledWith('/j/link-1/galeri', { scroll: false });
  });
});
