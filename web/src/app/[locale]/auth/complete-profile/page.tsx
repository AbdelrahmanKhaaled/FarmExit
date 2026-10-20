import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { ProfileForm } from '@/features/auth/ProfileForm';
import { routing } from '@/i18n/routing';
import { requireWebsiteSession } from '@/lib/auth/require-session';
import { sanitizeReturnTo } from '@/lib/auth/return-to';

export const instant = false;

export default async function CompleteProfilePage({
  params,
  searchParams,
}: PageProps<'/[locale]/auth/complete-profile'> & { searchParams: Promise<{ returnTo?: string }> }) {
  const { locale } = await params;
  const { returnTo } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requireWebsiteSession(locale, `/${locale}/auth/complete-profile`);
  if (session.user.profileCompleted) {
    redirect(sanitizeReturnTo(returnTo, locale));
  }

  const t = await getTranslations('auth');

  return (
    <AuthScreen>
      <div className="mb-24 flex flex-col gap-10">
        <h1 className="type-heading-h3 text-text-primary">{t('profile.title')}</h1>
        <p className="type-body-default text-text-muted">{t('profile.subtitle')}</p>
      </div>
      <ProfileForm
        locale={locale}
        returnTo={returnTo}
        initialEmail={session.user.email}
        mobile={session.user.mobileE164}
      />
    </AuthScreen>
  );
}
