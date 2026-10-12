/**
 * Purely numeric figures ("340+", "28,500") are isolated left-to-right, so Arabic text keeps "340+" instead of the
 * bidi-reordered "+340" (Source of Truth 4m: numbers are not mirrored). Figures with words ("3 أيام") keep the page
 * direction.
 */
export function figureDir(value: string): 'ltr' | undefined {
  return /^[\d.,+%\s]+$/.test(value) ? 'ltr' : undefined;
}
