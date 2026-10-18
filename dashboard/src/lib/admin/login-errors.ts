type ApiErrorBody = { message?: string; code?: string };

export function loginErrorKey(
  status: number,
  body: ApiErrorBody,
): 'invalidCredentials' | 'notAdmin' | 'rateLimited' | 'generic' {
  if (status === 429) return 'rateLimited';
  if (status === 403 && body.code === 'NOT_ADMIN') return 'notAdmin';
  if (status === 401 || status === 400) return 'invalidCredentials';
  return 'generic';
}
