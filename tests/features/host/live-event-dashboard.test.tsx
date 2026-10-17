import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ liveOverview: vi.fn() }));
vi.mock('@/lib/api/browser', () => ({ getApiV1AlbumsAlbumIdLiveOverview: api.liveOverview }));

import { LiveEventDashboard } from '@/features/host/components/live-event-dashboard';
import type { AlbumLiveOverview } from '@/lib/api/generated/index.schemas';
import messages from '@/messages/en.json';

const dashboard = (capture_state: AlbumLiveOverview['capture_state']): AlbumLiveOverview => ({
  album_id: '11111111-1111-4111-8111-111111111111',
  server_time: '2026-10-17T08:00:00Z',
  event_name: 'Event phase test',
  event_location: null,
  timezone: 'Asia/Jakarta',
  readiness: 'READY',
  capture_state,
  reveal_state: 'HIDDEN',
  capture_start: '2026-10-17T09:00:00Z',
  capture_end: '2026-10-17T09:30:00Z',
  reveal_at: '2026-10-18T09:30:00Z',
  quota_total: 100,
  committed_count: 24,
  reserved_current_count: 0,
  live_guest_session_count: 2,
  guest_count_final: null,
  actor_access: { relationship: 'OWNER', permission_version: 1, collaborator_permissions: null },
});

function renderDashboard() {
  return render(<NextIntlClientProvider locale="en" messages={messages}><LiveEventDashboard albumId="11111111-1111-4111-8111-111111111111" /></NextIntlClientProvider>);
}

describe('H41 server-authoritative capture countdown', () => {
  beforeEach(() => {
    api.liveOverview.mockReset();
    vi.spyOn(window, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof window.setInterval>);
    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('counts down to the exact capture_start timestamp before capture opens', async () => {
    api.liveOverview.mockResolvedValue({ status: 200, data: { data: dashboard('NOT_STARTED') } });
    renderDashboard();

    expect(await screen.findByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Photo capture has not started according to the server.')).toBeInTheDocument();
    expect(screen.getByText(/Event starts:.*4:00 PM.*WIB/)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('Time until event starts: 60m 00s');
  });

  it('counts down to the exact capture_end timestamp while capture is open', async () => {
    api.liveOverview.mockResolvedValue({ status: 200, data: { data: dashboard('OPEN') } });
    renderDashboard();

    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Photo capture is open according to the server.')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('Capture time remaining: 90m 00s');
  });

  it('shows ended state without an active countdown after capture closes', async () => {
    api.liveOverview.mockResolvedValue({ status: 200, data: { data: dashboard('CLOSED') } });
    renderDashboard();

    expect(await screen.findByText('Ended')).toBeInTheDocument();
    expect(screen.getByText('Photo capture has ended according to the server.')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/00:00/)).not.toBeInTheDocument();
  });
});
