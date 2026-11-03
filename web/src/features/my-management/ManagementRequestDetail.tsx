'use client';
import { useLocale, useTranslations } from 'next-intl';
import { PublicationConsent } from './PublicationConsent';
import { ManagementRequirements } from './ManagementRequirements';
import { contentText } from '@/lib/content/localized';
import { ManagementWizard, type ManagementFarmOption } from './ManagementWizard';
import { RequestTracking } from '@/features/phase7/RequestTracking';
import { managementGoals, managementChallenges, formatManagementChoices } from '@/features/phase7/reference-options';
export type ManagementRequest = {
  localizedContent?: import('@/lib/content/localized').LocalizedContent;
  responsibilities?: string[] | null;
  experienceLevel?: string | null;
  onSitePresence?: string | null;
  currentTeam?:
    { role: string; count: number; localizedContent?: import('@/lib/content/localized').LocalizedContent }[] | null;
  resourcesAndFacilities?:
    | { facilityType: string; details: string; localizedContent?: import('@/lib/content/localized').LocalizedContent }[]
    | null;
  publicationConsentAt?: string | null;
  visibility?: string;
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
  const locale = useLocale();
  return ['draft', 'changesRequested'].includes(initial.status) ? (
    <ManagementWizard
      initial={initial}
      initialStep={initialStep}
      farms={[farm ?? { id: initial.farmId, name: initial.farmName }]}
    />
  ) : (
    <div className="flex flex-col gap-24">
      {initial.status === 'approved' && initial.visibility !== 'public' && !initial.publicationConsentAt && <PublicationConsent requestId={initial.id} />}
      <ManagementRequirements value={initial} />
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
          [t('term'), contentText(initial.localizedContent, locale, 'term', initial.term)],
          [
            t('currentSituation'),
            contentText(initial.localizedContent, locale, 'currentSituation', initial.currentSituation),
          ],
          [
            t('goals'),
            formatManagementChoices(initial.goals, managementGoals, [
              t('goalOptions.g0'),
              t('goalOptions.g1'),
              t('goalOptions.g2'),
            ]),
          ],
          [
            t('challenges'),
            formatManagementChoices(initial.challenges, managementChallenges, [
              t('challengeOptions.c0'),
              t('challengeOptions.c1'),
              t('challengeOptions.c2'),
              t('challengeOptions.c3'),
            ]),
          ],
          [t('outcomes'), contentText(initial.localizedContent, locale, 'outcomes', initial.outcomes ?? null)],
          [
            t('additionalInformation'),
            contentText(
              initial.localizedContent,
              locale,
              'additionalInformation',
              initial.additionalInformation ?? null,
            ),
          ],
        ]}
      />
    </div>
  );
}
