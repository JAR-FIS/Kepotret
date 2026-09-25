import { expect, test } from '@playwright/test';

const viewportWidths = [320, 390, 768, 1024, 1280];

test('reference route stays usable without horizontal overflow at supported widths', async ({ page }) => {
  await page.goto('/dev/ui-reference');

  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: /Kepotret/i })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }

  const locale = page.getByRole('combobox', { name: 'Bahasa' });
  await locale.selectOption('en');
  await expect(page.getByRole('heading', { name: 'Kepotret, made for real moments.' })).toBeVisible();

  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }

  const themeButton = page.getByRole('button', { name: 'Switch to dark theme' });
  const bounds = await themeButton.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await themeButton.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
