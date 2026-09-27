import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ settings: vi.fn(), csrf: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumIdSettings: api.settings,
  getApiV1SecurityCsrf: api.csrf,
  patchApiV1AlbumsAlbumIdSettings: api.patch,
}));

import { GallerySettings } from '@/features/host/components/gallery-settings';
import messages from '@/messages/en.json';

describe('gallery settings visibility', () => {
  beforeEach(() => {
    api.settings.mockReset();
    api.csrf.mockReset();
    api.patch.mockReset();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    api.settings.mockResolvedValue({ status: 200, data: { data: { revision: 7, visibility: 'GUEST', moderation_mode: 'APPROVAL', likes_enabled: true, downloads_enabled: false, share_enabled: true, per_guest_limit: 30 } } });
    api.csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'settings-csrf' } } });
    api.patch.mockResolvedValue({ status: 200, data: { data: {} } });
  });

  it('accepts only GUEST and HOST_ONLY and sends GUEST to the contract unchanged', async () => {
    render(<NextIntlClientProvider locale="en" messages={messages}><GallerySettings albumId="album-1" /></NextIntlClientProvider>);
    const visibility = await screen.findByLabelText('Gallery visibility');
    expect(visibility).toHaveValue('GUEST');
    expect(Array.from((visibility as HTMLSelectElement).options).map((option) => option.value)).toEqual(['GUEST', 'HOST_ONLY']);
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('album-1', {
      expected_revision: 7, visibility: 'GUEST', moderation_mode: 'APPROVAL', likes_enabled: true,
      downloads_enabled: false, share_enabled: true,
    }, { headers: { 'X-CSRF-Token': 'settings-csrf' } }));
  });

  it('supports HOST_ONLY without a compatibility visibility value', async () => {
    render(<NextIntlClientProvider locale="en" messages={messages}><GallerySettings albumId="album-1" /></NextIntlClientProvider>);
    const visibility = await screen.findByLabelText('Gallery visibility');
    fireEvent.change(visibility, { target: { value: 'HOST_ONLY' } });
    expect(visibility).toHaveValue('HOST_ONLY');
  });
});
