import { NextIntlClientProvider } from 'next-intl';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAlbum, getPackages } = vi.hoisted(() => ({ getAlbum: vi.fn(), getPackages: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1AlbumsAlbumId: getAlbum, getApiV1Packages: getPackages }));

import { AlbumOverview } from '@/features/host/components/album-overview';
import idMessages from '@/messages/id.json';
import { makeAlbum, uatPackages } from '../../uat/fixtures';
import type { AlbumDetail, PackageOption } from '@/lib/api/generated/index.schemas';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

const albumA: AlbumDetail = { ...makeAlbum('draft'), event_name: 'Album A', quota_total: 30 };
const albumB: AlbumDetail = { ...albumA, album_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', event_name: 'Album B', quota_total: 250 };
const catalog = (options: PackageOption[]) => ({ status: 200, data: { data: options } });

function renderOverview(albumId = albumA.album_id) {
  return render(<NextIntlClientProvider locale="id" messages={idMessages}><AlbumOverview albumId={albumId} /></NextIntlClientProvider>);
}

describe('H27 optional package catalog', () => {
  beforeEach(() => {
    getAlbum.mockReset();
    getPackages.mockReset();
    getAlbum.mockImplementation(async (id: string) => ({ status: 200, data: { data: id === albumB.album_id ? albumB : albumA } }));
  });

  it('renders authorized album detail and actual capacity while catalog is pending, then enriches package details', async () => {
    const pending = deferred<ReturnType<typeof catalog>>();
    getPackages.mockReturnValue(pending.promise);
    renderOverview();

    expect(await screen.findByText('Album A')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas album saat ini: 30 foto')).toBeInTheDocument();
    expect(screen.getByText('Detail paket belum tersedia dari katalog.')).toBeInTheDocument();
    expect(getPackages).toHaveBeenCalledTimes(1);

    await act(async () => { pending.resolve(catalog(uatPackages)); });
    expect(screen.getByText('LOCKED 100 (LOCKED100)')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas paket pilihan: 100 foto')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas album saat ini: 30 foto')).toBeInTheDocument();
  });

  it.each(['network error', 'HTTP 503'] as const)('keeps the album visible when the catalog has a %s', async failure => {
    if (failure === 'network error') getPackages.mockRejectedValue(new TypeError('Network unavailable'));
    else getPackages.mockResolvedValue({ status: 503, data: {} });
    renderOverview();

    expect(await screen.findByText('Album A')).toBeInTheDocument();
    await waitFor(() => expect(getPackages).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Detail paket belum tersedia dari katalog.')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas album saat ini: 30 foto')).toBeInTheDocument();
  });

  it.each([401, 403] as const)('preserves album authorization for HTTP %s', async status => {
    getAlbum.mockResolvedValue({ status, data: {} });
    renderOverview();

    expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
    expect(screen.queryByText('Album A')).not.toBeInTheDocument();
    expect(getPackages).not.toHaveBeenCalled();
  });

  it('discards album A metadata after navigation and applies album B metadata when it arrives', async () => {
    const pendingA = deferred<ReturnType<typeof catalog>>();
    const pendingB = deferred<ReturnType<typeof catalog>>();
    getPackages.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    const { rerender } = renderOverview();
    expect(await screen.findByText('Album A')).toBeInTheDocument();

    rerender(<NextIntlClientProvider locale="id" messages={idMessages}><AlbumOverview albumId={albumB.album_id} /></NextIntlClientProvider>);
    expect(screen.queryByText('Album A')).not.toBeInTheDocument();
    expect(await screen.findByText('Album B')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas album saat ini: 250 foto')).toBeInTheDocument();
    await waitFor(() => expect(getPackages).toHaveBeenCalledTimes(2));

    await act(async () => { pendingA.resolve(catalog([{ ...uatPackages[0], name: 'Stale package' }])); });
    expect(screen.queryByText('Stale package (LOCKED100)')).not.toBeInTheDocument();
    expect(screen.getByText('Detail paket belum tersedia dari katalog.')).toBeInTheDocument();

    await act(async () => { pendingB.resolve(catalog([{ ...uatPackages[0], name: 'Current package' }])); });
    expect(screen.getByText('Current package (LOCKED100)')).toBeInTheDocument();
  });

  it.each(['success', 'network error'] as const)('ignores a late catalog %s after unmount', async outcome => {
    const pending = deferred<ReturnType<typeof catalog>>();
    getPackages.mockReturnValue(pending.promise);
    const view = renderOverview();
    expect(await screen.findByText('Album A')).toBeInTheDocument();
    view.unmount();

    await act(async () => {
      if (outcome === 'success') pending.resolve(catalog(uatPackages));
      else pending.reject(new TypeError('Network unavailable'));
      await pending.promise.catch(() => undefined);
    });
    expect(screen.queryByText('Album A')).not.toBeInTheDocument();
  });

  it('does not request the catalog when the Owner has no selected package', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: { ...albumA, selected_package_version_id: null } } });
    renderOverview();

    expect(await screen.findByText('Album A')).toBeInTheDocument();
    expect(screen.getByText('Paket Gratis · 30 foto')).toBeInTheDocument();
    expect(getPackages).not.toHaveBeenCalled();
  });

  it('does not request or display Owner-only package data for collaborators', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: { ...albumA, actor_access: makeAlbum('draft', true).actor_access } } });
    renderOverview();

    expect(await screen.findByText('Album A')).toBeInTheDocument();
    expect(screen.queryByText('Pilihan paket album')).not.toBeInTheDocument();
    expect(screen.queryByText('Kapasitas album saat ini: 30 foto')).not.toBeInTheDocument();
    expect(getPackages).not.toHaveBeenCalled();
  });
});
