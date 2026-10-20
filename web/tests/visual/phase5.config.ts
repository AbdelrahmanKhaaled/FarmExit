import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'phase5.visual.spec.ts',
  workers: 1,
  timeout: 90_000,
  outputDir: '../../test-results/phase5',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3102', browserName: 'chromium' },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3102',
    cwd: __dirname,
    url: 'http://127.0.0.1:3102/en/phase5/login',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { FARMEXIT_VISUAL_TEST: '1' },
  },
});
