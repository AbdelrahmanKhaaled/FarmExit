import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PortalHeading, PortalEmpty } from '@/features/my-farmexit/PortalUI';
import { requireCompletedProfile } from '@/lib/auth/require-session';

export default async function MyNotificationsPage({ params }: PageProps<'/[locale]/my/notifications'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace');
  await requireCompletedProfile(locale, `/${locale}/my/notifications`);

  return (
    <div className="flex flex-col gap-24">
      <PortalHeading title={t('nav.notifications')} description={t('visual.notificationsIntro')} />
      <PortalEmpty
        icon="notification"
        title={t('visual.unavailable')}
        body={t('comingSoon.body')}
        href="/my/requests"
        action={t('nav.requests')}
      />
    </div>
  );
}
