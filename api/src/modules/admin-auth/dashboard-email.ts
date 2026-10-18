const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeDashboardEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.length > 255) return null;
  if (!EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}
