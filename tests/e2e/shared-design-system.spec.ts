import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

test('shared typography, language, theme, and logo work at desktop and mobile sizes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.context().clearCookies();
    await page.goto('/');
    if (viewport.width < 1024) await page.getByRole('button', { name: /menu navigasi|navigation menu/ }).click();

    await expect(page.getByRole('button', { name: 'Bahasa: ID' })).toHaveText('ID');

    const fontFamilies = await page.evaluate(() => ({
      body: getComputedStyle(document.body).fontFamily,
      bodyVariable: getComputedStyle(document.documentElement).getPropertyValue('--font-plus-jakarta-sans').trim(),
      heading: getComputedStyle(document.querySelector('h1')!).fontFamily,
      displayVariable: getComputedStyle(document.documentElement).getPropertyValue('--font-space-grotesk').trim(),
    }));
    expect(fontFamilies.body).toContain(fontFamilies.bodyVariable);
    expect(fontFamilies.heading).toContain(fontFamilies.displayVariable);

    for (const language of ['id', 'en'] as const) {
      const current = await page.locator('html').getAttribute('lang');
      if (current !== language) {
        const triggerLabel = current === 'id' ? 'Bahasa: ID' : 'Language: ENG';
        const listboxLabel = current === 'id' ? 'Bahasa' : 'Language';
        const optionLabel = language === 'en' ? 'Bahasa Inggris' : 'Indonesian';
        await page.getByRole('button', { name: triggerLabel }).click();
        await page.getByRole('listbox', { name: listboxLabel }).getByRole('option', { name: optionLabel }).click();
      }
      await expect(page.locator('html')).toHaveAttribute('lang', language);

      for (const theme of ['light', 'dark'] as const) {
        const isDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
        if ((theme === 'dark') !== isDark) {
          const toggleName = language === 'id'
            ? (theme === 'dark' ? 'Ganti ke tema gelap' : 'Ganti ke tema terang')
            : (theme === 'dark' ? 'Switch to dark theme' : 'Switch to light theme');
          await page.getByRole('button', { name: toggleName }).click();
        }
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /(?!.*dark).*/);

        const logos = page.locator('header a[aria-label="Kepotret"] img');
        await expect(logos.nth(theme === 'dark' ? 1 : 0)).toBeVisible();
        await expect(logos.nth(theme === 'dark' ? 0 : 1)).toBeHidden();
      }
    }

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalOverflow, `${viewport.name} viewport has no horizontal overflow`).toBe(false);
  }
});

test('Assistant launcher stays out of the composer at desktop and mobile sizes', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    const launcher = page.getByRole('button', { name: 'Buka Asisten AI' });
    await expect(launcher).toHaveClass(/size-12/);
    await launcher.click();

    const dialog = page.getByRole('dialog', { name: 'Asisten Kepotret' });
    await expect(dialog).toBeVisible();
    await expect(launcher).toBeHidden();
    const input = page.getByRole('textbox', { name: 'Pesan untuk Asisten' });
    const send = page.getByRole('button', { name: 'Kirim pertanyaan' });
    await input.fill('Pertanyaan uji');
    const [inputBox, sendBox, dialogBox] = await Promise.all([input.boundingBox(), send.boundingBox(), dialog.boundingBox()]);
    expect(inputBox).not.toBeNull();
    expect(sendBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(sendBox!.x);
    expect(dialogBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(dialogBox!.width).toBeLessThanOrEqual(viewport.width);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(launcher).toBeFocused();
  }
});
