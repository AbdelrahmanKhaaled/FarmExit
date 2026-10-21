'use client';
import { PartnershipWizard, type PartnershipRecord } from '@/features/phase8/PartnershipWizard';
export type PartnershipApplication = PartnershipRecord;
export function PartnershipApplicationDetail({
  initial,
  account,
}: {
  initial: PartnershipApplication;
  account?: { fullName: string | null; mobileE164: string };
}) {
  return <PartnershipWizard initial={initial} account={account} application />;
}
