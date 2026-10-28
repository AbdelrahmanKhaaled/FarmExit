/** Server-side FarmExit API base URL (includes `/api/v1`). */
export function getApiBaseUrl(): string {
  const url = process.env.FARMEXIT_API_URL ?? process.env.NEXT_PUBLIC_FARMEXIT_API_URL ?? 'https://farmexit.nodeteam.site/api/v1';
  return url.replace(/\/$/, '');
}
