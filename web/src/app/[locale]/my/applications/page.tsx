import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Surface } from '@/components/ui/Surface';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { PortalHeading, PortalEmpty, PortalRow } from '@/features/my-farmexit/PortalUI';

export const instant = false;

type Item = { id: string; requestNumber: string; parentPartnershipRequestId: string; status: string };

export default async function MyApplicationsPage({ params }: PageProps<'/[locale]/my/applications'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.applications');
  const tv = await getTranslations('workspace.visual');
  const session = await requireCompletedProfile(locale, `/${locale}/my/applications`);
  const data = await apiFetchWebsite<{ items: Item[] }>(
    '/partnership-applications?page=1&pageSize=50',
    session.accessToken,
  );

  return (
    <div className="flex flex-col gap-16">
      <PortalHeading title={t('listTitle')} description={tv('applicationsIntro')} />
      <Surface className="p-20 type-body-caption text-text-muted">{t('discoveryNote')}</Surface>
      {data.items.length === 0 ? (
        <PortalEmpty
          icon="document-text"
          title={tv('emptyApplications')}
          body={t('empty')}
          href="/partnerships"
          action={tv('next')}
        />
      ) : (
        <ul className="flex flex-col gap-12">
          {data.items.map((app) => (
            <li key={app.id}>
              <PortalRow
                icon="document-text"
                title={app.requestNumber}
                meta={`${t('parent')}: ${app.parentPartnershipRequestId}`}
                status={app.status}
                href={`/my/applications/${app.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
