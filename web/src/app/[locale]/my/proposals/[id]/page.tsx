import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { ProposalDetail, type PurchaseProposal } from '@/features/my-proposals/ProposalDetail';

export const instant = false;

export default async function ProposalDetailPage({ params }: PageProps<'/[locale]/my/proposals/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.proposals');
  const session = await requireCompletedProfile(locale, `/${locale}/my/proposals/${id}`);
  let proposal: PurchaseProposal;
  try {
    proposal = await apiFetchWebsite<PurchaseProposal>(`/purchase-proposals/${id}`, session.accessToken);
  } catch {
    notFound();
  }
  return (
    <div className="flex flex-col gap-16">
      <Link href="/my/proposals" className="type-label-button text-text-brand">{t('back')}</Link>
      <ProposalDetail proposal={proposal} />
    </div>
  );
}
