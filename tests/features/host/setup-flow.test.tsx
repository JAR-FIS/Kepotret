import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getAlbum: vi.fn(), getCategories: vi.fn(), getCsrf: vi.fn(), patchAlbum: vi.fn(),
  getSchedule: vi.fn(), putSchedule: vi.fn(), getDesign: vi.fn(), patchDesign: vi.fn(),
  getPackages: vi.fn(), putPackage: vi.fn(), getReview: vi.fn(), confirmSetup: vi.fn(), routerPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: api.routerPush }) }));

vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumId: api.getAlbum,
  getApiV1EventCategories: api.getCategories,
  getApiV1SecurityCsrf: api.getCsrf,
  patchApiV1AlbumsAlbumId: api.patchAlbum,
  getApiV1AlbumsAlbumIdSchedule: api.getSchedule,
  putApiV1AlbumsAlbumIdSchedule: api.putSchedule,
  getApiV1AlbumsAlbumIdDesign: api.getDesign,
  patchApiV1AlbumsAlbumIdDesign: api.patchDesign,
  getApiV1Packages: api.getPackages,
  putApiV1AlbumsAlbumIdSetupPackage: api.putPackage,
  getApiV1AlbumsAlbumIdReview: api.getReview,
  postApiV1AlbumsAlbumIdConfirmSetup: api.confirmSetup,
}));

import { EventBasics } from '@/features/host/components/event-basics';
import { ScheduleSetup } from '@/features/host/components/schedule-setup';
import { DesignSetup } from '@/features/host/components/design-setup';
import { PackageOptions } from '@/features/host/components/package-options';
import { SetupReview } from '@/features/host/components/setup-review';
import type { AlbumDetail, AlbumDesign, AlbumSchedule, EventCategory, PackageOption, SetupReview as SetupReviewData } from '@/lib/api/generated/index.schemas';
import idMessages from '@/messages/id.json';

const albumId = '11111111-1111-4111-8111-111111111111';
const category: EventCategory = { category_id: '22222222-2222-4222-8222-222222222222', code: 'SPORT', label_id: 'Olahraga', label_en: 'Sports', display_order: 1, active: true };
// Synthetic UAT catalog records use deterministic fixture IDs; production options still come from the server catalog.
const categories: EventCategory[] = [category, { category_id: '22222222-2222-4222-8222-222222222223', code: 'MEETING', label_id: 'Meeting', label_en: 'Meeting', display_order: 2, active: true }, { category_id: '22222222-2222-4222-8222-222222222224', code: 'PARTY', label_id: 'Pesta', label_en: 'Party', display_order: 3, active: true }];
const packageOption: PackageOption = { package_id: '33333333-3333-4333-8333-333333333333', package_version_id: '44444444-4444-4444-8444-444444444444', code: 'PLUS', name: 'Plus', price_amount: 75000, currency: 'IDR', quota_total: 300 };
function makePackageOptions(count: number): PackageOption[] {
  return Array.from({ length: count }, (_, index) => ({
    ...packageOption,
    package_id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`,
    package_version_id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, '0')}`,
    name: `Synthetic ${index + 1}`,
    quota_total: 100 + index,
  }));
}
const album: AlbumDetail = {
  album_id: albumId, event_name: null, event_location: null, event_category_id: null, timezone: 'Asia/Jakarta',
  capture_start: null, capture_end: null, selected_package_version_id: null,
  readiness: 'DRAFT', capture_state: 'NOT_STARTED', reveal_state: 'HIDDEN', setup_revision: 4, schedule_version: 0,
  access_version: 0, export_revision: 0, confirmed_setup_revision: null, confirmed_schedule_version: null,
  confirmed_package_version_id: null, setup_confirmed_at: null, guest_count_final: null, quota_total: 30, committed_count: 0,
  actor_access: { relationship: 'OWNER', permission_version: 0, collaborator_permissions: null },
};

const schedule: AlbumSchedule = {
  capture_start: '2026-10-01T14:00:00Z', capture_end: '2026-10-02T14:00:00Z', reveal_delay_days: 3,
  reveal_at: '2026-10-05T14:00:00Z', payment_cutoff_at: '2026-10-02T12:00:00Z', timezone: 'Asia/Jakarta',
  server_time: '2026-09-27T00:00:00Z', can_reschedule: true, earliest_capture_start: null, latest_capture_start: null, schedule_version: 1,
};

const completeReview: SetupReviewData = {
  album_id: albumId, setup_revision: 7, complete: true, issues: [], snapshot: {
    event_basics: { event_name: 'Test event', event_location: 'Test venue', event_category_id: category.category_id, timezone: 'Asia/Jakarta' },
    schedule, access: { pin_enabled: false }, settings: { per_guest_limit: 10 },
    design: { cover_asset_id: null, cover_preview: null, setup_revision: 7 }, selected_package_version_id: null, collaborator_count: 0,
  },
};

function renderHost(node: React.ReactNode) {
  return render(<NextIntlClientProvider locale="id" messages={idMessages}>{node}</NextIntlClientProvider>);
}

describe('FE-3 setup flow contract surfaces', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-27T00:00:00.000Z'));
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getAlbum.mockResolvedValue({ status: 200, data: { data: album } });
    api.getCategories.mockResolvedValue({ status: 200, data: { data: categories, meta: { next_cursor: null, has_more: false } } });
    api.getSchedule.mockResolvedValue({ status: 404, data: {} });
    api.getDesign.mockResolvedValue({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 4 } } });
    api.getPackages.mockResolvedValue({ status: 200, data: { data: [packageOption], meta: { next_cursor: null, has_more: false } } });
    api.getReview.mockResolvedValue({ status: 200, data: { data: completeReview } });
    api.getCsrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf' } } });
  });

  it('loads category chips, leaves examples as placeholders, requires fields, rehydrates and saves only typed H28 values', async () => {
    api.getAlbum.mockResolvedValue({ status: 200, data: { data: { ...album, event_name: 'Persisted event', event_location: 'Persisted venue', event_category_id: category.category_id, timezone: 'Asia/Jakarta' } } });
    renderHost(<EventBasics albumId={albumId} />);

    const name = await screen.findByRole('textbox', { name: 'Nama acara' });
    const location = screen.getByRole('textbox', { name: 'Lokasi acara' });
    expect(name).toHaveValue('Persisted event');
    expect(location).toHaveValue('Persisted venue');
    expect(name).toHaveAttribute('placeholder', 'Turnamen Badminton PB Bima Sakti');
    expect(name).not.toHaveValue('Turnamen Badminton PB Bima Sakti');
    expect(api.getCategories).toHaveBeenCalledOnce();
    expect(screen.getByRole('radio', { name: 'Olahraga' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Meeting' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pesta' })).toBeInTheDocument();

    fireEvent.change(name, { target: { value: '' } });
    fireEvent.change(location, { target: { value: 'Venue typed by Host' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Olahraga' }));
    expect(screen.getByRole('button', { name: 'Simpan informasi acara' })).toBeDisabled();
    fireEvent.change(name, { target: { value: 'Event typed by Host' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan informasi acara' }));

    await waitFor(() => expect(api.patchAlbum).toHaveBeenCalledWith(albumId, {
      expected_revision: 4,
      event_name: 'Event typed by Host',
      event_location: 'Venue typed by Host',
      event_category_id: category.category_id,
      timezone: 'Asia/Jakarta',
    }, { headers: { 'X-CSRF-Token': 'csrf' } }));
  });

  it('rehydrates an existing schedule in the saved album timezone', async () => {
    api.getAlbum.mockResolvedValue({ status: 200, data: { data: { ...album, timezone: 'America/Los_Angeles' } } });
    api.getSchedule.mockResolvedValue({ status: 200, data: { data: schedule } });
    renderHost(<ScheduleSetup albumId={albumId} />);
    expect(await screen.findByLabelText('Tanggal mulai memotret')).toHaveValue('2026-10-01');
    expect(screen.getByRole('heading', { name: 'Waktu Potret' })).toBeInTheDocument();
    expect(screen.getByText('Zona waktu acara: America/Los_Angeles')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Waktu foto ditampilkan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Jam mulai memotret')).toHaveValue('07:00');
    expect(screen.getByLabelText('Tanggal berhenti memotret')).toHaveValue('2026-10-02');
    expect(screen.getByLabelText('Jam berhenti memotret')).toHaveValue('07:00');
    expect(screen.getByRole('combobox', { name: 'Jeda reveal' })).toHaveTextContent('D+3');
  });

  it('defaults to D+1, exposes LIVE only as a preview, and never submits a false delay', async () => {
    api.getSchedule.mockResolvedValue({ status: 404, data: {} });
    renderHost(<ScheduleSetup albumId={albumId} />);
    await screen.findByLabelText('Tanggal mulai memotret');
    const startDate = screen.getByLabelText('Tanggal mulai memotret');
    const startTime = screen.getByLabelText('Jam mulai memotret');
    const endDate = screen.getByLabelText('Tanggal berhenti memotret');
    const endTime = screen.getByLabelText('Jam berhenti memotret');
    const reveal = screen.getByRole('combobox', { name: 'Jeda reveal' });
    expect(reveal).toHaveTextContent('D+1');
    fireEvent.click(screen.getByRole('button', { name: 'Buka kalender untuk Tanggal mulai memotret' }));
    expect(screen.getByRole('button', { name: 'Bulan sebelumnya' })).toBeDisabled();
    expect(document.querySelector('[data-date="2026-09-26"]')).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Kalender untuk Tanggal mulai memotret' }), { key: 'Escape' });
    fireEvent.change(startDate, { target: { value: '2026-10-01' } });
    fireEvent.change(startTime, { target: { value: '10:00' } });
    fireEvent.change(endDate, { target: { value: '2026-10-02' } });
    fireEvent.change(endTime, { target: { value: '10:00' } });
    fireEvent.click(reveal);
    fireEvent.click(screen.getByRole('option', { name: /Mulai saat acara \(pratinjau\)/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Pratinjau LIVE saja');
    expect(screen.getByRole('button', { name: 'Simpan jadwal' })).toBeDisabled();
    expect(api.putSchedule).not.toHaveBeenCalled();
  });

  it('submits wall time converted to the event timezone rather than the browser timezone', async () => {
    api.getAlbum.mockResolvedValue({ status: 200, data: { data: { ...album, timezone: 'America/New_York' } } });
    api.putSchedule.mockResolvedValue({ status: 200, data: { data: schedule } });
    renderHost(<ScheduleSetup albumId={albumId} />);
    await screen.findByLabelText('Tanggal mulai memotret');
    fireEvent.change(screen.getByLabelText('Tanggal mulai memotret'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Jam mulai memotret'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Tanggal berhenti memotret'), { target: { value: '2026-10-02' } });
    fireEvent.change(screen.getByLabelText('Jam berhenti memotret'), { target: { value: '10:00' } });
    const reveal = screen.getByRole('combobox', { name: 'Jeda reveal' });
    fireEvent.click(reveal);
    fireEvent.click(screen.getByRole('option', { name: 'D+5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan jadwal' }));
    await waitFor(() => expect(api.putSchedule).toHaveBeenCalledWith(albumId, {
      expected_revision: 4, capture_start: '2026-10-01T14:00:00Z', capture_end: '2026-10-02T14:00:00Z', reveal_delay_days: 5,
    }, { headers: { 'X-CSRF-Token': 'csrf' } }));
  });

  it('uses the refreshed setup revision for two consecutive schedule saves', async () => {
    api.getAlbum
      .mockResolvedValueOnce({ status: 200, data: { data: { ...album, setup_revision: 4 } } })
      .mockResolvedValueOnce({ status: 200, data: { data: { ...album, setup_revision: 5 } } })
      .mockResolvedValueOnce({ status: 200, data: { data: { ...album, setup_revision: 6 } } });
    api.getSchedule.mockResolvedValue({ status: 404, data: {} });
    api.putSchedule.mockResolvedValueOnce({ status: 200, data: { data: { ...schedule, capture_start: '2026-10-01T03:00:00Z', capture_end: '2026-10-02T03:00:00Z' } } });
    api.putSchedule.mockResolvedValue({ status: 200, data: { data: schedule } });
    renderHost(<ScheduleSetup albumId={albumId} />);

    await screen.findByLabelText('Tanggal mulai memotret');
    const startDate = screen.getByLabelText('Tanggal mulai memotret');
    const startTime = screen.getByLabelText('Jam mulai memotret');
    const endDate = screen.getByLabelText('Tanggal berhenti memotret');
    const endTime = screen.getByLabelText('Jam berhenti memotret');
    const reveal = screen.getByRole('combobox', { name: 'Jeda reveal' });
    const save = screen.getByRole('button', { name: 'Simpan jadwal' });

    fireEvent.change(startDate, { target: { value: '2026-10-01' } });
    fireEvent.change(startTime, { target: { value: '10:00' } });
    fireEvent.change(endDate, { target: { value: '2026-10-02' } });
    fireEvent.change(endTime, { target: { value: '10:00' } });
    fireEvent.click(reveal);
    fireEvent.click(screen.getByRole('option', { name: 'D+3' }));
    fireEvent.click(save);
    await waitFor(() => expect(api.putSchedule).toHaveBeenCalledTimes(1));
    await screen.findByText('Jadwal berhasil disimpan.');

    fireEvent.change(startDate, { target: { value: '2026-10-03' } });
    fireEvent.change(endDate, { target: { value: '2026-10-04' } });
    fireEvent.click(save);
    await waitFor(() => expect(api.putSchedule).toHaveBeenCalledTimes(2));

    expect(api.putSchedule.mock.calls.map(([id, body]) => [id, body])).toEqual([
      [albumId, { expected_revision: 4, capture_start: '2026-10-01T03:00:00Z', capture_end: '2026-10-02T03:00:00Z', reveal_delay_days: 3 }],
      [albumId, { expected_revision: 5, capture_start: '2026-10-03T03:00:00Z', capture_end: '2026-10-04T03:00:00Z', reveal_delay_days: 3 }],
    ]);
    expect(api.getAlbum).toHaveBeenCalledTimes(3);
  });

  it('rehydrates committed design state and allows clearing the supported cover selection', async () => {
    const cover: AlbumDesign = { cover_asset_id: '55555555-5555-4555-8555-555555555555', cover_preview: null, setup_revision: 4 };
    api.getDesign.mockResolvedValueOnce({ status: 200, data: { data: cover } }).mockResolvedValueOnce({ status: 200, data: { data: cover } }).mockResolvedValueOnce({ status: 200, data: { data: { cover_asset_id: null, cover_preview: null, setup_revision: 5 } } });
    api.patchDesign.mockResolvedValue({ status: 200, data: { data: album } });
    renderHost(<DesignSetup albumId={albumId} />);
    expect(await screen.findByText('Sampul telah dipilih.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus pilihan sampul' }));
    await waitFor(() => expect(api.patchDesign).toHaveBeenCalledWith(albumId, { expected_revision: 4, cover_asset_id: null }, { headers: { 'X-CSRF-Token': 'csrf' } }));
    expect(await screen.findByText('Pilihan sampul diperbarui.')).toBeInTheDocument();
  });

  it('persists FREE30 as a null draft package selection', async () => {
    api.putPackage.mockResolvedValue({ status: 200, data: { data: album } });
    renderHost(<PackageOptions albumId={albumId} />);
    fireEvent.click(await screen.findByRole('radio', { name: /Paket Gratis/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pilihan paket' }));
    await waitFor(() => expect(api.putPackage).toHaveBeenCalledWith(albumId, { expected_revision: 4, package_version_id: null }, { headers: { 'X-CSRF-Token': 'csrf' } }));
  });

  it.each([
    { paid: 0, columns: [1] },
    { paid: 1, columns: [1, 1] },
    { paid: 4, columns: [3, 2] },
    { paid: 6, columns: [4, 3] },
  ])('dynamically distributes $paid paid choices while preserving logical order', async ({ paid, columns: expectedColumns }) => {
    const options = makePackageOptions(paid);
    api.getPackages.mockResolvedValueOnce({ status: 200, data: { data: options } });
    renderHost(<PackageOptions albumId={albumId} />);

    const radios = await screen.findAllByRole('radio');
    expect(radios).toHaveLength(paid + 1);
    expect(screen.getByRole('group', { name: 'Pilihan paket' })).toContainElement(radios[0]);
    expect(radios.map((radio) => radio.closest('label')?.querySelector('span span')?.textContent)).toEqual([
      'Paket Gratis · 30 foto',
      ...options.map((option) => option.name),
    ]);

    const renderedColumns = screen.getAllByTestId('setup-package-column');
    expect(renderedColumns.map((column) => column.querySelectorAll('input[type="radio"]').length)).toEqual(expectedColumns);
  });

  it('renders server commercial values and persists a paid package selection', async () => {
    api.putPackage.mockResolvedValue({ status: 200, data: { data: album } });
    renderHost(<PackageOptions albumId={albumId} />);
    expect(await screen.findByText(/Rp\s?75\.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Plus/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pilihan paket' }));
    await waitFor(() => expect(api.putPackage).toHaveBeenCalledWith(albumId, { expected_revision: 4, package_version_id: packageOption.package_version_id }, { headers: { 'X-CSRF-Token': 'csrf' } }));
  });

  it('routes authoritative blocking review issues to their setup section', async () => {
    api.getReview.mockResolvedValue({ status: 200, data: { data: { ...completeReview, complete: false, issues: [{ code: 'SCHEDULE_REQUIRED', section: 'jadwal', severity: 'BLOCKING', message_key: null }] } } });
    renderHost(<SetupReview albumId={albumId} />);
    expect(await screen.findByText('Server menemukan hal yang harus dilengkapi. Ikuti tautan untuk memperbaikinya.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buka bagian' })).toHaveAttribute('href', `/album/${albumId}/setup/jadwal`);
    expect(screen.getByRole('button', { name: 'Konfirmasi setup' })).toBeDisabled();
  });

  it('keeps the authoritative paid package review when catalog metadata is unavailable', async () => {
    api.getReview.mockResolvedValue({ status: 200, data: { data: { ...completeReview, snapshot: { ...completeReview.snapshot, selected_package_version_id: packageOption.package_version_id } } } });
    api.getPackages.mockRejectedValueOnce(new TypeError('Network unavailable'));
    api.confirmSetup.mockResolvedValue({ status: 200, data: { data: { ...album, readiness: 'PAYMENT_PENDING' } } });
    renderHost(<SetupReview albumId={albumId} />);

    expect(await screen.findByText('Server menyatakan setup telah lengkap.')).toBeInTheDocument();
    expect(screen.getByText('Paket berbayar (detail paket tidak tersedia)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi setup' }));
    await waitFor(() => expect(api.confirmSetup).toHaveBeenCalledWith(albumId, { expected_setup_revision: 7 }, expect.objectContaining({ headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf', 'Idempotency-Key': expect.any(String) }) })));
    expect(await screen.findByText('Setup dikonfirmasi; menunggu pembayaran')).toBeInTheDocument();
    expect(api.routerPush).toHaveBeenCalledWith(`/album/${albumId}/checkout/${packageOption.package_version_id}`);
  });

  it('keeps a valid review when package catalog responds with an unavailable status', async () => {
    api.getReview.mockResolvedValue({ status: 200, data: { data: { ...completeReview, snapshot: { ...completeReview.snapshot, selected_package_version_id: packageOption.package_version_id } } } });
    api.getPackages.mockResolvedValueOnce({ status: 503, data: {} });
    renderHost(<SetupReview albumId={albumId} />);

    expect(await screen.findByText('Server menyatakan setup telah lengkap.')).toBeInTheDocument();
    expect(screen.getByText('Paket berbayar (detail paket tidak tersedia)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konfirmasi setup' })).toBeEnabled();
  });

  it.each([
    [401, 'Sesi perlu diperbarui'],
    [403, 'Akses tidak tersedia'],
  ] as const)('preserves authoritative setup review authorization status %s', async (status, message) => {
    api.getReview.mockResolvedValueOnce({ status, data: {} });
    renderHost(<SetupReview albumId={albumId} />);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Konfirmasi setup' })).not.toBeInTheDocument();
  });

  it('allows a collaborator to view setup review but never to finalize it', async () => {
    api.getAlbum.mockResolvedValue({ status: 200, data: { data: { ...album, actor_access: { relationship: 'COLLABORATOR', permission_version: 3, collaborator_permissions: { can_setup: true, can_moderate: false, can_export_zip: false } } } } });
    renderHost(<SetupReview albumId={albumId} />);
    expect(await screen.findByText('Server menyatakan setup telah lengkap.')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Hanya Pemilik album yang dapat mengonfirmasi setup akhir.');
    expect(screen.queryByRole('button', { name: 'Konfirmasi setup' })).not.toBeInTheDocument();
    expect(api.confirmSetup).not.toHaveBeenCalled();
  });

  it.each([
    ['READY', 'Server menetapkan album FREE30 sebagai siap.'],
    ['PAYMENT_PENDING', 'Server mengembalikan PAYMENT_PENDING untuk paket berbayar.'],
  ] as const)('confirms setup and displays only the returned %s readiness', async (readiness, message) => {
    if (readiness === 'PAYMENT_PENDING') {
      api.getReview.mockResolvedValue({ status: 200, data: { data: { ...completeReview, snapshot: { ...completeReview.snapshot, selected_package_version_id: packageOption.package_version_id } } } });
    }
    api.confirmSetup.mockResolvedValue({ status: 200, data: { data: { ...album, readiness } } });
    renderHost(<SetupReview albumId={albumId} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Konfirmasi setup' }));
    await waitFor(() => expect(api.confirmSetup).toHaveBeenCalledWith(albumId, { expected_setup_revision: 7 }, expect.objectContaining({ headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf', 'Idempotency-Key': expect.any(String) }) })));
    expect(await screen.findByText(message)).toBeInTheDocument();
    if (readiness === 'PAYMENT_PENDING') expect(api.routerPush).toHaveBeenCalledWith(`/album/${albumId}/checkout/${packageOption.package_version_id}`);
  });
});
