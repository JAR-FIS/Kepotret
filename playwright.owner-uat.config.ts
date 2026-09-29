import { defineConfig, devices } from '@playwright/test';

const sharedUse = {
  baseURL: 'http://localhost:3000',
  headless: false,
  trace: 'off' as const,
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
};

export default defineConfig({
  testDir: './tests/uat',
  testMatch: 'owner-visual-uat.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 0,
  reporter: 'list',
  use: sharedUse,
  projects: [
    { name: 'owner-uat-desktop', use: { ...sharedUse, ...devices['Desktop Chrome'] } },
    { name: 'owner-uat-mobile', use: { ...sharedUse, ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
