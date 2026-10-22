import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'stage9b.spec.ts',
  workers: 1,
  timeout: 90_000,
  outputDir: '../../test-results/stage9b',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3103', browserName: 'chromium' },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3103',
    cwd: __dirname,
    url: 'http://127.0.0.1:3103/en/phase9b?screen=thread',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { FARMEXIT_VISUAL_TEST: '1' },
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet-1024', use: { viewport: { width: 1024, height: 900 } } },
    { name: 'mobile-390', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
});
