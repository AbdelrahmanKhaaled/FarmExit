export function publicContent(
  value: unknown,
  fields: readonly string[],
): Record<string, Record<string, string>> | null {
  if (!value || typeof value !== 'object') return null;
  const out: Record<string, Record<string, string>> = {};
  for (const lang of ['en', 'ar']) {
    const source = (value as Record<string, unknown>)[lang];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const row: Record<string, string> = {};
    for (const key of fields) {
      const v = (source as Record<string, unknown>)[key];
      if (typeof v === 'string') row[key] = v;
    }
    out[lang] = row;
  }
  return out;
}
