/** Safe in-app return paths (locale-relative, no open redirects). */
export function sanitizeReturnTo(value: string | null | undefined, locale: string): string {
  if (!value || typeof value !== 'string') return `/${locale}/my`;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return `/${locale}/my`;
  if (trimmed.startsWith('//') || trimmed.includes('://')) return `/${locale}/my`;
  if (!trimmed.startsWith(`/${locale}/`)) {
    if (trimmed.startsWith('/en/') || trimmed.startsWith('/ar/')) return trimmed;
    return `/${locale}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  }
  return trimmed;
}
