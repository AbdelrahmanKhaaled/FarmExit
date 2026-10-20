import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'phase6*.spec.ts',
  workers: 1,
  timeout: 120_000,
  outputDir: '../../test-results/phase6',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3103', browserName: 'chromium' },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3103',
    cwd: __dirname,
    url: 'http://127.0.0.1:3103/en/phase6/new',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { FARMEXIT_VISUAL_TEST: '1' },
  },
});
