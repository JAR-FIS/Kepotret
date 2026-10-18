import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';
import { uatSchedule } from '../uat/fixtures';

const evidenceDirectory = 'docs/reviews/FE-UAT-V2-02/evidence';

async function openSchedule(page: Page, route: 'h29' | 'h53') {
  await page.goto(`/album/${uatIds.album}/${route === 'h29' ? 'setup/jadwal' : 'jadwal-ulang'}`);
  await expect(page.getByRole('textbox', { name: 'Jam mulai memotret', exact: true })).toHaveValue('16:00');
}

async function setTheme(page: Page, dark: boolean) {
  const current = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  if (current === dark) return;
  await page.getByRole('button', { name: dark ? /ganti ke tema gelap|switch to dark theme/i : /ganti ke tema terang|switch to light theme/i }).click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(dark);
}

test('@cross-browser H29 and H53 disable same-day invalid time choices but preserve overnight choices', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  for (const route of ['h29', 'h53'] as const) {
    await openSchedule(page, route);
    await page.getByRole('textbox', { name: 'Tanggal berhenti memotret', exact: true }).fill('2026-10-01');
    await page.getByRole('button', { name: 'Buka pilihan jam untuk Jam berhenti memotret' }).click();
    const hours = page.getByRole('group', { name: 'Jam', exact: true });
    const minutes = page.getByRole('group', { name: 'Menit' });
    await expect(hours.getByRole('button', { name: '03' })).toBeDisabled();
    await expect(hours.getByRole('button', { name: '16' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(minutes.getByRole('button', { name: '01' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(hours.getByRole('button', { name: '16' })).toBeFocused();
    await hours.getByRole('button', { name: '16' }).click();
    await expect(minutes.getByRole('button', { name: '00' })).toBeDisabled();
    await expect(minutes.getByRole('button', { name: '01' })).toBeEnabled();
    await minutes.getByRole('button', { name: '01' }).click();
    await expect(page.getByRole('textbox', { name: 'Jam berhenti memotret', exact: true })).toHaveValue('16:01');
    await page.getByRole('textbox', { name: 'Tanggal berhenti memotret', exact: true }).fill('2026-10-02');
    await page.getByRole('button', { name: 'Buka pilihan jam untuk Jam berhenti memotret' }).click();
    await expect(page.getByRole('group', { name: 'Jam', exact: true }).getByRole('button', { name: '03' })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: 'Jam berhenti memotret', exact: true })).toBeFocused();
  }
});

test('@cross-browser H53 reveal dropdown blocks LIVE persistence and renders readable proposed times', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  let posts = 0;
  page.on('request', (request) => { if (request.url().endsWith('/reschedule') && request.method() === 'POST') posts += 1; });
  await openSchedule(page, 'h53');
  await expect(page.getByRole('region', { name: 'Tinjauan perubahan' })).not.toContainText(/\d{4}-\d{2}-\d{2}T/);
  await page.getByRole('textbox', { name: 'Jam berhenti memotret', exact: true }).fill('bad');
  await expect(page.getByRole('region', { name: 'Tinjauan perubahan' })).toContainText('Belum lengkap');
  await expect(page.getByRole('region', { name: 'Tinjauan perubahan' })).not.toContainText('Tbad');
  await page.getByRole('combobox', { name: 'Jeda publikasi (hari)' }).click();
  await page.getByRole('option', { name: /LIVE/ }).click();
  await expect(page.getByText(/Pratinjau LIVE saja/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tinjau jadwal' })).toBeDisabled();
  expect(posts).toBe(0);
  await page.getByRole('combobox', { name: 'Jeda publikasi (hari)' }).click();
  await page.getByRole('option', { name: 'D+3' }).click();
  await expect(page.getByRole('combobox', { name: 'Jeda publikasi (hari)' })).toHaveText('D+3');
});

test('H29 calendar keyboard and H53 server eligibility and boundaries', async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  await openSchedule(page, 'h29');
  const startDate = page.getByRole('textbox', { name: 'Tanggal mulai memotret', exact: true });
  await page.getByRole('button', { name: 'Buka kalender untuk Tanggal mulai memotret' }).click();
  await expect(page.locator('[data-date="2026-10-01"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-date="2026-10-02"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(startDate).toHaveValue('2026-10-02');
  await expect(startDate).toBeFocused();
  await page.getByRole('button', { name: 'Buka kalender untuk Tanggal mulai memotret' }).click();
  await page.mouse.click(1200, 450);
  await expect(page.getByRole('dialog', { name: 'Kalender untuk Tanggal mulai memotret' })).toHaveCount(0);

  let eligible = false;
  await page.route(`**/api/v1/albums/${uatIds.album}/schedule`, (route) => route.fulfill({ status: 200, json: { data: {
    ...uatSchedule,
    can_reschedule: eligible,
    earliest_capture_start: '2026-10-01T09:00:00Z',
    latest_capture_start: '2026-10-03T09:00:00Z',
  } } }));
  await openSchedule(page, 'h53');
  await expect(page.getByRole('textbox', { name: 'Tanggal mulai memotret', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tinjau jadwal' })).toBeDisabled();
  eligible = true;
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Tanggal mulai memotret', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Buka kalender untuk Tanggal mulai memotret' }).click();
  await expect(page.getByRole('button', { name: 'Bulan sebelumnya' })).toBeDisabled();
  await expect(page.locator('[data-date="2026-10-04"]')).toBeDisabled();
  await page.keyboard.press('Escape');
});

test('H29 preserves a stored date while focusing the first selectable day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-18T00:00:00Z'));
  await installUatApi(page);
  await page.goto(`/album/${uatIds.album}/setup/jadwal`);
  const startDate = page.getByRole('textbox', { name: 'Tanggal mulai memotret', exact: true });
  await expect(startDate).toHaveValue('2026-10-01');
  await page.getByRole('button', { name: 'Buka kalender untuk Tanggal mulai memotret' }).click();
  await expect(page.locator('[data-date="2026-10-18"]')).toBeFocused();
  await expect(startDate).toHaveValue('2026-10-01');
});

test('synthetic H29 and H53 opened picker evidence covers desktop and narrow viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date('2026-09-27T00:00:00Z'));
  await installUatApi(page);
  mkdirSync(evidenceDirectory, { recursive: true });
  const views = [
    { name: 'desktop-light-id', width: 1440, height: 900, dark: false, locale: 'id' },
    { name: 'desktop-dark-en', width: 1440, height: 900, dark: true, locale: 'en' },
    { name: 'mobile-360-light-id', width: 360, height: 780, dark: false, locale: 'id' },
    { name: 'mobile-390-dark-en', width: 390, height: 844, dark: true, locale: 'en' },
  ] as const;
  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: view.locale, domain: 'localhost', path: '/' }]);
    for (const route of ['h29', 'h53'] as const) {
      await page.goto(`/album/${uatIds.album}/${route === 'h29' ? 'setup/jadwal' : 'jadwal-ulang'}`);
      await expect(page.getByRole('textbox', { name: view.locale === 'id' ? 'Tanggal mulai memotret' : 'Capture start date', exact: true })).toBeVisible();
      await setTheme(page, view.dark);
      const dateLabel = view.locale === 'id' ? 'Tanggal mulai memotret' : 'Capture start date';
      const timeLabel = view.locale === 'id' ? 'Jam berhenti memotret' : 'Capture end time';
      await page.getByRole('button', { name: view.locale === 'id' ? `Buka kalender untuk ${dateLabel}` : `Open calendar for ${dateLabel}` }).click();
      await expect(page.getByRole('dialog', { name: view.locale === 'id' ? `Kalender untuk ${dateLabel}` : `Calendar for ${dateLabel}` })).toBeVisible();
      await page.screenshot({ path: `${evidenceDirectory}/${route}-${view.name}-calendar-open.png`, animations: 'disabled' });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: view.locale === 'id' ? `Buka pilihan jam untuk ${timeLabel}` : `Open time choices for ${timeLabel}` }).click();
      await expect(page.getByRole('dialog', { name: view.locale === 'id' ? `Pilihan jam untuk ${timeLabel}` : `Time choices for ${timeLabel}` })).toBeVisible();
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport + 1);
      await page.screenshot({ path: `${evidenceDirectory}/${route}-${view.name}-time-open.png`, animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
  }
});
