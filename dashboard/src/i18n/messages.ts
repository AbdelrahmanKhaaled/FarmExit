import type { Locale } from './routing';

export const namespaces = ['common', 'admin'] as const;

export type Namespace = (typeof namespaces)[number];

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(entries) as Messages;
}

export type Messages = {
  common: typeof import('../../messages/en/common.json');
  admin: typeof import('../../messages/en/admin.json');
};
