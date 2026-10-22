import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ capabilities: vi.fn(), candidates: vi.fn(), csrf: vi.fn(), create: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: api.push }) }));
vi.mock('@/lib/api/browser', () => ({
  getApiV1AlbumsAlbumIdExportCapabilities: api.capabilities,
  getApiV1AlbumsAlbumIdExportSelectionPhotos: api.candidates,
  getApiV1SecurityCsrf: api.csrf,
  postApiV1AlbumsAlbumIdExports: api.create,
}));

import { GalleryExportSelection } from '@/features/host/components/gallery-export-selection';
import messages from '@/messages/en.json';

const albumId = '11111111-1111-4111-8111-111111111111';
const photos = [1, 2, 3].map((index) => ({ photo_id: `photo-${index}`, photographer_display_name: `Guest ${index}`, created_at: '2026-10-01T00:00:00Z' }));

function renderSelection(allowed = true) {
  const onModeChange = vi.fn();
  render(<NextIntlClientProvider locale="en" messages={messages}><GalleryExportSelection albumId={albumId} allowed={allowed} onModeChange={onModeChange} /></NextIntlClientProvider>);
  return onModeChange;
}

describe('H42 Host selected export', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    sessionStorage.clear();
    api.capabilities.mockResolvedValue({ status: 200, data: { data: { max_photos_per_job: 2, eligible_photo_count: 3, allow_all: true, allow_selected: true } } });
    api.candidates.mockResolvedValue({ status: 200, data: { data: photos, meta: { next_cursor: null, has_more: false } } });
    api.csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'csrf-test' } } });
    api.create.mockResolvedValue({ status: 201, data: { data: { export_job_id: 'job-1' } } });
  });

  it('starts in browsing mode, enforces the server cap, and clears on exit', async () => {
    const onModeChange = renderSelection();
    expect(screen.queryByRole('region', { name: 'Selected photos' })).not.toBeInTheDocument();
    expect(api.capabilities).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Select photos' }));
    expect(await screen.findByText('0 selected / maximum 2')).toBeInTheDocument();
    expect(api.candidates).toHaveBeenCalledWith(albumId, { limit: 100 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select photo by Guest 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select photo by Guest 2' }));
    expect(screen.getByText('2 selected / maximum 2')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select photo by Guest 3' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Done selecting' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(onModeChange).toHaveBeenLastCalledWith(false);
  });

  it('revalidates candidates and creates one authorized selected ZIP job', async () => {
    renderSelection();
    fireEvent.click(screen.getByRole('button', { name: 'Select photos' }));
    await screen.findByText('0 selected / maximum 2');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select photo by Guest 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a ZIP from selected photos?' });
    expect(dialog).toHaveTextContent(/server ZIP job/i);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create ZIP job' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.capabilities).toHaveBeenCalledTimes(2);
    expect(api.candidates).toHaveBeenCalledTimes(2);
    expect(api.create).toHaveBeenCalledWith(albumId, { mode: 'SELECTED', photo_ids: ['photo-1'] }, { headers: { 'X-CSRF-Token': 'csrf-test', 'Idempotency-Key': expect.any(String) } });
    expect(api.push).toHaveBeenCalledWith(`/album/${albumId}/ekspor/job-1`);
  });

  it('keeps ZIP unavailable when the actor or server denies selected export', async () => {
    const { unmount } = render(<NextIntlClientProvider locale="en" messages={messages}><GalleryExportSelection albumId={albumId} allowed={false} onModeChange={vi.fn()} /></NextIntlClientProvider>);
    expect(screen.getByRole('button', { name: 'Select photos' })).toBeDisabled();
    expect(api.capabilities).not.toHaveBeenCalled();
    unmount();
    api.capabilities.mockResolvedValue({ status: 200, data: { data: { max_photos_per_job: 2, eligible_photo_count: 0, allow_all: true, allow_selected: false } } });
    renderSelection();
    fireEvent.click(screen.getByRole('button', { name: 'Select photos' }));
    expect(await screen.findByText('Selected export is unavailable for this album.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeDisabled();
    expect(api.candidates).not.toHaveBeenCalled();
  });

  it('deduplicates paged candidates and never treats gallery rows as eligibility', async () => {
    api.candidates.mockResolvedValueOnce({ status: 200, data: { data: [photos[0]], meta: { next_cursor: 'next', has_more: true } } });
    api.candidates.mockResolvedValueOnce({ status: 200, data: { data: [photos[0], photos[1]], meta: { next_cursor: null, has_more: false } } });
    renderSelection();
    fireEvent.click(screen.getByRole('button', { name: 'Select photos' }));
    expect(await screen.findByRole('checkbox', { name: 'Select photo by Guest 1' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Select photo by Guest 2' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more candidates' }));
    expect(await screen.findByRole('checkbox', { name: 'Select photo by Guest 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });
});
