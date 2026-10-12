/**
 * Development-only pages (/dev/tokens, /dev/components) return 404 in production builds.
 * `FX_DEV_PREVIEW=1` at build time keeps them in a production build: the Playwright suite sets it so the
 * shared components are tested against `next build` + `next start`. Never set it for a deployed build.
 */
export const devPreviewEnabled = process.env.NODE_ENV !== 'production' || process.env.FX_DEV_PREVIEW === '1';
