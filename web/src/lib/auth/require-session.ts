import { redirect } from 'next/navigation';
import { getWebsiteSession } from './session.server';
import { sanitizeReturnTo } from './return-to';

export async function requireWebsiteSession(locale: string, returnPath: string) {
  const session = await getWebsiteSession();
  if (!session) {
    redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(sanitizeReturnTo(returnPath, locale))}`);
  }
  return session;
}

export async function requireCompletedProfile(locale: string, returnPath: string) {
  const session = await requireWebsiteSession(locale, returnPath);
  if (!session.user.profileCompleted) {
    redirect(`/${locale}/auth/complete-profile?returnTo=${encodeURIComponent(sanitizeReturnTo(returnPath, locale))}`);
  }
  return session;
}
