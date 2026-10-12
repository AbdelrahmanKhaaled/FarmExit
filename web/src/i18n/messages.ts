import type { Locale } from './routing';

/** Message namespaces. Each namespace is one JSON file per locale in /messages/<locale>/. */
export const namespaces = [
  'common',
  'nav',
  'home',
  'marketplace',
  'farm',
  'management',
  'partnership',
  'auth',
  'workspace',
  'flows',
  'status',
  'validation',
  'domain',
  'seo',
] as const;

export type Namespace = (typeof namespaces)[number];

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(entries) as Messages;
}

/** English is the reference shape; Arabic must provide the same keys (checked by `npm run lint`). */
export type Messages = {
  common: typeof import('../../messages/en/common.json');
  nav: typeof import('../../messages/en/nav.json');
  home: typeof import('../../messages/en/home.json');
  marketplace: typeof import('../../messages/en/marketplace.json');
  farm: typeof import('../../messages/en/farm.json');
  management: typeof import('../../messages/en/management.json');
  partnership: typeof import('../../messages/en/partnership.json');
  auth: typeof import('../../messages/en/auth.json');
  workspace: typeof import('../../messages/en/workspace.json');
  flows: typeof import('../../messages/en/flows.json');
  status: typeof import('../../messages/en/status.json');
  validation: typeof import('../../messages/en/validation.json');
  domain: typeof import('../../messages/en/domain.json');
  seo: typeof import('../../messages/en/seo.json');
};
