import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getAlbum: vi.fn(), getOptions: vi.fn(), getPackages: vi.fn(), getLifecycle: vi.fn(),
  getRecoveryPhotos: vi.fn(), getExportCapabilities: vi.fn(), getDownload: vi.fn(), getLiveOverview: vi.fn(),
  getPayments: vi.fn(), getPayment: vi.fn(),
}));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumId: api.getAlbum,
  getApiV1AlbumsAlbumIdPackageOptions: api.getOptions,
  getApiV1Packages: api.getPackages,
  getApiV1AlbumsAlbumIdLifecycle: api.getLifecycle,
  getApiV1AlbumsAlbumIdRecoveryPhotos: api.getRecoveryPhotos,
  getApiV1AlbumsAlbumIdExportCapabilities: api.getExportCapabilities,
  getApiV1AlbumsAlbumIdPhotosPhotoIdDownload: api.getDownload,
  getApiV1AlbumsAlbumIdLiveOverview: api.getLiveOverview,
  getApiV1AlbumsAlbumIdPayments: api.getPayments,
  getApiV1PaymentsTransactionId: api.getPayment,
}));
vi.mock('@/hooks/use-connectivity', () => ({ useConnectivity: () => true }));

import { LifecyclePage, PaymentHistoryPage, RecoveryMediaPage, UpgradePage } from '@/features/host/components/fe6-pages';
import { LiveEventDashboard } from '@/features/host/components/live-event-dashboard';
import idMessages from '@/messages/id.json';
import enMessages from '@/messages/en.json';
import { makeLiveOverview, uatPackages } from '../../uat/fixtures';
import { uatIds } from '../../uat/constants';
import type { AlbumPackageOptions, LifecycleProjection, PaymentTransaction } from '@/lib/api/generated/index.schemas';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function renderHost(node: React.ReactNode, locale: 'id' | 'en' = 'id') {
  return render(<NextIntlClientProvider locale={locale} messages={locale === 'id' ? idMessages : enMessages}>{node}</NextIntlClientProvider>);
}

const options: AlbumPackageOptions = {
  album_id: uatIds.album, current_quota_total: 250, reserved_count: 0, committed_count: 10,
  payment_cutoff_at: '2026-10-02T12:00:00Z', server_time: '2026-10-01T10:00:00Z',
  can_create_checkout: true, checkout_block_reason: null, active_checkout: null, options: [uatPackages[2]],
};
const life: LifecycleProjection = {
  album_id: uatIds.album, retention_state: 'RECOVERY', server_time: '2026-10-01T10:00:00Z',
  recovery_access_granted_at: '2026-10-01T09:00:00Z', normal_access_end_at: '2026-10-02T10:00:00Z',
  recovery_end_at: '2026-10-09T10:00:00Z', backup_cleanup_deadline_at: '2026-10-23T10:00:00Z',
  can_activate_recovery: false, can_open_recovery_media: true, can_create_recovery_export: true,
};
const transaction: PaymentTransaction = {
  transaction_id: uatIds.transaction, album_id: uatIds.album, type: 'UPGRADE', status: 'PENDING',
  package_version_id: uatPackages[2].package_version_id, package_name_snapshot: uatPackages[2].name,
  target_quota_total_snapshot: uatPackages[2].quota_total, amount: uatPackages[2].price_amount, currency: 'IDR',
  payment_cutoff_at: options.payment_cutoff_at, provider_expires_at: options.payment_cutoff_at,
  created_at: life.server_time, paid_at: null,
};

describe('FE-UAT-V2-04 album operations', () => {
  beforeEach(() => {
    for (const mock of Object.values(api)) mock.mockReset();
    api.getAlbum.mockResolvedValue({ status: 200, data: { data: { timezone: 'Asia/Jakarta' } } });
    api.getOptions.mockResolvedValue({ status: 200, data: { data: options } });
    api.getPackages.mockResolvedValue({ status: 200, data: { data: uatPackages } });
    api.getLifecycle.mockResolvedValue({ status: 200, data: { data: life } });
    api.getRecoveryPhotos.mockResolvedValue({ status: 200, data: { data: [{ photo_id: uatIds.photo, created_at: life.server_time, photographer_display_name: 'Ari', media: { url: 'https://media.test/photo', expires_at: life.recovery_end_at }, can_download: true }], meta: { next_cursor: null } } });
    api.getExportCapabilities.mockResolvedValue({ status: 200, data: { data: { allow_all: true } } });
    api.getLiveOverview.mockResolvedValue({ status: 200, data: { data: makeLiveOverview('live', true) } });
    api.getPayments.mockResolvedValue({ status: 200, data: { data: [transaction], meta: { has_more: false, next_cursor: null } } });
    api.getPayment.mockResolvedValue({ status: 200, data: { data: transaction } });
  });

  it.each(['PENDING', 'SUCCESS', 'FAILURE', 'EXPIRED'] as const)('uses the server %s state in H47 and H48', async status => {
    const serverTransaction = { ...transaction, status, paid_at: status === 'SUCCESS' ? life.server_time : null };
    api.getPayments.mockResolvedValue({ status: 200, data: { data: [serverTransaction], meta: { has_more: false, next_cursor: null } } });
    api.getPayment.mockResolvedValue({ status: 200, data: { data: serverTransaction } });
    const expected = { PENDING: 'Menunggu pembayaran', SUCCESS: 'Pembayaran berhasil', FAILURE: 'Pembayaran gagal', EXPIRED: 'Pembayaran kedaluwarsa' }[status];

    const history = renderHost(<PaymentHistoryPage albumId={uatIds.album} />);
    const historyBadge = await screen.findByText(expected);
    expect(historyBadge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    history.unmount();

    renderHost(<PaymentHistoryPage albumId={uatIds.album} transactionId={uatIds.transaction} />);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it.each([401, 403] as const)('keeps H47 and H48 permission states for HTTP %s', async status => {
    api.getPayments.mockResolvedValue({ status, data: {} });
    api.getPayment.mockResolvedValue({ status, data: {} });
    const expected = status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia';

    const history = renderHost(<PaymentHistoryPage albumId={uatIds.album} />);
    expect(await screen.findByRole('heading', { name: expected })).toBeInTheDocument();
    history.unmount();

    renderHost(<PaymentHistoryPage albumId={uatIds.album} transactionId={uatIds.transaction} />);
    expect(await screen.findByRole('heading', { name: expected })).toBeInTheDocument();
  });

  it('renders eligible upgrades immediately while the full catalog is pending, then shows all published tiers', async () => {
    const pending = deferred<{ status: number; data: { data: typeof uatPackages } }>();
    api.getPackages.mockReturnValue(pending.promise);
    renderHost(<UpgradePage albumId={uatIds.album} />);

    expect(await screen.findByText('Kapasitas saat ini: 250')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Pilih paket' })).toHaveLength(1);
    expect(screen.getByText(/Katalog paket belum tersedia/)).toBeInTheDocument();
    await act(async () => { pending.resolve({ status: 200, data: { data: uatPackages } }); });

    expect(screen.getAllByRole('heading', { name: /^LOCKED \d/ })).toHaveLength(6);
    expect(screen.getAllByRole('link', { name: 'Pilih paket' })).toHaveLength(1);
    expect(screen.getByText('Kapasitas album saat ini')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas lebih rendah tidak dapat dipilih.')).toBeInTheDocument();
  });

  it.each(['network', '503', '401', '403'] as const)('keeps authorized upgrade options when the optional catalog returns %s', async outcome => {
    if (outcome === 'network') api.getPackages.mockRejectedValue(new TypeError('offline'));
    else api.getPackages.mockResolvedValue({ status: Number(outcome), data: {} });
    renderHost(<UpgradePage albumId={uatIds.album} />);

    expect(await screen.findByText('Kapasitas saat ini: 250')).toBeInTheDocument();
    await waitFor(() => expect(api.getPackages).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('link', { name: 'Pilih paket' })).toHaveLength(1);
  });

  it.each([401, 403, 503] as const)('hides catalog and checkout controls when album eligibility returns %s', async status => {
    api.getOptions.mockResolvedValue({ status, data: {} });
    renderHost(<UpgradePage albumId={uatIds.album} />);

    expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : status === 403 ? 'Akses tidak tersedia' : 'Album belum dapat dimuat' })).toBeInTheDocument();
    expect(api.getPackages).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Pilih paket' })).not.toBeInTheDocument();
  });

  it('blocks checkout when cutoff or active checkout removes server eligibility', async () => {
    api.getOptions.mockResolvedValue({ status: 200, data: { data: { ...options, can_create_checkout: false, checkout_block_reason: 'PAYMENT_CUTOFF_REACHED' } } });
    const view = renderHost(<UpgradePage albumId={uatIds.album} />);
    await screen.findByText('Kapasitas saat ini: 250');
    expect(screen.getByRole('status')).toHaveTextContent('Batas pembayaran album telah lewat.');
    expect(screen.queryByRole('link', { name: 'Pilih paket' })).not.toBeInTheDocument();
    view.unmount();

    api.getOptions.mockResolvedValue({ status: 200, data: { data: { ...options, active_checkout: { transaction_id: uatIds.transaction, package_version_id: uatPackages[2].package_version_id, status: 'PENDING', provider_expires_at: options.payment_cutoff_at } } } });
    renderHost(<UpgradePage albumId={uatIds.album} />);
    expect(await screen.findByText('Pembayaran aktif sedang diproses.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pilih paket' })).not.toBeInTheDocument();
  });

  it('discards late catalog metadata after navigation to another album', async () => {
    const otherId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const pending = deferred<{ status: number; data: { data: typeof uatPackages } }>();
    api.getOptions.mockImplementation(async (albumId: string) => ({ status: 200, data: { data: { ...options, album_id: albumId } } }));
    api.getPackages.mockReturnValueOnce(pending.promise).mockResolvedValue({ status: 200, data: { data: [] } });
    const view = renderHost(<UpgradePage albumId={uatIds.album} />);
    expect(await screen.findByText('Kapasitas saat ini: 250')).toBeInTheDocument();
    view.rerender(<NextIntlClientProvider locale="id" messages={idMessages}><UpgradePage albumId={otherId} /></NextIntlClientProvider>);
    await waitFor(() => expect(api.getOptions).toHaveBeenCalledWith(otherId));
    await act(async () => { pending.resolve({ status: 200, data: { data: uatPackages } }); });
    expect(screen.queryByRole('heading', { name: 'LOCKED 100' })).not.toBeInTheDocument();
  });

  it('shows the lifecycle projection as a semantic, scrollable, zone-aware table', async () => {
    renderHost(<LifecyclePage albumId={uatIds.album} />);
    const table = await screen.findByRole('table', { name: 'Linimasa retensi dan pemulihan' });
    expect(table).toHaveTextContent('Masa pemulihan');
    expect(table).toHaveTextContent('Akses pemulihan diaktifkan');
    expect(table).toHaveTextContent('WIB');
    expect(screen.getByRole('region', { name: 'Linimasa retensi dan pemulihan' })).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('rowheader').length).toBeGreaterThanOrEqual(5);
    expect(screen.getByRole('link', { name: 'Buka media pemulihan' })).toBeInTheDocument();
  });

  it('uses a labelled UTC fallback and preserves cleanup-only permissions', async () => {
    api.getAlbum.mockResolvedValue({ status: 403, data: {} });
    api.getLifecycle.mockResolvedValue({ status: 200, data: { data: { ...life, retention_state: 'PURGED', can_open_recovery_media: false } } });
    renderHost(<LifecyclePage albumId={uatIds.album} />, 'en');
    const table = await screen.findByRole('table', { name: 'Retention and recovery timeline' });
    expect(table).toHaveTextContent('UTC');
    expect(screen.getByText(/Only infrastructure cleanup continues/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open recovery media' })).not.toBeInTheDocument();
  });

  it('keeps recovery ZIP and media downloads behind server capabilities', async () => {
    api.getLifecycle.mockResolvedValue({ status: 200, data: { data: { ...life, can_create_recovery_export: false } } });
    api.getRecoveryPhotos.mockResolvedValue({ status: 200, data: { data: [{ photo_id: uatIds.photo, created_at: life.server_time, photographer_display_name: 'Ari', media: { url: 'https://media.test/photo', expires_at: life.recovery_end_at }, can_download: false }], meta: { next_cursor: null } } });
    renderHost(<RecoveryMediaPage albumId={uatIds.album} />);
    expect(await screen.findByText('Masa pemulihan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buat ZIP pemulihan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unduh media' })).not.toBeInTheDocument();
    expect(api.getDownload).not.toHaveBeenCalled();
  });

  it.each([401, 403, 410] as const)('preserves recovery download response handling for HTTP %s', async status => {
    api.getDownload.mockResolvedValue({ status, data: {} });
    renderHost(<RecoveryMediaPage albumId={uatIds.album} />);
    const button = await screen.findByRole('button', { name: 'Unduh media' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(button);
    if (status === 410) expect(await screen.findByText('Media ini tidak lagi tersedia untuk diunduh.')).toBeInTheDocument();
    else expect(await screen.findByRole('heading', { name: status === 401 ? 'Sesi perlu diperbarui' : 'Akses tidak tersedia' })).toBeInTheDocument();
    expect(api.getDownload).toHaveBeenCalledTimes(1);
  });

  it('shows collaborator-authorized capacity and package unavailability without calling the catalog', async () => {
    renderHost(<LiveEventDashboard albumId={uatIds.album} />);
    expect(await screen.findByText('Kapasitas foto saat ini: 100 foto')).toBeInTheDocument();
    expect(screen.getByText('Detail paket belum tersedia untuk kolaborator.')).toBeInTheDocument();
    expect(api.getPackages).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Buka galeri' }).querySelector('svg')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Berbagi acara' }).querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ekspor ZIP' })).not.toBeInTheDocument();
  });

  it('keeps export action for an explicitly authorized collaborator', async () => {
    const overview = makeLiveOverview('live', true);
    overview.actor_access.collaborator_permissions!.can_export_zip = true;
    api.getLiveOverview.mockResolvedValue({ status: 200, data: { data: overview } });
    renderHost(<LiveEventDashboard albumId={uatIds.album} />, 'en');
    expect(await screen.findByText('Current photo capacity: 100 photos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZIP export' }).querySelector('svg')).toBeInTheDocument();
  });
});
