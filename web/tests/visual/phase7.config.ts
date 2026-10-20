import { defineConfig } from '@playwright/test';
import base from './phase6.config';
export default defineConfig({
  ...base,
  testMatch: 'phase7*.spec.ts',
  outputDir: '../../test-results/phase7',
  webServer: {
    ...base.webServer,
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3104',
    url: 'http://127.0.0.1:3104/en/phase7/management-new',
  },
  use: { baseURL: 'http://127.0.0.1:3104', browserName: 'chromium' },
});
