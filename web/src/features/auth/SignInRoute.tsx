import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getWebsiteSession } from '@/lib/auth/session.server';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { AuthScreen } from './AuthScreen';
import { SignInForm } from './SignInForm';
import { loadPublicListingBySlug } from '@/lib/data/load-farm-marketplace';
export async function SignInRoute({
  params,
  searchParams,
  modal = false,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
  modal?: boolean;
}) {
  const { locale } = await params;
  const { returnTo } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getWebsiteSession();
  if (session?.user.profileCompleted) redirect(sanitizeReturnTo(returnTo, locale));
  if (session && !session.user.profileCompleted)
    redirect(`/${locale}/auth/complete-profile?returnTo=${encodeURIComponent(sanitizeReturnTo(returnTo, locale))}`);
  const target = new URL(sanitizeReturnTo(returnTo, locale), 'https://farmexit.invalid');
  const slug = target.searchParams.get('slug') ?? target.pathname.match(/\/farms\/([^/]+)$/)?.[1];
  const listing = slug ? await loadPublicListingBySlug(slug) : null;
  return (
    <AuthScreen modal={modal}>
      <SignInForm returnTo={returnTo} farmName={listing?.name[locale]} />
    </AuthScreen>
  );
}
