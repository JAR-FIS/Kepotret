import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ activity: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1AlbumsAlbumIdActivity: api.activity }));

import { AlbumActivity } from '@/features/host/components/album-activity';
import messages from '@/messages/en.json';

const page = (data: Array<{ activity_id: string; occurred_at: string; activity_code: 'SETTINGS_UPDATED'; actor_label: string | null }>, next_cursor: string | null, has_more: boolean) => ({ status: 200, data: { data, meta: { next_cursor, has_more } } });
const item = (id: string) => ({ activity_id: id, occurred_at: '2026-09-29T10:00:00Z', activity_code: 'SETTINGS_UPDATED' as const, actor_label: 'Host' });

function renderActivity() {
  return render(<NextIntlClientProvider locale="en" messages={messages}><AlbumActivity albumId="album-1" /></NextIntlClientProvider>);
}

describe('H52 safe album activity', () => {
  beforeEach(() => { api.activity.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

  it('renders only the safe activity projection and requests a bounded first page', async () => {
    api.activity.mockResolvedValue(page([item('activity-1')], 'next-1', true));
    renderActivity();
    expect(await screen.findByText('Album settings updated')).toBeInTheDocument();
    expect(screen.getByText('By Host')).toBeInTheDocument();
    expect(api.activity).toHaveBeenCalledWith('album-1', { limit: 25, cursor: undefined });
    expect(screen.queryByText(/billing|payment|admin audit/i)).not.toBeInTheDocument();
  });

  it('paginates with the server cursor without duplicating existing items', async () => {
    api.activity.mockResolvedValueOnce(page([item('activity-1')], 'next-1', true)).mockResolvedValueOnce(page([item('activity-1'), { ...item('activity-2'), activity_code: 'SETTINGS_UPDATED' }], null, false));
    renderActivity();
    await screen.findByText('Album settings updated');
    fireEvent.click(screen.getByRole('button', { name: 'Load more activity' }));
    await waitFor(() => expect(api.activity).toHaveBeenCalledWith('album-1', { limit: 25, cursor: 'next-1' }));
    await waitFor(() => expect(screen.getAllByText('Album settings updated')).toHaveLength(2));
  });

  it('shows an explicit empty state', async () => {
    api.activity.mockResolvedValue(page([], null, false));
    renderActivity();
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
  });

  it('keeps a 403 relationship failure distinct from a recoverable error', async () => {
    api.activity.mockResolvedValue({ status: 403, data: {} });
    renderActivity();
    expect(await screen.findByRole('heading', { name: 'Access unavailable' })).toBeInTheDocument();
  });
});
