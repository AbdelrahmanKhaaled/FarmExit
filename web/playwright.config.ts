import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);
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
      name: 'tablet-en',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 1366 }, locale: 'en-US' },
      metadata: { locale: 'en' },
    },
    {
      name: 'mobile-en',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        locale: 'en-US',
      },
      metadata: { locale: 'en' },
    },
    {
      name: 'desktop-ar',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'ar-EG' },
      metadata: { locale: 'ar' },
    },
    // Arabic tablet and mobile run the Marketplace (Phase 3) and Farm Details (Phase 4) specs only.
    {
      name: 'tablet-ar',
      testMatch: /(marketplace|farm-details|phase10-integration|phase5-auth|auth)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 1366 }, locale: 'ar-EG' },
      metadata: { locale: 'ar' },
    },
    {
      name: 'mobile-ar',
      testMatch: /(marketplace|farm-details|phase10-integration|phase5-auth|auth)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        locale: 'ar-EG',
      },
      metadata: { locale: 'ar' },
    },
  ],
  // Tests run against a production build for deterministic results.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Keeps the dev-only Component Preview in this production build so shared components are tested (src/lib/dev-preview.ts).
    env: {
      FX_DEV_PREVIEW: '1',
      FARMEXIT_API_URL: process.env.FARMEXIT_API_URL ?? 'http://127.0.0.1:4001/api/v1',
    },
  },
});
