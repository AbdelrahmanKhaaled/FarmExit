'use client';
import { PartnershipWizard, type PartnershipRecord } from '@/features/phase8/PartnershipWizard';
export type PartnershipRequest = PartnershipRecord;
export function PartnershipRequestDetail({ initial }: { initial: PartnershipRequest }) {
  return <PartnershipWizard initial={initial} />;
}
