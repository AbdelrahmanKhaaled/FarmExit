import { defineConfig } from '@playwright/test';
import base from './phase6.config';
export default defineConfig({
  ...base,
  testMatch: [
    'phase56.spec.ts',
    'phase56-production.spec.ts',
    'phase6.integration.spec.ts',
    'phase6.facilities.spec.ts',
    'phase6.pending.spec.ts',
  ],
});
