import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ activity: vi.fn(), album: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1AlbumsAlbumIdActivity: api.activity, getApiV1AlbumsAlbumId: api.album }));

import { AlbumActivity } from '@/features/host/components/album-activity';
import type { AlbumActivityItem } from '@/lib/api/generated/index.schemas';
import messages from '@/messages/en.json';

const page = (data: AlbumActivityItem[], next_cursor: string | null, has_more: boolean) => ({ status: 200, data: { data, meta: { next_cursor, has_more } } });
const item = (id: string, activity_code: AlbumActivityItem['activity_code'] = 'SETTINGS_UPDATED'): AlbumActivityItem => ({ activity_id: id, occurred_at: '2026-09-29T10:00:00Z', activity_code, actor_label: 'Host' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

function renderActivity(albumId = 'album-1') {
  return render(<NextIntlClientProvider locale="en" messages={messages}><AlbumActivity albumId={albumId} /></NextIntlClientProvider>);
}

describe('H52 safe album activity', () => {
  beforeEach(() => { api.activity.mockReset(); api.album.mockReset().mockResolvedValue({ status: 200, data: { data: { timezone: 'Asia/Jakarta' } } }); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

  it('renders only the safe activity projection and requests a bounded first page', async () => {
    api.activity.mockResolvedValue(page([item('activity-1')], 'next-1', true));
    renderActivity();
    expect(await screen.findByText('Album settings updated')).toBeInTheDocument();
    expect(screen.getByText('By Host')).toBeInTheDocument();
    expect(api.activity).toHaveBeenCalledWith('album-1', { limit: 25, cursor: undefined });
    expect(api.album).toHaveBeenCalledWith('album-1');
    expect(await screen.findByText(/GMT\+7|WIB/)).toBeInTheDocument();
    expect(screen.queryByText(/billing|payment|admin audit/i)).not.toBeInTheDocument();
  });

  it('renders authorized activity immediately with a labeled UTC fallback while album timezone is slow', async () => {
    let resolveAlbum!: (value: { status: number; data: { data: { timezone: string } } }) => void;
    api.activity.mockResolvedValue(page([item('activity-1')], null, false));
    api.album.mockReturnValue(new Promise((resolve) => { resolveAlbum = resolve; }));
    renderActivity();

    expect(await screen.findByText('Album settings updated')).toBeInTheDocument();
    expect(screen.getByText(/UTC/)).toBeInTheDocument();
    resolveAlbum({ status: 200, data: { data: { timezone: 'Asia/Jakarta' } } });
    expect(await screen.findByText(/GMT\+7|WIB/)).toBeInTheDocument();
  });

  it('ignores an out-of-order timezone response from a previous album', async () => {
    let resolveFirstAlbum!: (value: { status: number; data: { data: { timezone: string } } }) => void;
    api.activity.mockResolvedValue(page([item('activity-1')], null, false));
    api.album.mockImplementation((albumId: string) => albumId === 'album-1'
      ? new Promise((resolve) => { resolveFirstAlbum = resolve; })
      : Promise.resolve({ status: 200, data: { data: { timezone: 'Asia/Jakarta' } } }));
    const rendered = renderActivity('album-1');
    expect(await screen.findByText('Album settings updated')).toBeInTheDocument();
    rendered.rerender(<NextIntlClientProvider locale="en" messages={messages}><AlbumActivity albumId="album-2" /></NextIntlClientProvider>);

    expect(await screen.findByText(/GMT\+7|WIB/)).toBeInTheDocument();
    resolveFirstAlbum({ status: 200, data: { data: { timezone: 'America/Los_Angeles' } } });
    await waitFor(() => expect(api.activity).toHaveBeenLastCalledWith('album-2', { limit: 25, cursor: undefined }));
    expect(screen.queryByText(/PDT|PST/)).not.toBeInTheDocument();
    expect(screen.getByText(/GMT\+7|WIB/)).toBeInTheDocument();
  });

  it('ignores a late album A success and keeps album B pagination isolated', async () => {
    const albumA = deferred<ReturnType<typeof page>>();
    const albumBItem = item('activity-b1', 'SCHEDULE_UPDATED');
    const albumBNext = item('activity-b2', 'DESIGN_UPDATED');
    api.activity.mockReturnValueOnce(albumA.promise)
      .mockResolvedValueOnce(page([albumBItem], 'album-b-cursor', true))
      .mockResolvedValueOnce(page([albumBNext], null, false));
    const rendered = renderActivity('album-a');
    await waitFor(() => expect(api.activity).toHaveBeenCalledWith('album-a', { limit: 25, cursor: undefined }));
    rendered.rerender(<NextIntlClientProvider locale="en" messages={messages}><AlbumActivity albumId="album-b" /></NextIntlClientProvider>);

    expect(await screen.findByText('Event schedule updated')).toBeInTheDocument();
    await act(async () => { albumA.resolve(page([item('activity-a')], null, false)); await albumA.promise; });
    expect(screen.getByText('Event schedule updated')).toBeInTheDocument();
    expect(screen.queryByText('Album settings updated')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load more activity' }));
    expect(await screen.findByText('Album design updated')).toBeInTheDocument();
    expect(api.activity).toHaveBeenCalledWith('album-b', { limit: 25, cursor: 'album-b-cursor' });
    expect(screen.queryByText('Album settings updated')).not.toBeInTheDocument();
  });

  it.each([401, 403])('ignores a late album A authorization response (%s) after album B is active', async (status) => {
    const albumA = deferred<{ status: number; data: unknown }>();
    api.activity.mockReturnValueOnce(albumA.promise).mockResolvedValueOnce(page([item('activity-b', 'SCHEDULE_UPDATED')], null, false));
    const rendered = renderActivity('album-a');
    await waitFor(() => expect(api.activity).toHaveBeenCalledWith('album-a', { limit: 25, cursor: undefined }));
    rendered.rerender(<NextIntlClientProvider locale="en" messages={messages}><AlbumActivity albumId="album-b" /></NextIntlClientProvider>);

    expect(await screen.findByText('Event schedule updated')).toBeInTheDocument();
    await act(async () => { albumA.resolve({ status, data: {} }); await albumA.promise; });
    expect(screen.getByText('Event schedule updated')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your session needs refreshing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Access unavailable' })).not.toBeInTheDocument();
  });

  it('ignores a late album A network rejection after album B is active', async () => {
    const albumA = deferred<ReturnType<typeof page>>();
    api.activity.mockReturnValueOnce(albumA.promise).mockResolvedValueOnce(page([item('activity-b', 'SCHEDULE_UPDATED')], null, false));
    const rendered = renderActivity('album-a');
    await waitFor(() => expect(api.activity).toHaveBeenCalledWith('album-a', { limit: 25, cursor: undefined }));
    rendered.rerender(<NextIntlClientProvider locale="en" messages={messages}><AlbumActivity albumId="album-b" /></NextIntlClientProvider>);

    expect(await screen.findByText('Event schedule updated')).toBeInTheDocument();
    await act(async () => { albumA.reject(new TypeError('Album A request failed')); await albumA.promise.catch(() => undefined); });
    expect(screen.getByText('Event schedule updated')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Activity could not be loaded' })).not.toBeInTheDocument();
  });

  it('does not apply an Activity response after unmount', async () => {
    const request = deferred<ReturnType<typeof page>>();
    api.activity.mockReturnValueOnce(request.promise);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rendered = renderActivity();
    await waitFor(() => expect(api.activity).toHaveBeenCalledTimes(1));
    rendered.unmount();

    await act(async () => { request.resolve(page([item('activity-after-unmount')], null, false)); await request.promise; });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    ['network rejection', () => api.album.mockRejectedValue(new TypeError('Network unavailable'))],
    ['HTTP error', () => api.album.mockResolvedValue({ status: 503, data: {} })],
  ])('keeps activity usable with UTC when optional album metadata has a %s', async (_name, rejectMetadata) => {
    api.activity.mockResolvedValue(page([item('activity-1')], null, false));
    rejectMetadata();
    renderActivity();
    expect(await screen.findByText('Album settings updated')).toBeInTheDocument();
    expect(await screen.findByText(/UTC/)).toBeInTheDocument();
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

  it.each([
    [401, 'Your session needs refreshing'],
    [403, 'Access unavailable'],
  ])('does not render activity when the authoritative Activity API returns %s', async (status, heading) => {
    api.activity.mockResolvedValue({ status, data: {} });
    renderActivity();
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByText('Album settings updated')).not.toBeInTheDocument();
  });

  it.each([
    [401, 'Your session needs refreshing'],
    [403, 'Access unavailable'],
  ])('removes visible activity if optional album authorization changes to %s', async (status, heading) => {
    api.activity.mockResolvedValue(page([item('activity-1')], null, false));
    api.album.mockResolvedValue({ status, data: {} });
    renderActivity();
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByText('Album settings updated')).not.toBeInTheDocument();
  });
});
