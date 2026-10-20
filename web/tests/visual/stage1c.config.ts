import { defineConfig } from '@playwright/test';
import base from './phase56.config';
export default defineConfig({
  ...base,
  testMatch: [
    'stage1c.spec.ts',
    'phase56.spec.ts',
    'phase6.integration.spec.ts',
    'phase6.facilities.spec.ts',
    'phase6.pending.spec.ts',
    'geolocation.spec.ts',
  ],
});
