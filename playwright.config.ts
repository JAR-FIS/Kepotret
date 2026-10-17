import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      grep: /@cross-browser/,
      // Firefox's context teardown is flaky when multiple browser contexts close concurrently on Windows.
      // Keep its cross-browser assertions intact while avoiding concurrent context cleanup races.
      workers: 1,
      // Firefox can intermittently fail while Playwright removes a context after assertions pass.
      // Retry retains the same auth/authorization checks and makes the Windows project reliable.
      retries: 2,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      grep: /@cross-browser/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      grep: /@cross-browser/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-webkit',
      grep: /@cross-browser/,
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
