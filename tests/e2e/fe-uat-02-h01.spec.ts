import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 },
];

async function openMobileMenu(page: Page, mobile: boolean) {
  if (mobile && await page.getByRole('button', { name: 'Buka menu navigasi' }).count()) {
    await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
  } else if (mobile && await page.getByRole('button', { name: 'Open navigation menu' }).count()) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
}

async function closeMobileMenu(page: Page, mobile: boolean) {
  if (!mobile) return;
  const closeId = page.getByRole('button', { name: 'Tutup menu navigasi' });
  if (await closeId.count()) await closeId.click();
  else await page.getByRole('button', { name: 'Close navigation menu' }).click();
}

async function setLocale(page: Page, locale: 'id' | 'en', mobile: boolean) {
  const current = await page.locator('html').getAttribute('lang');
  if (current === locale) return;
  await openMobileMenu(page, mobile);
  const triggerName = locale === 'en' ? 'Bahasa: ID' : 'Language: ENG';
  const listboxName = locale === 'en' ? 'Bahasa' : 'Language';
  const optionName = locale === 'en' ? 'Bahasa Inggris' : 'Indonesian';
  await page.getByRole('button', { name: triggerName }).click();
  await page.getByRole('listbox', { name: listboxName }).getByRole('option', { name: optionName }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await closeMobileMenu(page, mobile);
}

async function setTheme(page: Page, dark: boolean, mobile: boolean) {
  const isDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  if (isDark === dark) return;
  await openMobileMenu(page, mobile);
  const label = dark ? /ganti ke tema gelap|switch to dark theme/i : /ganti ke tema terang|switch to light theme/i;
  await page.getByRole('button', { name: label }).click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(dark);
  await closeMobileMenu(page, mobile);
}

test('FE-UAT-02 H01 composition remains correct across desktop/mobile, locales, and themes', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    const mobile = viewport.width < 1024;
    if (mobile) {
      await openMobileMenu(page, true);
      await expect(page.locator('header nav:visible')).toBeVisible();
      await closeMobileMenu(page, true);
    } else {
      const nav = page.locator('header > div nav');
      await expect(nav).toBeVisible();
      const navCenter = await nav.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left + bounds.width / 2;
      });
      expect(Math.abs(navCenter - viewport.width / 2), `${viewport.name} header nav is centered`).toBeLessThan(2);
    }

    for (const locale of ['id', 'en'] as const) {
      await setLocale(page, locale, mobile);
      const title = locale === 'id' ? 'Satu momen. Banyak sudut.' : 'One moment. Many perspectives.';
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.locator('[data-hero-lime-dot]')).toHaveCount(1);
      await expect(page.locator('.hero-visual img[alt]:not([alt=""])')).toHaveCount(4);
      await expect(page.locator('.hero-visual img[alt]').first()).toHaveAttribute('src', /wedding-02/);
      await expect(page.locator('#h01-photo-capacity')).toHaveAttribute('max', '6');

      for (const dark of [false, true]) {
        await setTheme(page, dark, mobile);
        const howBg = await page.locator('#cara-kerja').evaluate((element) => getComputedStyle(element).backgroundColor);
        const differentiationCopy = locale === 'id'
          ? 'Jumlah peserta tidak menentukan paket Kepotret. Kamu cukup memilih kapasitas foto sesuai kebutuhan acara, lalu ajak sebanyak mungkin orang untuk ikut menangkap momennya.'
          : 'The number of participants does not determine your Kepotret package. Choose the photo capacity your event needs, then invite as many people as you like to capture the moment.';
        const differentiationText = await page.getByText(differentiationCopy).evaluate((element) => getComputedStyle(element).color);
        if (dark) {
          expect(howBg).toBe('rgb(107, 107, 107)');
          expect(differentiationText).toBe('rgb(10, 10, 10)');
          await expect(page.locator('header img[src="/brand/logo_white.svg"]')).toBeVisible();
        } else expect(differentiationText).toBe('rgb(10, 10, 10)');
        const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
        expect(dimensions.content, `${viewport.name}, ${locale}, dark=${dark}`).toBeLessThanOrEqual(dimensions.viewport);
      }
      await setTheme(page, false, mobile);
    }

    const slider = page.getByRole('slider', { name: /Berapa banyak momen|How many moments/ });
    await slider.scrollIntoViewIfNeeded();
    await slider.focus();
    await page.keyboard.press('Home');
    expect(await slider.inputValue()).toBe('0');
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuetext', /10\.000 photos|10\.000 foto|10,000 photos/);
    await expect(page.getByText(/Rp1\.100\.000|IDR1,100,000/)).toBeVisible();
    const sliderBox = await slider.boundingBox();
    if (sliderBox) {
      if (test.info().project.name.startsWith('mobile')) {
        await page.touchscreen.tap(sliderBox.x + sliderBox.width - 4, sliderBox.y + sliderBox.height / 2);
      } else {
        await page.mouse.move(sliderBox.x + 8, sliderBox.y + sliderBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(sliderBox.x + sliderBox.width - 8, sliderBox.y + sliderBox.height / 2, { steps: 6 });
        await page.mouse.up();
      }
      await expect(slider).toHaveValue('6');
    }

    const target = page.locator('#cara-kerja');
    await page.getByRole('link', { name: /Lihat Cara Kerjanya|See How It Works/ }).click();
    await expect(page).toHaveURL(/#cara-kerja$/);
    await expect.poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeGreaterThanOrEqual(0);
    await expect.poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeLessThan(140);

    await page.locator('#faq').scrollIntoViewIfNeeded();
    const firstQuestion = page.getByRole('button', { name: /Apakah peserta harus install aplikasi|Do participants need to install an app/i });
    const secondQuestion = page.getByRole('button', { name: /Apakah peserta harus membuat akun|Do participants need an account/i });
    await firstQuestion.focus();
    await page.keyboard.press('Enter');
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    await secondQuestion.focus();
    await page.keyboard.press('Space');
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
    await expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');

  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('html').evaluate((element) => getComputedStyle(element).scrollBehavior)).toBe('auto');
  expect(await page.locator('.h01-reveal').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.goto('/faq');
  await openMobileMenu(page, true);
  await page.getByRole('button', { name: /Bahasa: ID|Language: ENG/ }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('listbox').press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await closeMobileMenu(page, true);
});
