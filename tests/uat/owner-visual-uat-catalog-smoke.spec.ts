import { expect, test } from '@playwright/test';
import { uatEventName, uatIds, uatNow } from './constants';
import { installUatApi } from './mock-api';
import { excludedCatalogSurfaces, uatCatalogRoutes } from './route-manifest';

const fatalPage = /Application error|Internal Server Error|Unhandled Runtime Error|Halaman belum dapat dimuat|This page could not be loaded/i;

test('documented UAT catalog URLs boot against synthetic fixtures', async ({ page }) => {
  test.setTimeout(0);
  await installUatApi(page);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  expect(excludedCatalogSurfaces).toEqual([
    { hId: 'H11', reason: 'Framework-only error boundary; no production route is defined.' },
  ]);

  for (const route of uatCatalogRoutes) {
    pageErrors.length = 0;
    const response = await page.goto(route.url, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main, `${route.hId} ${route.scenario} rendered its main surface`).toBeVisible();

    const bodyText = (await main.innerText()).trim();
    expect(bodyText.length, `${route.hId} ${route.scenario} rendered meaningful content`).toBeGreaterThan(10);
    expect(bodyText, `${route.hId} ${route.scenario} did not render a fatal Next.js error`).not.toMatch(fatalPage);
    expect(response?.status() ?? 200, `${route.hId} ${route.scenario} response`).toBeLessThan(500);
    if (route.hId === 'H09') expect(response?.status()).toBe(404);
    else expect(response?.status(), `${route.hId} ${route.scenario} unexpectedly rendered not-found`).not.toBe(404);
    expect(pageErrors, `${route.hId} ${route.scenario} uncaught page errors`).toEqual([]);

    if (route.hId === 'H17' && route.scenario === 'normal') {
      await expect(page.getByText(uatEventName).first()).toBeVisible();
      await expect(page.getByText('in***@kepotret.test')).toBeVisible();
    }

    if (route.hId === 'H18') {
      const expectedState = route.scenario;
      await expect(page).toHaveURL(new RegExp(`/undangan/kolaborator/tidak-valid\\?state=${expectedState}$`));
    }

    if (route.hId === 'H52') {
      const time = page.locator(`time[datetime="${uatNow}"]`);
      await expect(time).toBeVisible();
      expect((await time.innerText()).trim().length).toBeGreaterThan(0);
      await expect(page.getByText(/Pemilik UAT/).first()).toBeVisible();
    }
  }
});

test('H17 accept uses the synthetic invitation contract without exposing a secret', async ({ page }) => {
  await installUatApi(page);
  await page.goto(`/undangan/kolaborator/${uatIds.invitation}?uat=normal#owner-visual-uat-synthetic-invitation-secret`);

  await expect(page.getByText(uatEventName).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terima undangan' })).toBeVisible();
  await page.getByRole('button', { name: 'Terima undangan' }).click();
  await expect(page).toHaveURL(new RegExp(`/album/${uatIds.album}$`));
  expect(page.url()).not.toContain('owner-visual-uat-synthetic-invitation-secret');
});
