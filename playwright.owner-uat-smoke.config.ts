import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/uat',
  testMatch: 'owner-visual-uat-catalog-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'off',
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
