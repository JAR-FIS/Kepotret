import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminAlbumSummary } from '@/lib/api/generated/index.schemas';
import enMessages from '@/messages/en.json';

const api = vi.hoisted(() => ({ albums: vi.fn() }));
vi.mock('@/lib/api/admin-browser', () => ({ getApiV1AdminAlbums: api.albums }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { AdminAlbums } from '@/features/admin/albums';

function album(event_name: string): AdminAlbumSummary {
  return {
    album_id: '11111111-1111-4111-8111-111111111111',
    owner_user_id: '22222222-2222-4222-8222-222222222222',
    owner_email: 'owner@example.test',
    event_name,
    readiness: 'READY',
    capture_state: 'OPEN',
    reveal_state: 'HIDDEN',
    retention_state: 'ACTIVE',
    capture_start: null,
    capture_end: null,
    quota_total: 100,
    reserved_count: 0,
    committed_count: 2,
    hold_active: false,
  };
}

const response = (names: string[], next_cursor: string | null = null) => ({
  status: 200,
  data: { data: names.map(album), meta: { has_more: !!next_cursor, next_cursor } },
});

function mount() {
  render(<NextIntlClientProvider locale="en" messages={enMessages}><AdminAlbums /></NextIntlClientProvider>);
}

describe('Admin album server search', () => {
  beforeEach(() => { api.albums.mockReset(); });

  it('trims the query, retains it across cursor pages, and clears it with a first-page request', async () => {
    api.albums.mockResolvedValueOnce(response(['Initial']))
      .mockResolvedValueOnce(response(['Wedding'], 'next-page'))
      .mockResolvedValueOnce(response(['Wedding 2']))
      .mockResolvedValueOnce(response(['Initial']));
    mount();
    expect(await screen.findAllByText('Initial')).toHaveLength(2);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Album search query' }), { target: { value: '  Wedding  ' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(await screen.findAllByText('Wedding')).toHaveLength(2);
    expect(api.albums).toHaveBeenLastCalledWith({ limit: 25, query: 'Wedding' });

    fireEvent.click(screen.getByRole('button', { name: 'Load next page' }));
    expect(await screen.findAllByText('Wedding 2')).toHaveLength(2);
    expect(api.albums).toHaveBeenLastCalledWith({ limit: 25, query: 'Wedding', cursor: 'next-page' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(await screen.findAllByText('Initial')).toHaveLength(2);
    expect(api.albums).toHaveBeenLastCalledWith({ limit: 25 });
    expect(screen.getByRole('searchbox', { name: 'Album search query' })).toHaveValue('');
  });

  it('ignores a stale search response and handles empty and error states', async () => {
    let finishSlow!: (value: ReturnType<typeof response>) => void;
    api.albums.mockResolvedValueOnce(response(['Initial']))
      .mockImplementationOnce(() => new Promise((resolve) => { finishSlow = resolve; }))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce(response(['Recovered']));
    mount();
    expect(await screen.findAllByText('Initial')).toHaveLength(2);

    const search = screen.getByRole('searchbox', { name: 'Album search query' });
    fireEvent.change(search, { target: { value: 'slow' } });
    fireEvent.submit(screen.getByRole('search'));
    fireEvent.change(search, { target: { value: 'empty' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(await screen.findByText('No albums to display.')).toBeInTheDocument();
    await act(async () => { finishSlow(response(['Stale'])); });
    expect(screen.queryAllByText('Stale')).toHaveLength(0);

    fireEvent.change(search, { target: { value: 'error' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(await screen.findByText(/service is unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(screen.getAllByText('Recovered')).toHaveLength(2));
    expect(api.albums).toHaveBeenLastCalledWith({ limit: 25, query: 'error' });
  });
});
