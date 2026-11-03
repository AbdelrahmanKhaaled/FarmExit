import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/hero-tabs',
  testMatch: 'hero-tabs.spec.ts',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3107', trace: 'retain-on-failure' },
  projects: ['en', 'ar'].flatMap((locale) =>
    [1440, 1024, 390].map((width) => ({
      name: `${locale}-${width}`,
      metadata: { locale },
      use: { viewport: { width, height: 1000 } },
    })),
  ),
  webServer: [
    {
      command: 'node tests/hero-api-fixture.mjs',
      url: 'http://127.0.0.1:4107/fixture/state',
      reuseExistingServer: false,
    },
    {
      command: 'npm run start -- --port 3107',
      url: 'http://localhost:3107/en',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { FARMEXIT_API_URL: 'http://127.0.0.1:4107/api/v1' },
    },
  ],
});
