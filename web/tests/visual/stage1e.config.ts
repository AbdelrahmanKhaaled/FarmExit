import { defineConfig } from '@playwright/test';
import base from './phase6.config';
export default defineConfig({
  ...base,
  testMatch: 'stage1e*.spec.ts',
  outputDir: '../../test-results/stage1e',
  use: { baseURL: 'http://127.0.0.1:3111', browserName: 'chromium' },
  webServer: {
    ...base.webServer,
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3111',
    url: 'http://127.0.0.1:3111/en/stage1e',
  },
});
