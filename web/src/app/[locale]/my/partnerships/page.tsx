import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Surface } from '@/components/ui/Surface';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';

export const instant = false;

type Item = { id: string; requestNumber: string; farmName: string; status: string };

export default async function MyPartnershipsPage({ params }: PageProps<'/[locale]/my/partnerships'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.partnerships');
  const session = await requireCompletedProfile(locale, `/${locale}/my/partnerships`);
  const data = await apiFetchWebsite<{ items: Item[] }>(
    '/partnership-requests?page=1&pageSize=50',
    session.accessToken,
  );

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center justify-between gap-12">
        <h2 className="type-display-h4">{t('listTitle')}</h2>
        <Link href="/my/partnerships/new" className="type-label-button text-text-brand">{t('new')}</Link>
      </div>
      {data.items.length === 0 ? (
        <Surface className="p-32 text-center text-text-secondary">{t('empty')}</Surface>
      ) : (
        <ul className="flex flex-col gap-12">
          {data.items.map((req) => (
            <li key={req.id}>
              <Surface className="p-20">
                <Link href={`/my/partnerships/${req.id}`} className="type-label-medium text-text-brand">
                  {req.requestNumber}
                </Link>
                <p className="type-body-small text-text-muted">{req.farmName}</p>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
