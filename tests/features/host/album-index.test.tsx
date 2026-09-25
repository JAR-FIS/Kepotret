import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listAlbums, getAlbum } = vi.hoisted(() => ({ listAlbums: vi.fn(), getAlbum: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1Albums: listAlbums, getApiV1AlbumsAlbumId: getAlbum }));

import { AlbumIndex } from '@/features/host/components/album-index';
import { AlbumOverview } from '@/features/host/components/album-overview';
import idMessages from '@/messages/id.json';
import type { AlbumDetail, AlbumSummary } from '@/lib/api/generated/index.schemas';

const draft: AlbumSummary = {
  album_id: '11111111-1111-4111-8111-111111111111',
  readiness: 'DRAFT', capture_state: 'NOT_STARTED', reveal_state: 'HIDDEN', setup_revision: 1, schedule_version: 0,
};
const readyAlbum: AlbumDetail = {
  ...draft, readiness: 'READY', access_version: 1, export_revision: 1, guest_count_final: 27,
};

function renderHost(node: React.ReactNode) {
  return render(<NextIntlClientProvider locale="id" messages={idMessages}>{node}</NextIntlClientProvider>);
}

describe('FE-3 Host album surfaces', () => {
  beforeEach(() => { listAlbums.mockReset(); getAlbum.mockReset(); });

  it('shows an actionable empty dashboard state', async () => {
    listAlbums.mockResolvedValue({ status: 200, data: { data: [], meta: {} } });
    renderHost(<AlbumIndex dashboard />);
    expect(await screen.findByText('Buat album pertamamu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buat Album' })).toHaveAttribute('href', '/album/baru');
  });

  it('renders server lifecycle state in the album list', async () => {
    listAlbums.mockResolvedValue({ status: 200, data: { data: [draft], meta: {} } });
    renderHost(<AlbumIndex />);
    expect(await screen.findByText(draft.album_id)).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(draft.album_id) })).toHaveAttribute('href', `/album/${draft.album_id}`);
  });

  it('provides retry on recoverable album list failures', async () => {
    listAlbums.mockResolvedValueOnce({ status: 503, data: {} }).mockResolvedValueOnce({ status: 200, data: { data: [draft], meta: {} } });
    renderHost(<AlbumIndex />);
    expect(await screen.findByText('Album belum dapat dimuat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.getByText(draft.album_id)).toBeInTheDocument());
  });

  it('presents final participant count from album detail only', async () => {
    getAlbum.mockResolvedValue({ status: 200, data: { data: readyAlbum } });
    renderHost(<AlbumOverview albumId={readyAlbum.album_id} />);
    expect(await screen.findByText('27')).toBeInTheDocument();
    expect(getAlbum).toHaveBeenCalledWith(readyAlbum.album_id);
  });
});
