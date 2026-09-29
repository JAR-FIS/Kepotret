import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ overview: vi.fn(), albums: vi.fn() }));
vi.mock('@/lib/api/admin-browser', () => ({
  getApiV1AdminOverview: api.overview,
  getApiV1AdminAlbums: api.albums,
}));

import { AdminDashboard } from '@/features/admin/dashboard';
import { AdminAlbums } from '@/features/admin/albums';
import idMessages from '@/messages/id.json';
import enMessages from '@/messages/en.json';

const overview = {
  total_users: 12, suspended_users: 1, total_albums: 9, ready_albums: 5, payment_pending_albums: 2,
  committed_photos: 40, reserved_photos: 3, successful_payments: 4, pending_payments: 1,
  processing_payments: 1, failed_payments: 2, open_issues: 3, acknowledged_issues: 1,
  active_holds: 0, generated_at: '2026-09-29T00:00:00Z',
};

describe('Admin next-intl copy', () => {
  beforeEach(() => {
    api.overview.mockReset();
    api.albums.mockReset();
    api.overview.mockResolvedValue({ status: 200, data: { data: overview } });
    api.albums.mockResolvedValue({ status: 200, data: { data: [], meta: { has_more: false, next_cursor: null } } });
  });

  it('renders the Admin dashboard in Indonesian', async () => {
    render(<NextIntlClientProvider locale="id" messages={idMessages}><AdminDashboard /></NextIntlClientProvider>);
    expect(await screen.findByRole('heading', { name: 'Ringkasan operasional' })).toBeInTheDocument();
    expect(screen.getByText('Pengguna')).toBeInTheDocument();
    expect(screen.getByText('Foto tersimpan')).toBeInTheDocument();
  });

  it('renders the Admin dashboard and album empty state in English', async () => {
    render(<NextIntlClientProvider locale="en" messages={enMessages}><><AdminDashboard /><AdminAlbums /></></NextIntlClientProvider>);
    expect(await screen.findByRole('heading', { name: 'Operations overview' })).toBeInTheDocument();
    expect(screen.getByText('Committed photos')).toBeInTheDocument();
    expect(await screen.findByText('All albums')).toBeInTheDocument();
    expect(await screen.findByText('No albums to display.')).toBeInTheDocument();
  });
});
