export type LocalizedContent = Partial<Record<'en' | 'ar', Record<string, string>>>;
/** An explicit clear must not resurrect the legacy value on the next save. */
export function authoredText(value: LocalizedContent, key: string, legacy = ''): string {
  const edited = Object.hasOwn(value.en ?? {}, key) || Object.hasOwn(value.ar ?? {}, key);
  return edited ? value.en?.[key]?.trim() || value.ar?.[key]?.trim() || '' : legacy;
}
export function contentText(
  value: unknown,
  locale: string,
  key: string,
  legacy: string | null | undefined = '',
): string {
  const data = value as LocalizedContent | null;
  return (
    data?.[locale === 'ar' ? 'ar' : 'en']?.[key]?.trim() ||
    legacy ||
    data?.[locale === 'ar' ? 'en' : 'ar']?.[key]?.trim() ||
    ''
  );
}
