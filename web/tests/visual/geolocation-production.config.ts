import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: '.',
  testMatch: 'geolocation-production.spec.ts',
  workers: 1,
  timeout: 90000,
  outputDir: '../../test-results/geolocation-production',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3104', browserName: 'chromium' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3104',
    cwd: resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:3104/en',
    reuseExistingServer: false,
    env: { FARMEXIT_API_URL: 'http://127.0.0.1:4001/api/v1' },
  },
});
