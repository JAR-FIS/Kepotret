import { expect, test } from '@playwright/test';
import type { AlbumDetail, AlbumListEnvelope, AlbumEnvelope } from '../../src/lib/api/generated/index.schemas';

const albumId = '11111111-1111-4111-8111-111111111111';
const draft: AlbumDetail = {
  album_id: albumId,
  readiness: 'DRAFT',
  capture_state: 'NOT_STARTED',
  reveal_state: 'HIDDEN',
  setup_revision: 1,
  schedule_version: 0,
  access_version: 0,
  export_revision: 0,
  guest_count_final: null,
};

test('Host can create a draft and visit the FE-3 setup routes using contract-shaped API responses', async ({ page }) => {
  const albumList: AlbumListEnvelope = { data: [], meta: { next_cursor: null, has_more: false } };
  await page.route('**/api/v1/security/csrf', (route) => route.fulfill({ json: { data: { csrf_token: 'test-csrf' } } }));
  await page.route('**/api/v1/albums', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      const body = route.request().postDataJSON() as { timezone?: string };
      expect(body.timezone).toBeTruthy();
      const response: AlbumEnvelope = { data: draft };
      return route.fulfill({ status: 201, json: response });
    }
    return route.fulfill({ status: 200, json: albumList });
  });
  await page.route(`**/api/v1/albums/${albumId}`, (route) => route.fulfill({ status: 200, json: { data: draft } }));

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Buat Album' }).first().click();
  await expect(page).toHaveURL('/album/baru');
  await page.getByRole('button', { name: 'Buat draft dan lanjutkan' }).click();
  await expect(page).toHaveURL(`/album/${albumId}/setup/acara`);

  for (const [step, label] of [
    ['jadwal', 'Jadwal & reveal'],
    ['akses', 'Akses & privasi'],
    ['moderasi', 'Batas & moderasi'],
    ['desain', 'Desain'],
    ['paket', 'Paket'],
    ['kolaborator', 'Kolaborator'],
    ['review', 'Review setup'],
  ]) {
    await page.getByRole('navigation', { name: 'Persiapan album' }).getByRole('link', { name: new RegExp(`${label}$`) }).click();
    await expect(page).toHaveURL(`/album/${albumId}/setup/${step}`);
  }

  await page.goto(`/album/${albumId}/siap`);
  await expect(page.getByRole('heading', { name: 'Album belum siap' })).toBeVisible();

  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
});
