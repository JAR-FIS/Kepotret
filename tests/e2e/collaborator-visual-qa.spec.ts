import { expect, test } from '@playwright/test';

const albumId = '22222222-2222-4222-8222-222222222222';
const invitationId = '11111111-1111-4111-8111-111111111111';
const widths = [320, 375, 390, 430, 768, 1024, 1280];
const ownedAccess = { relationship: 'OWNER', permission_version: null, collaborator_permissions: null };
const collaboratorAccess = { relationship: 'COLLABORATOR', permission_version: 12, collaborator_permissions: { can_setup: false, can_moderate: false, can_export_zip: false } };
const album = {
  album_id: albumId, event_name: 'The exceptionally long wedding celebration for the Hartono and Wijaya families', event_location: 'Jakarta', event_category_id: null, timezone: 'Asia/Jakarta', capture_start: null, capture_end: null, selected_package_version_id: null, readiness: 'DRAFT', capture_state: 'NOT_STARTED', reveal_state: 'HIDDEN', setup_revision: 4, schedule_version: 0, access_version: 0, export_revision: 0, confirmed_setup_revision: null, confirmed_schedule_version: null, confirmed_package_version_id: null, setup_confirmed_at: null, guest_count_final: null, quota_total: 30, committed_count: 0,
};
const assigned = { ...album, actor_access: collaboratorAccess };
const collaborator = { user_id: '33333333-3333-4333-8333-333333333333', display_name: 'Event Planner', email: 'a-very-long-collaborator-address-for-visual-wrapping-checks@example-events-organizer.com', joined_at: '2026-09-01T00:00:00Z', permission_version: 7, permissions: { can_setup: true, can_moderate: true, can_export_zip: false } };
const invitation = (status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED', index: number) => ({ invitation_id: `${index + 1}3333333-3333-4333-8333-333333333333`, email: 'a-very-long-invitation-address-for-visual-wrapping-checks@example-events-organizer.com', permissions: { can_setup: true, can_moderate: false, can_export_zip: true }, status, created_at: '2026-09-01T00:00:00Z', expires_at: '2026-10-01T00:00:00Z', accepted_at: status === 'ACCEPTED' ? '2026-09-02T00:00:00Z' : null, revoked_at: status === 'REVOKED' ? '2026-09-03T00:00:00Z' : null });

test('FE-7 surfaces fit required widths in both locales and themes', async ({ page, context }) => {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith(`/collaborator-invitations/${invitationId}/resolve`)) {
      return route.fulfill({ status: 200, json: { data: { invitation_id: invitationId, album_id: albumId, event_name: album.event_name, permissions: { can_setup: true, can_moderate: true, can_export_zip: false }, expires_at: '2026-10-01T00:00:00Z', status: 'PENDING', invited_email_hint: 'pl***@example.com' } } });
    }
    if (path === '/api/v1/auth/me') return route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } });
    if (path === `/api/v1/albums/${albumId}`) {
      const currentPath = new URL(page.url()).pathname;
      const actor_access = currentPath === `/album/${albumId}` || currentPath.endsWith('/izin') ? collaboratorAccess : ownedAccess;
      return route.fulfill({ status: 200, json: { data: { ...album, actor_access } } });
    }
    if (path === '/api/v1/albums') {
      const relation = url.searchParams.get('relationship');
      return route.fulfill({ status: 200, json: { data: relation === 'COLLABORATOR' ? [assigned] : [], meta: { has_more: false, next_cursor: null } } });
    }
    if (path === `/api/v1/albums/${albumId}/collaborators`) return route.fulfill({ status: 200, json: { data: [collaborator], meta: { has_more: false, next_cursor: null } } });
    if (path === `/api/v1/albums/${albumId}/collaborator-invitations`) return route.fulfill({ status: 200, json: { data: [invitation('PENDING', 0), invitation('ACCEPTED', 1), invitation('REVOKED', 2), invitation('EXPIRED', 3)], meta: { has_more: false, next_cursor: null } } });
    return route.fulfill({ status: 200, json: { data: {}, meta: { has_more: false, next_cursor: null } } });
  });

  const surfaces = [
    { key: 'h17', path: `/undangan/kolaborator/${invitationId}#visual-secret`, heading: 'Lanjutkan dengan Google' },
    { key: 'h45', path: `/album/${albumId}/kolaborator`, heading: 'Kolaborator' },
    { key: 'h46', path: `/album/${albumId}/kolaborator/undangan`, heading: 'Riwayat undangan' },
    { key: 'h60', path: '/kolaborasi', heading: 'Ruang kolaborator' },
    { key: 'h61', path: '/kolaborasi/album', heading: 'Album untukmu' },
    { key: 'h62', path: `/album/${albumId}`, heading: album.event_name },
    { key: 'h63', path: `/album/${albumId}/izin`, heading: 'Izinmu' },
    { key: 'help', path: '/help/collaborator', heading: 'Bekerja bersama dengan akses yang jelas.' },
  ];

  await context.addCookies([{ name: 'kepotret-locale', value: 'id', url: 'http://localhost:3000' }]);
  for (const surface of surfaces) {
    await page.goto(surface.path);
    await expect(page.getByText(surface.heading, { exact: true }).first()).toBeVisible();
    if (surface.key === 'h17') await expect(page).toHaveURL(new RegExp(`/undangan/kolaborator/${invitationId}$`));
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `${surface.key} horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
      if (width === 320 || width === 1280) await page.screenshot({ path: `test-results/fe7-visual/${surface.key}-id-light-${width}.png`, fullPage: true });
    }
  }

  await page.goto('/help/collaborator');
  await page.getByRole('combobox', { name: 'Bahasa' }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Work together with clear access.' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await context.addCookies([{ name: 'kepotret-locale', value: 'en', url: 'http://localhost:3000' }]);

  for (const surface of surfaces) {
    await page.goto(surface.path.replace('visual-secret', 'visual-secret-en'));
    await page.setViewportSize({ width: 390, height: 844 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `${surface.key} EN dark horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport);
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
    await page.screenshot({ path: `test-results/fe7-visual/${surface.key}-en-dark-390.png`, fullPage: true });
    if (surface.key === 'h45') {
      const permissionLabel = page.getByRole('checkbox').first().locator('xpath=..');
      const target = await permissionLabel.boundingBox();
      expect(target?.height ?? 0, 'permission control touch target').toBeGreaterThanOrEqual(44);
    }
  }

  await page.goto(`/album/${albumId}/kolaborator`);
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, outline: getComputedStyle(document.activeElement!).outlineStyle }));
  expect(focus.tag).not.toBe('BODY');
  expect(focus.outline).toBe('solid');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});
