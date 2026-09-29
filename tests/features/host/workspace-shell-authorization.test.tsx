import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const app = vi.hoisted(() => ({ access: vi.fn(), pathname: '/album/11111111-1111-4111-8111-111111111111' }));
vi.mock('next/navigation', () => ({ usePathname: () => app.pathname, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));
vi.mock('@/lib/api/browser', () => ({ getApiV1AlbumsAlbumId: app.access }));

import { HostShell } from '@/features/host/components/workspace-shell';
import { LocaleProvider } from '@/providers/locale-provider';

const albumId = '11111111-1111-4111-8111-111111111111';
const renderShell = (actorAccess: unknown, readiness: string | null = 'DRAFT') => {
  app.access.mockResolvedValue({ status: 200, data: { data: { actor_access: actorAccess, readiness } } });
  app.pathname = `/album/${albumId}`;
  return render(<LocaleProvider><HostShell><p>workspace child</p></HostShell></LocaleProvider>);
};
const clickMenu = (label: string) => fireEvent.click(screen.getAllByRole('button', { name: label })[0]!);

describe('FE-7 server-projected workspace capabilities', () => {
  beforeEach(() => app.access.mockReset());

  it('separates Owner rights from all collaborator capabilities', async () => {
    const owner = renderShell({ relationship: 'OWNER', permission_version: null, collaborator_permissions: null });
    await screen.findByText('workspace child');
    expect(document.querySelector(`a[href="/album/${albumId}/galeri"]`)).toBeInTheDocument();
    clickMenu('Lainnya');
    const ownerMenu = screen.getAllByRole('menu')[0]!;
    expect(ownerMenu.querySelector(`a[href="/album/${albumId}/pembayaran"]`)).toBeInTheDocument();
    expect(ownerMenu.querySelector(`a[href="/album/${albumId}/kolaborator"]`)).toBeInTheDocument();
    owner.unmount();

    renderShell({ relationship: 'COLLABORATOR', permission_version: 1, collaborator_permissions: { can_setup: true, can_moderate: true, can_export_zip: true } });
    await screen.findByText('workspace child');
    expect(document.querySelector(`a[href="/album/${albumId}/galeri"]`)).toBeInTheDocument();
    clickMenu('Lainnya');
    const menu = screen.getAllByRole('menu')[0]!;
    expect(menu.querySelector(`a[href="/album/${albumId}/ekspor"]`)).toBeInTheDocument();
    expect(menu.querySelector(`a[href="/album/${albumId}/pembayaran"]`)).not.toBeInTheDocument();
    expect(menu.querySelector(`a[href="/album/${albumId}/kolaborator"]`)).not.toBeInTheDocument();
    expect(menu.querySelector(`a[href="/album/${albumId}/jadwal-ulang"]`)).not.toBeInTheDocument();
    expect(menu.querySelector(`a[href="/album/${albumId}/pemulihan"]`)).not.toBeInTheDocument();
  });

  it.each([
    ['all false', { can_setup: false, can_moderate: false, can_export_zip: false }, false, false, false],
    ['setup only', { can_setup: true, can_moderate: false, can_export_zip: false }, false, true, false],
    ['moderation only', { can_setup: false, can_moderate: true, can_export_zip: false }, true, false, false],
    ['export only', { can_setup: false, can_moderate: false, can_export_zip: true }, false, false, true],
  ] as const)('exposes independent navigation actions for %s', async (_label, permissions, gallery, setup, exportZip) => {
    renderShell({ relationship: 'COLLABORATOR', permission_version: 2, collaborator_permissions: permissions });
    await screen.findByText('workspace child');
    const galleryAnchor = document.querySelector(`a[href="/album/${albumId}/galeri"]`);
    const permissionAnchor = document.querySelector(`a[href="/album/${albumId}/izin"]`);
    await waitFor(() => expect(document.querySelector(gallery ? `a[href="/album/${albumId}/galeri"]` : `a[href="/album/${albumId}/izin"]`)).toBeInTheDocument());
    expect(gallery ? permissionAnchor : galleryAnchor).not.toBeInTheDocument();
    clickMenu('Lainnya');
    const menu = screen.getAllByRole('menu')[0]!;
    expect(menu.querySelectorAll(`a[href^="/album/${albumId}/setup/"]`).length > 0).toBe(setup);
    expect(menu.querySelector(`a[href="/album/${albumId}/ekspor"]`) !== null).toBe(exportZip);
    clickMenu('Kelola');
    const manageMenu = screen.getAllByRole('menu')[0]!;
    expect(manageMenu.querySelector(`a[href="/album/${albumId}/galeri"]`) !== null).toBe(gallery);
  });

  it('keeps all-false collaborators on relationship surfaces only', async () => {
    renderShell({ relationship: 'COLLABORATOR', permission_version: 4, collaborator_permissions: { can_setup: false, can_moderate: false, can_export_zip: false } });
    await screen.findByText('workspace child');
    expect(document.querySelector(`a[href="/album/${albumId}/izin"]`)).toBeInTheDocument();
    clickMenu('Lainnya');
    const menu = screen.getAllByRole('menu')[0]!;
    for (const href of [`/album/${albumId}/izin`, `/album/${albumId}/berbagi`, `/album/${albumId}/berbagi/panduan`]) {
      expect(menu.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
    }
    for (const href of [`/album/${albumId}/galeri`, `/album/${albumId}/ekspor`, `/album/${albumId}/pembayaran`, `/album/${albumId}/kolaborator`, `/album/${albumId}/pemulihan`]) {
      expect(menu.querySelector(`a[href="${href}"]`)).not.toBeInTheDocument();
    }
  });

  it('removes moderation UI when refreshed actor_access revokes can_moderate', async () => {
    app.access
      .mockResolvedValueOnce({ status: 200, data: { data: { readiness: 'DRAFT', actor_access: { relationship: 'COLLABORATOR', permission_version: 1, collaborator_permissions: { can_setup: false, can_moderate: true, can_export_zip: false } } } } })
      .mockResolvedValueOnce({ status: 200, data: { data: { readiness: 'DRAFT', actor_access: { relationship: 'COLLABORATOR', permission_version: 2, collaborator_permissions: { can_setup: false, can_moderate: false, can_export_zip: false } } } } });
    app.pathname = `/album/${albumId}`;
    render(<LocaleProvider><HostShell><p>workspace child</p></HostShell></LocaleProvider>);
    await waitFor(() => expect(document.querySelector(`a[href="/album/${albumId}/galeri"]`)).toBeInTheDocument());
    window.dispatchEvent(new Event('kepotret:album-access-refresh'));
    await waitFor(() => expect(document.querySelector(`a[href="/album/${albumId}/galeri"]`)).not.toBeInTheDocument());
    expect(document.querySelector(`a[href="/album/${albumId}/izin"]`)).toBeInTheDocument();
  });
});
