import { defineConfig } from '@playwright/test';
import base from './phase6.config';
export default defineConfig({
  ...base,
  testMatch: 'phase8*.spec.ts',
  outputDir: '../../test-results/phase8',
  webServer: {
    ...base.webServer,
    command: 'node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3109',
    url: 'http://127.0.0.1:3109/en/phase8/owner',
  },
  use: { baseURL: 'http://127.0.0.1:3109', browserName: 'chromium', viewport: { width: 1440, height: 900 } },
});
