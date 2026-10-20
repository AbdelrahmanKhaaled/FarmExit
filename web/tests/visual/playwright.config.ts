import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'farm-details.visual.spec.ts',
  workers: 1,
  timeout: 90_000,
  outputDir: '../../test-results/phase4-1',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3101', browserName: 'chromium' },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3101',
    cwd: __dirname,
    url: 'http://127.0.0.1:3101/en',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { FARMEXIT_VISUAL_TEST: '1' },
  },
});
