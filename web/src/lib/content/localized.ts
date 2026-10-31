export type LocalizedContent = Partial<Record<'en' | 'ar', Record<string, string>>>;
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
