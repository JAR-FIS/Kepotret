import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { installUatApi } from '../uat/mock-api';
import { uatIds } from '../uat/constants';

async function capture(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo, filename: string) {
  if (testInfo.project.name !== 'chromium') return;
  const evidenceDirectory = testInfo.outputPath('FE-UAT-V2-01-evidence');
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: `${evidenceDirectory}/${filename}`, animations: 'disabled' });
}

async function setLocale(page: import('@playwright/test').Page, locale: 'id' | 'en') {
  await page.context().addCookies([{ name: 'kepotret-locale', value: locale, domain: 'localhost', path: '/' }]);
}

async function chooseLocale(page: import('@playwright/test').Page, locale: 'id' | 'en') {
  if (await page.locator('html').getAttribute('lang') === locale) return;
  const currentShort = locale === 'en' ? 'ID' : 'ENG';
  await page.locator(`button[aria-label$=": ${currentShort}"]`).first().click();
  await page.getByRole('listbox').last().getByRole('option').nth(locale === 'en' ? 1 : 0).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

async function setTheme(page: import('@playwright/test').Page, dark: boolean, mobile = false) {
  const isDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  if (isDark === dark) return;
  if (mobile) await page.getByRole('button', { name: /buka menu navigasi|open navigation menu/i }).click();
  const label = dark ? /ganti ke tema gelap|switch to dark theme/i : /ganti ke tema terang|switch to light theme/i;
  await page.getByRole('button', { name: label }).click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(dark);
  if (mobile) await page.getByRole('button', { name: /tutup menu navigasi|close navigation menu/i }).click();
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const { viewport, documentWidth } = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(documentWidth).toBeLessThanOrEqual(viewport + 1);
}

test('@cross-browser FE-UAT-V2-01 Assistant, H20 password, H01 Dark Mode, and Host selects remain accessible', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await installUatApi(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const launcherId = page.getByRole('button', { name: 'Buka Asisten AI' });
  await expect(launcherId).toBeVisible();
  await capture(page, testInfo, 'assistant-launcher-id-light.png');
  await launcherId.focus();
  await page.keyboard.press('Enter');
  const assistantId = page.getByRole('dialog', { name: 'Asisten Kepotret' });
  await expect(assistantId).toBeVisible();
  await expect(assistantId.getByRole('button', { name: 'Bagaimana cara kerja album acara?' })).toBeVisible();
  await expect(assistantId.getByRole('button', { name: 'Apa yang dapat saya lakukan di halaman ini?' })).toBeVisible();
  await expect(assistantId.getByRole('button', { name: 'Bagaimana cara tamu mengambil foto?' })).toBeVisible();
  await expect(assistantId.locator('textarea')).toBeFocused();
  await expect(assistantId).toHaveCSS('opacity', '1');
  await capture(page, testInfo, 'assistant-panel-id-light.png');
  await page.keyboard.press('Escape');
  await expect(assistantId).toBeHidden();
  await expect(launcherId).toBeFocused();

  await chooseLocale(page, 'en');
  await page.setViewportSize({ width: 390, height: 844 });
  await setTheme(page, true, true);
  const launcherEn = page.locator('button[aria-controls="assistant-dialog"]');
  await expect(launcherEn).toHaveAccessibleName('Open AI Assistant');
  await expect(launcherEn).toBeVisible();
  await launcherEn.click();
  const assistantEn = page.getByRole('dialog', { name: 'Kepotret Assistant' });
  await expect(assistantEn).toBeVisible();
  const composer = assistantEn.getByRole('textbox', { name: 'Message to the Assistant' });
  const send = assistantEn.getByRole('button', { name: 'Send question' });
  await expect(assistantEn).toHaveCSS('opacity', '1');
  const launcherBox = await launcherEn.boundingBox();
  const [composerBox, sendBox, panelBox] = await Promise.all([composer.boundingBox(), send.boundingBox(), assistantEn.boundingBox()]);
  expect(launcherBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect(sendBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(composerBox!.x + composerBox!.width).toBeLessThanOrEqual(sendBox!.x);
  expect(panelBox!.width).toBeLessThanOrEqual(390);
  expect(panelBox!.height).toBeLessThanOrEqual(844);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(launcherBox!.y);
  await capture(page, testInfo, 'assistant-panel-en-dark-mobile.png');
  await page.keyboard.press('Escape');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await launcherEn.click();
  await expect(assistantEn).toBeVisible();
  expect(await assistantEn.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, false);
  await page.locator('#cara-kerja').scrollIntoViewIfNeeded();
  expect(await page.locator('#cara-kerja').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(10, 10, 10)');
  await capture(page, testInfo, 'h01-light.png');
  await setTheme(page, true);
  const darkSections = await page.locator('section').evaluateAll((elements) => elements.filter((element) => element.className.includes('dark:bg-[#181818]')).map((element) => getComputedStyle(element).backgroundColor));
  expect(darkSections.length).toBeGreaterThanOrEqual(4);
  expect(darkSections.every((color) => color === 'rgb(24, 24, 24)')).toBe(true);
  expect(await page.locator('#cara-kerja').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(24, 24, 24)');
  await capture(page, testInfo, 'h01-dark.png');

  await setLocale(page, 'en');
  await page.goto('/admin/masuk');
  await expect(page.locator('form[data-admin-auth-ready="true"]')).toBeVisible();
  const password = page.locator('input[name="password"]');
  await password.fill('synthetic-admin-password');
  await capture(page, testInfo, 'h20-password-masked-en.png');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('synthetic-admin-password');
  await capture(page, testInfo, 'h20-password-visible-en.png');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await setLocale(page, 'id');
  await page.goto(`/album/${uatIds.album}/setup/jadwal`);
  const reveal = page.getByRole('combobox', { name: 'Jeda reveal' });
  await expect(reveal).toBeVisible();
  await reveal.click();
  const revealMenu = page.getByRole('listbox', { name: 'Jeda reveal' });
  await expect(revealMenu.getByRole('option', { name: 'D+3' })).toBeVisible();
  const revealBox = await revealMenu.boundingBox();
  expect(revealBox).not.toBeNull();
  await capture(page, testInfo, 'h29-reveal-menu-id-light.png');
  await revealMenu.getByRole('option', { name: /Mulai saat acara.*pratinjau/i }).click();
  await expect(page.getByText(/Pratinjau LIVE saja/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Simpan jadwal/i })).toBeDisabled();

  await setLocale(page, 'en');
  await page.goto(`/album/${uatIds.album}/galeri`);
  await expect(page.getByText('Ari UAT')).toBeVisible();
  const sort = page.getByRole('combobox', { name: 'Sort' });
  await sort.click();
  const sortMenu = page.getByRole('listbox', { name: 'Sort' });
  await expect(sortMenu.getByRole('option', { name: 'Oldest' })).toBeVisible();
  const sortBox = await sortMenu.boundingBox();
  expect(sortBox).not.toBeNull();
  expect(sortBox!.x).toBeGreaterThanOrEqual(0);
  expect(sortBox!.x + sortBox!.width).toBeLessThanOrEqual(1440);
  await capture(page, testInfo, 'h42-sort-menu-en-light.png');
  await page.keyboard.press('Escape');
  const reload = page.getByRole('button', { name: 'Reload' });
  await reload.hover();
  expect(await reload.evaluate((element) => getComputedStyle(element).cursor)).toBe('pointer');
  await capture(page, testInfo, 'host-button-hover-en-light.png');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileStatus = page.getByRole('combobox', { name: 'Moderation status' });
  await mobileStatus.click();
  const mobileMenu = page.getByRole('listbox', { name: 'Moderation status' });
  const mobileMenuBox = await mobileMenu.boundingBox();
  expect(mobileMenuBox).not.toBeNull();
  expect(mobileMenuBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileMenuBox!.x + mobileMenuBox!.width).toBeLessThanOrEqual(390);
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, false);
  await page.goto(`/album/${uatIds.album}/pengaturan`);
  const visibility = page.getByRole('combobox', { name: 'Gallery visibility' });
  await visibility.click();
  const visibilityMenu = page.getByRole('listbox', { name: 'Gallery visibility' });
  await expect(visibilityMenu.getByRole('option', { name: 'Host only' })).toBeVisible();
  await capture(page, testInfo, 'h57-visibility-menu-en-light.png');

  await setLocale(page, 'id');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pengaturan album' })).toBeVisible();
  await setTheme(page, true);
  const visibilityId = page.getByRole('combobox', { name: 'Visibilitas galeri' });
  await visibilityId.click();
  const visibilityMenuId = page.getByRole('listbox', { name: 'Visibilitas galeri' });
  await expect(visibilityMenuId.getByRole('option', { name: 'Hanya Host' })).toBeVisible();
  await capture(page, testInfo, 'h57-visibility-menu-id-dark.png');
  await expectNoHorizontalOverflow(page);
});
