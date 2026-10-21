'use client';
import { PartnershipWizard } from '@/features/phase8/PartnershipWizard';
export function NewPartnershipRequestForm(props: { farms: { id: string; name: string }[]; initialFarmId?: string }) {
  return <PartnershipWizard {...props} />;
}
