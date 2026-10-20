import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PortalHeading, PortalEmpty } from '@/features/my-farmexit/PortalUI';
import { requireCompletedProfile } from '@/lib/auth/require-session';

export default async function MyDocumentsPage({ params }: PageProps<'/[locale]/my/documents'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace');
  await requireCompletedProfile(locale, `/${locale}/my/documents`);
  return (
    <div className="flex flex-col gap-24">
      <PortalHeading title={t('nav.documents')} description={t('visual.documentsIntro')} />
      <PortalEmpty
        icon="folder"
        title={t('visual.unavailable')}
        body={t('documents.gapNote')}
        href="/my/requests"
        action={t('nav.requests')}
        testId="documents-gap"
      />
    </div>
  );
}
