import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

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
  await expect(page.getByRole('link', { name: 'Panduan kolaborator' })).toHaveAttribute('href', '/help/collaborator');
  await page.getByRole('link', { name: 'Panduan kolaborator' }).click();
  await expect(page.getByRole('heading', { name: 'Bekerja bersama dengan akses yang jelas.' })).toBeVisible();
  await page.goto('/help/host');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('listbox', { name: 'Bahasa' }).getByRole('option', { name: 'Bahasa Inggris' }).click();
  await expect(page.getByRole('heading', { name: 'From a new album to the final moment.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edit album settings' })).toBeVisible();
  await page.getByRole('link', { name: 'Collaborator guide' }).click();
  await expect(page.getByRole('heading', { name: 'Work together with clear access.' })).toBeVisible();
  await page.goto('/help/host');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('main li[id]')).toHaveCount(19);
});

test('T2-40/41/42 shared footer follows Admin, Host, and Collaborator guide content', async ({ page }) => {
  for (const route of ['/help/admin', '/help/host', '/help/collaborator']) {
    await page.goto(route);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toHaveCount(1);
    await expect(footer.getByRole('navigation', { name: 'Tautan panduan' }).getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/');
    await expect(footer.getByRole('link', { name: 'Panduan', exact: true })).toHaveAttribute('href', '/help');
    expect(await page.evaluate(() => {
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');
      return !!main && !!footer && !!(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) && main.getBoundingClientRect().bottom <= footer.getBoundingClientRect().top;
    })).toBe(true);
    if (route === '/help/host') {
      await expect(page.locator('main li[id]')).toHaveCount(19);
      await expect(page.getByRole('link', { name: 'Mulai buat album' })).toHaveAttribute('href', '/album/baru');
      await expect(page.getByRole('heading', { name: 'Siap melanjutkan?' })).toBeVisible();
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/help/host');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Panduan', exact: true }).click();
  await expect(page).toHaveURL('/help');
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Buka panduan Host/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Buka panduan kolaborator/ })).toBeVisible();
});

test('T2-45 public Help footer links to the guide landing without replacing support routes', async ({ page }) => {
  for (const route of ['/', '/bantuan']) {
    await page.goto(route);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toHaveCount(1);
    const group = footer.getByRole('heading', { name: 'Bantuan' }).locator('..');
    const guide = group.getByRole('link', { name: 'Panduan' });
    await expect(guide).toHaveCount(1);
    await expect(guide).toHaveAttribute('href', '/help');
    await expect(group.getByRole('link', { name: 'Pusat Bantuan' })).toHaveAttribute('href', '/bantuan');
    await expect(group.getByRole('link', { name: 'Keamanan' })).toHaveAttribute('href', '/keamanan');
    await group.getByRole('link', { name: 'Pusat Bantuan' }).click();
    await expect(page).toHaveURL('/bantuan');
    await expect(page.getByRole('heading', { name: 'Pusat Bantuan', level: 1 })).toBeVisible();
    await page.goto(route);
    const activeGroup = page.getByRole('contentinfo').getByRole('heading', { name: 'Bantuan' }).locator('..');
    await activeGroup.getByRole('link', { name: 'Pusat Bantuan' }).focus();
    await page.keyboard.press('Tab');
    const activeGuide = activeGroup.getByRole('link', { name: 'Panduan' });
    await expect(activeGuide).toBeFocused();
    await activeGuide.click();
    await expect(page).toHaveURL('/help');
    await expect(page.getByRole('link', { name: /Buka panduan Host/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Buka panduan kolaborator/ })).toBeVisible();
  }

  await page.goto('/bantuan');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('listbox', { name: 'Bahasa' }).getByRole('option', { name: 'Bahasa Inggris' }).click();
  const group = page.getByRole('contentinfo').getByRole('heading', { name: 'Help' }).locator('..');
  await expect(group.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/help');
  await expect(group.getByRole('link', { name: 'Help Center' })).toHaveAttribute('href', '/bantuan');
  await expect(group.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/keamanan');
  await group.getByRole('link', { name: 'Help Center' }).click();
  await expect(page).toHaveURL('/bantuan');
  await expect(page.getByRole('heading', { name: 'Help Center', level: 1 })).toBeVisible();
  await page.getByRole('contentinfo').getByRole('link', { name: 'Guides' }).click();
  await expect(page).toHaveURL('/help');
  await expect(page.getByRole('heading', { name: 'Set up the album. Share the moments.' })).toBeVisible();
});

test('T2 Help and public footers fit ID Light and EN Dark across viewport widths', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/help/admin', '/help/host', '/help/collaborator', '/', '/bantuan']) {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(route);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(size.content, `${route} ID Light overflow at ${width}px`).toBeLessThanOrEqual(size.viewport);
    }
  }
  await page.goto('/help/admin');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('listbox', { name: 'Bahasa' }).getByRole('option', { name: 'Bahasa Inggris' }).click();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  for (const route of ['/help/admin', '/help/host', '/help/collaborator', '/', '/bantuan']) {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(route);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(size.content, `${route} EN Dark overflow at ${width}px`).toBeLessThanOrEqual(size.viewport);
    }
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    if (route.startsWith('/help')) {
      const navigation = page.getByRole('contentinfo').getByRole('navigation', { name: 'Guide links' });
      await expect(navigation.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      await expect(navigation.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/help');
    }
  }
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/help');
});

test('capture synthetic T2 Help/Footer evidence', async ({ page }) => {
  test.skip(process.env.UAT_CAPTURE_EVIDENCE !== '1', 'Synthetic evidence is captured only when requested.');
  const directory = resolve(process.cwd(), 'docs/reviews/FE-UAT-T2-V2-05/evidence');
  mkdirSync(directory, { recursive: true });
  for (const [slug, route] of [['admin', '/help/admin'], ['host', '/help/host'], ['collaborator', '/help/collaborator'], ['public-help', '/bantuan']] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${route}?uat=normal`);
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 0.98 });
    await page.screenshot({ path: resolve(directory, `synthetic-${slug}-desktop-1440-id-light.png`), animations: 'disabled' });
  }
  await page.goto('/help/admin?uat=normal');
  await page.getByRole('button', { name: 'Bahasa: ID' }).click();
  await page.getByRole('listbox', { name: 'Bahasa' }).getByRole('option', { name: 'Bahasa Inggris' }).click();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  for (const [slug, route] of [['admin', '/help/admin'], ['host', '/help/host'], ['collaborator', '/help/collaborator'], ['public-help', '/bantuan']] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${route}?uat=normal`);
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 0.98 });
    await page.screenshot({ path: resolve(directory, `synthetic-${slug}-mobile-390-en-dark.png`), animations: 'disabled' });
  }
});
