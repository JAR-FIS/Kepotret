import { expect, test } from '@playwright/test';

test('H01 renders and stays usable across FE-2 viewport and preference states', async ({ page }) => {
  const widths = [320, 375, 390, 430, 768, 1024, 1280];
  const expectNoHorizontalOverflow = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  };

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /Satu momen\. Banyak sudut\./ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Pilih kapasitas sesuai kebutuhan acaramu\./ })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.locator('.hero-visual img[alt]:not([alt=""])')).toHaveCount(4);
  const useCaseSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /Setiap acara/ }) });
  for (const alt of [
    'Pasangan dan keluarga merayakan pernikahan di luar ruangan',
    'Seorang tamu merayakan ulang tahun bersama teman-teman',
    'Anggota komunitas berfoto bersama di dalam ruangan',
    'Pesepeda mengikuti kegiatan bersepeda bersama',
    'Peserta menyimak acara organisasi di ruang pertemuan',
    'Pelancong menjelajahi jalur pegunungan',
  ]) {
    await expect(useCaseSection.getByRole('img', { name: alt })).toHaveCount(1);
  }

  for (const width of widths) await expectNoHorizontalOverflow(width);

  await page.getByRole('radio', { name: '10K' }).click();
  await expect(page.getByText('Rp1.100.000')).toBeVisible();
  await expect(page.getByText('10.000 foto')).toBeVisible();

  const faq = page.getByRole('button', { name: 'Apakah peserta harus install aplikasi?' });
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'true');

  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
  await expect(page.getByRole('link', { name: 'Buat Album Gratis' }).last()).toBeVisible();
  await page.getByRole('combobox', { name: 'Bahasa' }).selectOption('en');
  await expect(page.getByRole('heading', { level: 1, name: /One moment\. Many perspectives\./ })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.hero-visual img[alt]:not([alt=""])')).toHaveCount(4);
  const heroPhotoFilters = await page.locator('.hero-visual img[alt]:not([alt=""])').evaluateAll((images) => images.map((image) => getComputedStyle(image).filter));
  expect(heroPhotoFilters.every((filter) => filter === 'none')).toBe(true);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.getByRole('button', { name: 'Close navigation menu' }).click();
  for (const width of widths) await expectNoHorizontalOverflow(width);

  await expectNoHorizontalOverflow(320);
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('id');
  await expect(page.getByRole('heading', { level: 1, name: /Satu momen\. Banyak sudut\./ })).toBeVisible();
  await page.getByRole('button', { name: 'Ganti ke tema gelap' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Tutup menu navigasi' }).click();
  for (const width of widths) await expectNoHorizontalOverflow(width);
});

test('ordinary auth and system routes use their defined recovery surfaces', async ({ page }) => {
  await page.goto('/masuk');
  await expect(page.getByRole('heading', { name: 'Masuk ke Kepotret' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeVisible();
  await expect(page.locator('input')).toHaveCount(0);

  await page.goto('/auth/google/memproses');
  await expect(page.getByRole('status')).toBeVisible();
  await page.goto('/masuk/gagal');
  await expect(page.getByRole('heading', { name: 'Belum berhasil masuk' })).toBeVisible();
  await page.goto('/undangan/kolaborator/11111111-1111-4111-8111-111111111111');
  await expect(page.getByRole('button', { name: 'Terima undangan' })).toBeVisible();
  await page.goto('/akses-ditolak');
  await expect(page.getByRole('heading', { name: 'Akses tidak tersedia' })).toBeVisible();
  await page.goto('/not-a-fe2-route');
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
});
