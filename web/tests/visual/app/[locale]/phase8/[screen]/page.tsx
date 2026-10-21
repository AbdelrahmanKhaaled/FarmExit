import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PartnershipWizard, type PartnershipRecord } from '@/features/phase8/PartnershipWizard';
import { NewPurchaseProposalForm } from '@/features/my-proposals/NewPurchaseProposalForm';
import { ProposalDetail } from '@/features/my-proposals/ProposalDetail';
import { PartnershipList } from '@/features/phase8/PartnershipList';
export default async function Fixture({ params }: { params: Promise<{ locale: string; screen: string }> }) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale, screen } = await params;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  const initial: PartnershipRecord = {
    id: '8001',
    requestNumber: 'FX-VISUAL-8001',
    status: screen === 'tracking' ? 'underFarmExitReview' : screen === 'corrections' ? 'changesRequested' : 'draft',
    farmId: '8002',
    farmName: locale === 'ar' ? 'مزرعة اختبار خاصة' : 'Private visual test farm',
    description: 'Private owner-stated objective',
    objective: ['Expand cultivation'],
    acceptedPartnerTypes: ['individual'],
    contributionDetails: 'Technical expertise',
    operations: 'Owner-stated current operations',
    salesChannel: 'Local nurseries and traders',
    extraInformation: '',
    parentPartnershipRequestId: '8003',
    applicantKind: screen === 'company' ? 'company' : 'individual',
    applicationMessage: 'Private application proposal',
    whyGoodFit: 'User-stated relevant experience',
    relevantExperience: 'Farm operations',
    companyName: 'Visual test company',
    companyContactName: 'Visual test applicant',
    companyContactRole: 'Authorized representative',
    reviews:
      screen === 'corrections'
        ? [{ decision: 'changesRequested', comment: 'Please clarify the objective.', createdAt: null }]
        : [],
  };
  const account = { fullName: 'Visual test applicant', mobileE164: '+201000000000' };
  if (screen === 'proposal')
    return (
      <main className="mx-auto max-w-656 p-24">
        <NewPurchaseProposalForm slug="visual-only" farmName={initial.farmName} />
      </main>
    );
  if (screen === 'proposal-edit')
    return (
      <main className="mx-auto max-w-656 p-24">
        <ProposalDetail
          proposal={{
            id: '8100',
            requestNumber: 'FX-VISUAL-8100',
            listingId: '8101',
            proposalKind: 'coPurchase',
            proposedTotalValue: null,
            requestedSharePercent: '25.50',
            proposalNotes: 'Private test proposal',
            status: 'submitted',
            submittedAt: null,
            components: [],
          }}
        />
      </main>
    );
  if (screen === 'list')
    return (
      <main className="mx-auto max-w-1016 p-24">
        <PartnershipList items={[initial, { ...initial, id: '8004', status: 'changesRequested' }]} />
      </main>
    );
  return (
    <PartnershipWizard
      initial={screen === 'owner' || screen === 'application' ? undefined : initial}
      application={screen === 'application' || screen === 'individual' || screen === 'company'}
      parentId="8003"
      farms={[{ id: '8002', name: initial.farmName! }]}
      account={account}
    />
  );
}
