/**
 * Number formatting shared by both locales. Source of Truth 4m: Arabic uses Western digits 0–9, so prices are
 * grouped the same way in English and Arabic ("54,000,000"); the currency wording comes from messages.
 */
const egp = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatEgp(amount: number): string {
  return egp.format(amount);
}

const compact = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/**
 * Short EGP amount for Farm Details and similar-farm cards (Figma CMS Data Map: "EGP short format (54M, 21K)").
 * Formatting only — the stated amount is rounded for display, never derived from other fields. The unit word
 * comes from messages ("EGP 54M" · "54 مليون ج.م").
 */
export function shortEgp(amount: number): { value: string; unit: 'million' | 'thousand' | 'none' } {
  if (amount >= 1_000_000) return { value: compact.format(amount / 1_000_000), unit: 'million' };
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return { value: compact.format(thousands >= 100 ? Math.round(thousands) : thousands), unit: 'thousand' };
  }
  return { value: formatEgp(amount), unit: 'none' };
}
