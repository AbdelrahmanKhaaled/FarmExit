import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import {
  NewPartnershipApplicationForm,
  NewPartnershipApplicationMissingParent,
} from '@/features/my-applications/NewPartnershipApplicationForm';

export const instant = false;

export default async function NewPartnershipApplicationPage({
  params,
  searchParams,
}: PageProps<'/[locale]/my/applications/new'>) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.applications');
  await requireCompletedProfile(locale, `/${locale}/my/applications/new`);
  const parentId = typeof sp.parentPartnershipRequestId === 'string' ? sp.parentPartnershipRequestId : '';

  return (
    <div className="flex flex-col gap-16">
      <Link href="/my/applications" className="type-label-button text-text-brand">{t('back')}</Link>
      <h2 className="type-display-h4">{t('newTitle')}</h2>
      {parentId ? <NewPartnershipApplicationForm parentId={parentId} /> : <NewPartnershipApplicationMissingParent />}
    </div>
  );
}
