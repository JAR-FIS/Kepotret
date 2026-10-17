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
    const visibility = await screen.findByRole('combobox', { name: 'Gallery visibility' });
    expect(visibility).toHaveTextContent('Guests can view after reveal');
    fireEvent.click(visibility);
    const options = screen.getByRole('listbox', { name: 'Gallery visibility' });
    expect(Array.from(options.querySelectorAll('[role="option"]')).map((option) => option.textContent)).toEqual(['Guests can view after reveal', 'Host only']);
    fireEvent.keyDown(options, { key: 'ArrowDown' });
    fireEvent.keyDown(options, { key: 'Enter' });
    expect(visibility).toHaveTextContent('Host only');
    fireEvent.click(visibility);
    fireEvent.click(screen.getByRole('option', { name: 'Guests can view after reveal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('album-1', {
      expected_revision: 7, visibility: 'GUEST', moderation_mode: 'APPROVAL', likes_enabled: true,
      downloads_enabled: false, share_enabled: true,
    }, { headers: { 'X-CSRF-Token': 'settings-csrf' } }));
  });

  it('supports HOST_ONLY without a compatibility visibility value', async () => {
    render(<NextIntlClientProvider locale="en" messages={messages}><GallerySettings albumId="album-1" /></NextIntlClientProvider>);
    const visibility = await screen.findByRole('combobox', { name: 'Gallery visibility' });
    fireEvent.click(visibility);
    fireEvent.click(screen.getByRole('option', { name: 'Host only' }));
    expect(visibility).toHaveTextContent('Host only');
  });

  it('uses CSRF and refreshes revision after a conflict', async () => {
    api.patch.mockResolvedValueOnce({ status: 409, data: {} });
    render(<NextIntlClientProvider locale="en" messages={messages}><GallerySettings albumId="album-1" /></NextIntlClientProvider>);
    await screen.findByRole('combobox', { name: 'Gallery visibility' });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Album settings changed. Reload before saving again.')).toBeInTheDocument();
    await waitFor(() => expect(api.settings).toHaveBeenCalledTimes(2));
    expect(api.patch).toHaveBeenCalledWith('album-1', expect.objectContaining({ expected_revision: 7 }), { headers: { 'X-CSRF-Token': 'settings-csrf' } });
  });

  it('blocks settings mutations while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<NextIntlClientProvider locale="en" messages={messages}><GallerySettings albumId="album-1" /></NextIntlClientProvider>);
    await screen.findByRole('combobox', { name: 'Gallery visibility' });
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
