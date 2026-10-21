import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
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
  const parentId = typeof sp.parentPartnershipRequestId === 'string' ? sp.parentPartnershipRequestId : '';
  const session = await requireCompletedProfile(
    locale,
    `/${locale}/my/applications/new?parentPartnershipRequestId=${encodeURIComponent(parentId)}`,
  );

  return (
    <>
      {parentId ? (
        <NewPartnershipApplicationForm parentId={parentId} account={session.user} />
      ) : (
        <NewPartnershipApplicationMissingParent />
      )}
    </>
  );
}
