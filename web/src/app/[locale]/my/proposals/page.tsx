import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Surface } from '@/components/ui/Surface';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';

export const instant = false;

type Item = { id: string; requestNumber: string; proposalKind: string; status: string; listingId: string };

export default async function MyProposalsPage({ params }: PageProps<'/[locale]/my/proposals'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.proposals');
  const session = await requireCompletedProfile(locale, `/${locale}/my/proposals`);
  const data = await apiFetchWebsite<{ items: Item[] }>('/purchase-proposals?page=1&pageSize=50', session.accessToken);

  return (
    <div className="flex flex-col gap-16">
      <h2 className="type-display-h4">{t('listTitle')}</h2>
      <p className="type-body-caption text-text-muted">{t('listNote')}</p>
      {data.items.length === 0 ? (
        <Surface className="p-32 text-center text-text-secondary">{t('empty')}</Surface>
      ) : (
        <ul className="flex flex-col gap-12">
          {data.items.map((p) => (
            <li key={p.id}>
              <Surface className="p-20">
                <Link href={`/my/proposals/${p.id}`} className="type-label-medium text-text-brand">
                  {p.requestNumber}
                </Link>
                <p className="type-body-small text-text-muted">
                  {(t as (k: string) => string)(`kinds.${p.proposalKind}`)} · {t('listing')} {p.listingId}
                </p>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
