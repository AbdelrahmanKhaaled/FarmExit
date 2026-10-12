/** Joins class names, skipping falsy values. No merging: components avoid conflicting utilities by design. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
