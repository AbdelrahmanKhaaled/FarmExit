import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'stage9c.spec.ts',
  workers: 1,
  timeout: 60_000,
  outputDir: '../../test-results/stage9c',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3104', browserName: 'chromium' },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3104',
    cwd: __dirname,
    url: 'http://127.0.0.1:3104/en/stage9c',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { FARMEXIT_VISUAL_TEST: '1' },
  },
});
