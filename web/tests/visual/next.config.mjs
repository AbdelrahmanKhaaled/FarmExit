import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

if (process.env.FARMEXIT_VISUAL_TEST !== '1') {
  throw new Error('This isolated fixture app requires FARMEXIT_VISUAL_TEST=1. It is not a product route.');
}

const withIntl = createNextIntlPlugin('../../src/i18n/request.ts');
export default withIntl({
  allowedDevOrigins: ['127.0.0.1'],
  devIndicators: false,
  images: { unoptimized: true },
  turbopack: {
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
});
