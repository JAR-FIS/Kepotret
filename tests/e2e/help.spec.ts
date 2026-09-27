import { expect, test } from '@playwright/test';

test('Help and the 19-step Host guide work in Indonesian and English across viewports', async ({ page }) => {
  await page.goto('/help');
  await expect(page.getByRole('heading', { name: 'Siapkan album, bagikan momen.' })).toBeVisible();
  await page.getByRole('link', { name: 'Buka panduan Host' }).click();
  await expect(page).toHaveURL('/help/host');
  await expect(page.locator('main li[id]')).toHaveCount(19);
  await expect(page.getByRole('heading', { name: 'Waktu Potret' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edit pengaturan album' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mulai buat album' })).toHaveAttribute('href', '/album/baru');
  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(size.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(size.viewport);
  }
  const contentsLink = page.getByRole('navigation', { name: 'Isi panduan' }).getByRole('link', { name: /Siapkan pengalaman peserta/ });
  await contentsLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#siapkan-aturan$/);
  await expect(page.getByRole('link', { name: /collaborator|admin|kolaborator|superadmin/i })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Bahasa' }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'From a new album to the final moment.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edit album settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('main li[id]')).toHaveCount(19);
});
