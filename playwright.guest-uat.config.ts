import { defineConfig, devices } from '@playwright/test';

const shared = {
  baseURL: 'http://localhost:3000',
  headless: true,
  trace: 'retain-on-failure' as const,
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
};

export default defineConfig({
  testDir: './tests/uat',
  testMatch: 'guest-owner-flow.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  projects: [
    { name: 'guest-desktop', use: { ...shared, ...devices['Desktop Chrome'] } },
    { name: 'guest-mobile', use: { ...shared, ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
});
