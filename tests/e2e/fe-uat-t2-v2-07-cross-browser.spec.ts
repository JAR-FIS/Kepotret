import { expect, test, type Page } from '@playwright/test';
import { uatIds } from '../uat/constants';
import { installUatApi } from '../uat/mock-api';

async function expectEntryFrame(page: Page) {
  const header = await page.locator('main header').boundingBox();
  const card = await page.locator('main > div > section').boundingBox();
  const home = await page.locator('main a[href="/"]').last().boundingBox();
  await expect(page.getByRole('link', { name: 'Kepotret', exact: true })).toBeVisible();
  expect(header!.y).toBeLessThan(card!.y);
  expect(home!.y).toBeGreaterThan(card!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test('T2-46 Guest entry frame covers welcome, PIN, consent, ready and closed @cross-browser', async ({ page }) => {
  await installUatApi(page);
  await page.goto(`/j/${uatIds.link}?uat=pin#synthetic-owner-uat-secret`);
  await expect(page.getByRole('button', { name: 'Lanjut' })).toBeVisible();
  await expectEntryFrame(page);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await expect(page.getByLabel('PIN acara')).toBeVisible();
  await expectEntryFrame(page);
  await page.getByLabel('Nama tampilan').fill('Tamu UAT');
  await page.getByLabel('PIN acara').fill('1234');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await expect(page.getByRole('checkbox')).toBeVisible();
  await expectEntryFrame(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
  await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeVisible();
  await expectEntryFrame(page);
  await page.goto(`/j/${uatIds.link}?uat=closed#synthetic-owner-uat-secret`);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByLabel('Nama tampilan').fill('Tamu UAT');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setuju & Lanjutkan' }).click();
  await expect(page.getByText('Sesi foto telah ditutup', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buka kamera' })).toHaveCount(0);
  await expectEntryFrame(page);
});

test('T2-05 Gallery selection stays keyboard accessible and does not overflow @cross-browser', async ({ page }) => {
  await installUatApi(page);
  await page.goto(`/j/${uatIds.link}/galeri?uat=revealed#synthetic-owner-uat-secret`);
  const selection = page.getByRole('button', { name: 'Pilih foto' });
  await expect(selection).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await selection.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Dipilih: 0 dari 20')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh ZIP' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Pilih foto oleh Ari UAT' }).check();
  await expect(page.getByText('Dipilih: 1 dari 20')).toBeVisible();
  await page.getByRole('button', { name: 'Selesai memilih' }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
