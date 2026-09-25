import { expect, test } from '@playwright/test';

test('homepage renders the frontend foundation status', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('status')).toHaveText(
    'Frontend foundation is ready.',
  );
});
