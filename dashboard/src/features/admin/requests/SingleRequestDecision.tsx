'use client';

import { useRouter } from '@/i18n/navigation';
import { DecideWorkflowForm } from '@/features/admin/workspace/DecideWorkflowForm';
import { decideListingReviewAction } from '@/features/admin/actions/listings';
import {
  decideFarmManagementAction,
  decideProfessionalVerificationAction,
  decidePartnershipRequestAction,
  decidePartnershipApplicationAction,
  decideFarmDetailsAction,
} from '@/features/admin/actions/workflows';

const decisions = {
  farmListing: decideListingReviewAction,
  farmManagement: decideFarmManagementAction,
  professionalVerification: decideProfessionalVerificationAction,
  partnership: decidePartnershipRequestAction,
  partnershipApplication: decidePartnershipApplicationAction,
  farmDetails: decideFarmDetailsAction,
};

/** Dispatch only to the domain decision action; publication remains a separate operation. */
export function SingleRequestDecision({
  id,
  type,
  status,
  allowed,
  isAdmin = false,
}: {
  id: string;
  type: string;
  status: string;
  allowed: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  if (!allowed || status !== 'underFarmExitReview' || !(type in decisions)) return null;
  const decide = decisions[type as keyof typeof decisions];
  return (
    <DecideWorkflowForm
      enabled
      approveAndPublish={type === 'farmManagement' && isAdmin}
      onDecide={async (decision, comment) => {
        const result = await decide(id, decision, comment);
        if (result.ok) router.refresh();
        return result;
      }}
    />
  );
}
