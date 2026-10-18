import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { uatIds } from '../uat/constants';
import { uatPackages } from '../uat/fixtures';
import { installUatApi } from '../uat/mock-api';

const evidenceDirectory = 'docs/reviews/FE-UAT-V4-01/evidence';

test('FE-UAT-V4-01 H01 label stays centered and unclipped at supported desktop and mobile widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  await installUatApi(page);
  mkdirSync(evidenceDirectory, { recursive: true });

  const views = [
    { name: 'desktop-1440-light-id', width: 1440, height: 900, locale: 'id', dark: false, screenshot: true },
    { name: 'mobile-360-light-id', width: 360, height: 780, locale: 'id', dark: false, screenshot: true },
    { name: 'mobile-390-dark-en', width: 390, height: 844, locale: 'en', dark: true, screenshot: true },
    { name: 'tablet-768-dark-id', width: 768, height: 900, locale: 'id', dark: true, screenshot: false },
    { name: 'desktop-1024-light-en', width: 1024, height: 800, locale: 'en', dark: false, screenshot: false },
  ] as const;

  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: view.locale, domain: 'localhost', path: '/' }]);
    await page.addInitScript(dark => localStorage.setItem('kepotret-theme', dark ? 'dark' : 'light'), view.dark);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(view.dark);

    const label = page.getByTestId('h01-fourth-phone-label');
    await expect(label).toHaveText(view.locale === 'id' ? 'Siap & Motret' : 'Ready to shoot');
    const alignment = await label.evaluate(element => {
      const text = element.querySelector('span');
      if (!text) return null;
      const box = element.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        textAlign: getComputedStyle(text).textAlign,
        horizontalCenterDelta: Math.abs((box.left + box.right) / 2 - (textBox.left + textBox.right) / 2),
        verticalCenterDelta: Math.abs((box.top + box.bottom) / 2 - (textBox.top + textBox.bottom) / 2),
        textFits: element.scrollWidth <= element.clientWidth && text.scrollWidth <= text.clientWidth,
        textInsideLabel: textBox.left >= box.left && textBox.right <= box.right && textBox.top >= box.top && textBox.bottom <= box.bottom,
      };
    });
    expect(alignment).not.toBeNull();
    expect(alignment?.display).toBe('flex');
    expect(alignment?.alignItems).toBe('center');
    expect(alignment?.justifyContent).toBe('center');
    expect(alignment?.textAlign).toBe('center');
    expect(alignment?.horizontalCenterDelta ?? Infinity).toBeLessThanOrEqual(1);
    expect(alignment?.verticalCenterDelta ?? Infinity).toBeLessThanOrEqual(1);
    expect(alignment?.textFits).toBe(true);
    expect(alignment?.textInsideLabel).toBe(true);

    const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(pageWidth.scroll, view.name).toBeLessThanOrEqual(pageWidth.client + 1);
    if (view.screenshot) {
      await label.scrollIntoViewIfNeeded();
      await label.locator('xpath=../..').screenshot({ path: `${evidenceDirectory}/h01-${view.name}.png`, animations: 'disabled' });
    }
  }
});

test('FE-UAT-V4-01 H33 places four choices left and three right, with the same sequential mobile order', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  await installUatApi(page);
  mkdirSync(evidenceDirectory, { recursive: true });

  const views = [
    { name: 'desktop-1440-light-id', width: 1440, height: 900, locale: 'id', dark: false },
    { name: 'mobile-390-dark-en', width: 390, height: 1600, locale: 'en', dark: true },
  ] as const;
  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.context().addCookies([{ name: 'kepotret-locale', value: view.locale, domain: 'localhost', path: '/' }]);
    await page.addInitScript(dark => localStorage.setItem('kepotret-theme', dark ? 'dark' : 'light'), view.dark);
    await page.goto(`/album/${uatIds.album}/setup/paket`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(view.dark);

    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(7);
    await expect(page.getByText(/LOCKED\d+/)).toHaveCount(0);
    const titles = await page.locator('[data-testid="setup-package-column"] label > span > span:first-child').allTextContents();
    expect(titles).toEqual([view.locale === 'id' ? 'Paket Gratis · 30 foto' : 'Free package · 30 photos', ...uatPackages.map(option => option.name)]);

    const columns = page.getByTestId('setup-package-column');
    await expect(columns).toHaveCount(2);
    await expect(columns.nth(0).getByRole('radio')).toHaveCount(4);
    await expect(columns.nth(1).getByRole('radio')).toHaveCount(3);
    const left = await columns.nth(0).boundingBox();
    const right = await columns.nth(1).boundingBox();
    if (view.width >= 1024) {
      expect(right?.x ?? 0).toBeGreaterThan(left?.x ?? 0);
    } else {
      expect(Math.abs((right?.x ?? 0) - (left?.x ?? 0))).toBeLessThan(2);
      expect(right?.y ?? 0).toBeGreaterThan(left?.y ?? 0);
    }

    const free = page.getByRole('radio', { name: view.locale === 'id' ? /Paket Gratis/ : /Free package/ });
    await free.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: /Paket 100 Foto/ })).toBeChecked();

    const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(pageWidth.scroll, view.name).toBeLessThanOrEqual(pageWidth.client + 1);
    if (view.width < 640) await page.locator('form').screenshot({ path: `${evidenceDirectory}/h33-${view.name}.png`, animations: 'disabled' });
    else await page.screenshot({ path: `${evidenceDirectory}/h33-${view.name}.png`, fullPage: true, animations: 'disabled' });
  }
});
