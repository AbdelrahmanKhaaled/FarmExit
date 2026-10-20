import { defineConfig } from '@playwright/test';
import base from './phase6.config';
export default defineConfig({ ...base, testMatch: 'geolocation.spec.ts' });
