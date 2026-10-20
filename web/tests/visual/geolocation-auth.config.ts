import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';
export default defineConfig({
  ...base,
  testDir: resolve(__dirname, '../e2e'),
  testMatch: ['auth.spec.ts', 'phase5-auth.spec.ts'],
  workers: 2,
  reporter: [['list']],
  outputDir: '../../test-results/geolocation-auth',
  projects: base.projects?.map((project) => ({ ...project, testMatch: ['auth.spec.ts', 'phase5-auth.spec.ts'] })),
  use: { ...base.use, baseURL: 'http://localhost:3105' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --port 3105',
    cwd: resolve(__dirname, '../..'),
    url: 'http://localhost:3105/en',
    reuseExistingServer: false,
    env: { FARMEXIT_API_URL: 'http://127.0.0.1:4001/api/v1' },
  },
});
