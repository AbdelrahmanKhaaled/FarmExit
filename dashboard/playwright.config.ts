import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3202);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-en',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'en-US' },
      metadata: { locale: 'en' },
    },
    {
      name: 'desktop-ar',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'ar-EG' },
      metadata: { locale: 'ar' },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${baseURL}/en/admin/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
