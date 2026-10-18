import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const PHYSICAL =
  '(^|\\s|:)!?-?(ml|mr|pl|pr|scroll-ml|scroll-mr|scroll-pl|scroll-pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|text-left|text-right|float-left|float-right|clear-left|clear-right)(-|\\s|$)';
const message =
  'Use logical Tailwind utilities (ms/me, ps/pe, start/end, text-start/end, rounded-s/e, border-s/e) so layouts mirror in Arabic.';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `JSXAttribute[name.name='className'] Literal[value=/${PHYSICAL}/]`, message },
        { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${PHYSICAL}/]`, message },
        { selector: `CallExpression[callee.name=/^(cn|clsx|cva)$/] Literal[value=/${PHYSICAL}/]`, message },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'dashboard/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
