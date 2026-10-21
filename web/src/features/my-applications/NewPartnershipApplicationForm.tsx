'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Surface } from '@/components/ui/Surface';
import { PartnershipWizard } from '@/features/phase8/PartnershipWizard';
export function NewPartnershipApplicationForm({
  parentId,
  account,
}: {
  parentId: string;
  account?: { fullName: string | null; mobileE164: string };
}) {
  return <PartnershipWizard parentId={parentId} account={account} application />;
}
export function NewPartnershipApplicationMissingParent() {
  const t = useTranslations('workspace.applications');
  return (
    <Surface className="p-32 text-center text-text-secondary">
      <p>{t('noParent')}</p>
      <Link href="/my/applications" className="mt-16 inline-block type-label-button text-text-brand">
        {t('back')}
      </Link>
    </Surface>
  );
}
