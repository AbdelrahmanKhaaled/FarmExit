import { defineConfig } from '@playwright/test';
import base from './phase7.config';
export default defineConfig({
  ...base,
  testMatch: ['phase7.workflow.spec.ts', 'stage1d.spec.ts'],
  outputDir: '../../test-results/stage1d',
});
