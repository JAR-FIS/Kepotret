import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getDesign: vi.fn(), getCsrf: vi.fn(), authorize: vi.fn(), commit: vi.fn(), patch: vi.fn(), upload: vi.fn(),
}));

// eslint-disable-next-line @next/next/no-img-element -- keep the mocked image observable in the DOM test.
vi.mock('next/image', () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} /> }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumIdDesign: api.getDesign,
  getApiV1SecurityCsrf: api.getCsrf,
  postApiV1AlbumsAlbumIdDesignAssetsUploadAuthorizations: api.authorize,
  postApiV1AlbumsAlbumIdDesignAssetsAssetIdCommit: api.commit,
  patchApiV1AlbumsAlbumIdDesign: api.patch,
}));

import { DesignSetup } from '@/features/host/components/design-setup';
import idMessages from '@/messages/id.json';

const albumId = '11111111-1111-4111-8111-111111111111';
const assetId = '55555555-5555-4555-8555-555555555555';
const cover = { cover_asset_id: assetId, cover_preview: { url: 'https://media.test/short-lived-cover', expires_at: '2026-10-02T10:00:00Z' }, setup_revision: 5 };

function renderDesign() {
  return render(<NextIntlClientProvider locale="id" messages={idMessages}><DesignSetup albumId={albumId} /></NextIntlClientProvider>);
}

function selectFile(file: File) {
  fireEvent.change(screen.getByLabelText('Pilih gambar sampul'), { target: { files: [file] } });
}

describe('H58 design asset management', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getDesign.mockResolvedValue({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 4 } } });
    api.getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
    api.authorize.mockResolvedValue({ status: 201, data: { data: { asset_id: assetId, upload_url: 'https://upload.test/short-lived', expires_at: '2026-10-02T10:00:00Z' } } });
    api.commit.mockResolvedValue({ status: 200, data: { data: {} } });
    api.patch.mockResolvedValue({ status: 200, data: { data: cover } });
    api.upload.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', api.upload);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it.each([
    ['SVG', 'image/svg+xml', 10],
    ['oversized', 'image/png', 5_000_001],
    ['empty', 'image/jpeg', 0],
  ])('rejects %s before requesting upload authorization', async (_label, mime, size) => {
    renderDesign();
    await screen.findByText('Belum ada sampul yang dipilih.');
    selectFile(new File([new Uint8Array(size)], 'cover', { type: mime }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pilih JPEG, PNG, atau WebP');
    expect(api.authorize).not.toHaveBeenCalled();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('accepts exactly 5,000,000 bytes and authorizes, uploads, commits, then selects the returned asset id', async () => {
    api.getDesign
      .mockResolvedValueOnce({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 4 } } })
      .mockResolvedValueOnce({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 4 } } })
      .mockResolvedValueOnce({ status: 200, data: { data: cover } });
    const file = new File([new Uint8Array(5_000_000)], 'cover.webp', { type: 'image/webp' });
    renderDesign();
    await screen.findByText('Belum ada sampul yang dipilih.');
    selectFile(file);

    await screen.findByText('Pilihan sampul diperbarui.');
    expect(api.authorize).toHaveBeenCalledWith(albumId, { asset_type: 'COVER', content_type: 'image/webp', size_bytes: 5_000_000 }, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(api.upload).toHaveBeenCalledWith('https://upload.test/short-lived', {
      method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: file,
    });
    expect(api.commit).toHaveBeenCalledWith(albumId, assetId, {}, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(api.patch).toHaveBeenCalledWith(albumId, { expected_revision: 4, cover_asset_id: assetId }, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(api.commit.mock.invocationCallOrder[0]).toBeLessThan(api.patch.mock.invocationCallOrder[0]);
    expect(await screen.findByAltText('Pratinjau sampul terpilih')).toHaveAttribute('src', 'https://media.test/short-lived-cover');
    expect(screen.queryByText('https://upload.test/short-lived')).not.toBeInTheDocument();
  });

  it('does not select an asset when the revision is stale', async () => {
    api.getDesign
      .mockResolvedValueOnce({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 4 } } })
      .mockResolvedValueOnce({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 4 } } });
    api.patch.mockResolvedValue({ status: 409, data: {} });
    renderDesign();
    await screen.findByText('Belum ada sampul yang dipilih.');
    selectFile(new File(['cover'], 'cover.png', { type: 'image/png' }));
    expect(await screen.findByText('Desain berubah di tempat lain. Muat ulang untuk melanjutkan.')).toBeInTheDocument();
    expect(api.commit).toHaveBeenCalledOnce();
    expect(api.patch).toHaveBeenCalledOnce();
  });

  it('replaces a selected cover only after the new asset is committed', async () => {
    const replacementId = '66666666-6666-4666-8666-666666666666';
    const replacement = { ...cover, cover_asset_id: replacementId };
    api.getDesign
      .mockResolvedValueOnce({ status: 200, data: { data: cover } })
      .mockResolvedValueOnce({ status: 200, data: { data: cover } })
      .mockResolvedValueOnce({ status: 200, data: { data: replacement } });
    api.authorize.mockResolvedValue({ status: 201, data: { data: { asset_id: replacementId, upload_url: 'https://upload.test/replacement', expires_at: '2026-10-02T10:00:00Z' } } });
    renderDesign();
    expect(await screen.findByAltText('Pratinjau sampul terpilih')).toBeInTheDocument();
    selectFile(new File(['replacement'], 'replacement.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('Pilihan sampul diperbarui.')).toBeInTheDocument();
    expect(api.commit).toHaveBeenCalledWith(albumId, replacementId, {}, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(api.patch).toHaveBeenCalledWith(albumId, { expected_revision: 5, cover_asset_id: replacementId }, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(api.commit.mock.invocationCallOrder[0]).toBeLessThan(api.patch.mock.invocationCallOrder[0]);
    expect(screen.queryByText('https://upload.test/replacement')).not.toBeInTheDocument();
  });

  it('does not upload when authorization is rate limited and does not select an invalid committed asset', async () => {
    api.authorize.mockResolvedValueOnce({ status: 429, data: {} });
    renderDesign();
    await screen.findByText('Belum ada sampul yang dipilih.');
    selectFile(new File(['cover'], 'cover.png', { type: 'image/png' }));
    expect(await screen.findByText('Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.')).toBeInTheDocument();
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.commit).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('blocks upload while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    renderDesign();
    await screen.findByText('Belum ada sampul yang dipilih.');
    expect(screen.getByLabelText('Pilih gambar sampul')).toBeDisabled();
    expect(api.authorize).not.toHaveBeenCalled();
  });

  it('surfaces server signature or asset validation failure without selecting the cover', async () => {
    api.commit.mockResolvedValue({ status: 422, data: {} });
    renderDesign();
    await screen.findByText('Belum ada sampul yang dipilih.');
    selectFile(new File(['not actually a png'], 'cover.png', { type: 'image/png' }));
    expect(await screen.findByText('Pilih JPEG, PNG, atau WebP berukuran 1 sampai 5.000.000 byte.')).toBeInTheDocument();
    expect(api.authorize).toHaveBeenCalledOnce();
    expect(api.upload).toHaveBeenCalledOnce();
    expect(api.commit).toHaveBeenCalledOnce();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows the current authorized cover preview without exposing a storage URL or asset id', async () => {
    api.getDesign.mockResolvedValue({ status: 200, data: { data: cover } });
    renderDesign();
    expect(await screen.findByAltText('Pratinjau sampul terpilih')).toHaveAttribute('src', 'https://media.test/short-lived-cover');
    expect(screen.queryByText(assetId)).not.toBeInTheDocument();
  });
});
