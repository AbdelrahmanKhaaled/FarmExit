'use client';
import { useTranslations } from 'next-intl';
import { ManagementWizard, type ManagementFarmOption } from './ManagementWizard';
import { RequestTracking } from '@/features/phase7/RequestTracking';
import { managementGoals, managementChallenges, formatManagementChoices } from '@/features/phase7/reference-options';
export type ManagementRequest = {
  id: string;
  requestNumber: string;
  farmId: string;
  farmName: string;
  professionalNeed: string;
  status: string;
  managementTypes: string[] | null;
  term: string | null;
  currentSituation: string | null;
  goals: string[] | null;
  challenges?: string[] | null;
  outcomes?: string | null;
  additionalInformation?: string | null;
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
  createdAt: string | null;
  updatedAt: string | null;
};
export function ManagementRequestDetail({
  initial,
  initialStep,
  history,
  farm,
}: {
  initial: ManagementRequest;
  initialStep?: number;
  history?: { toStatus: string; reason: string | null; createdAt: string | null }[];
  farm?: ManagementFarmOption;
}) {
  const t = useTranslations('workspace.management');
  return ['draft', 'changesRequested'].includes(initial.status) ? (
    <ManagementWizard
      initial={initial}
      initialStep={initialStep}
      farms={[farm ?? { id: initial.farmId, name: initial.farmName }]}
    />
  ) : (
    <RequestTracking
      id={initial.id}
      requestNumber={initial.requestNumber}
      status={initial.status}
      title={t('listTitle')}
      reviews={initial.reviews}
      history={history}
      fields={[
        [t('farm'), initial.farmName],
        [t('need'), (t as (key: string) => string)(`needs.${initial.professionalNeed}`)],
        [t('term'), initial.term],
        [t('currentSituation'), initial.currentSituation],
        [t('goals'), formatManagementChoices(initial.goals, managementGoals, [t('goalOptions.g0'), t('goalOptions.g1'), t('goalOptions.g2')])],
        [t('challenges'), formatManagementChoices(initial.challenges, managementChallenges, [t('challengeOptions.c0'), t('challengeOptions.c1'), t('challengeOptions.c2'), t('challengeOptions.c3')])],
        [t('outcomes'), initial.outcomes ?? null],
        [t('additionalInformation'), initial.additionalInformation ?? null],
      ]}
    />
  );
}
