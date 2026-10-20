import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { MyFarmExitLayout } from '@/features/my-farmexit/MyFarmExitLayout';
import { ManagementWizard } from '@/features/my-management/ManagementWizard';
import { ManagementRequestDetail, type ManagementRequest } from '@/features/my-management/ManagementRequestDetail';
import { ProfessionalHub, type ProfessionalProfile } from '@/features/my-professional/ProfessionalHub';
import {
  VerificationRequestDetail,
  type VerificationRequest,
} from '@/features/my-professional/VerificationRequestDetail';
import { RequestList } from '@/features/phase7/RequestList';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
export default async function Fixture({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; screen: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale, screen } = await params,
    query = await searchParams;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  if (screen === 'public-navbar') return <PublicNavbar />;
  const user = {
    id: 'phase7-visual-only',
    fullName: locale === 'ar' ? 'حساب اختبار' : 'Visual test',
    mobileE164: '+201000000000',
    email: null,
    mobileVerified: true,
    profileCompleted: true,
  };
  const management: ManagementRequest = {
    id: '7001',
    requestNumber: 'FX-VISUAL-7001',
    farmId: '1001',
    farmName: locale === 'ar' ? 'مزرعة مرجعية للاختبار' : 'Visual reference farm',
    professionalNeed: 'farmManager',
    status: 'draft',
    managementTypes: ['fullOperationManagement'],
    term: locale === 'ar' ? 'سنة واحدة' : 'One year',
    currentSituation:
      locale === 'ar'
        ? 'وصف صاحب المزرعة للوضع الحالي للاختبار فقط.'
        : 'Owner-stated current farm situation for the isolated visual test.',
    goals: [locale === 'ar' ? 'تنظيم الري' : 'Improve irrigation planning'],
    reviews: [],
    createdAt: null,
    updatedAt: null,
  };
  const profile: ProfessionalProfile = {
    id: '7101',
    headline: locale === 'ar' ? 'مدير مزرعة' : 'Farm manager',
    bio:
      locale === 'ar'
        ? 'نبذة مهنية مقدمة من المستخدم للاختبار.'
        : 'User-stated professional introduction for the isolated test.',
    baseGovernorate: locale === 'ar' ? 'البحيرة' : 'Beheira',
    yearsExperience: 9,
    experienceSummary:
      locale === 'ar' ? 'خبرة زراعية مقدمة من المستخدم للاختبار.' : 'User-stated agricultural experience.',
    capabilities: [
      {
        id: '7201',
        professionalType: 'farmManager',
        verificationStatus: 'verificationRequired',
        verifiedAt: null,
        notApprovedReason: null,
        expertise: [
          { expertiseType: 'farmActivity', expertiseValue: 'fruit' },
          { expertiseType: 'managementType', expertiseValue: 'fullOperationManagement' },
          { expertiseType: 'cropExpertise', expertiseValue: 'Citrus' },
          { expertiseType: 'areaOfExpertise', expertiseValue: 'dripIrrigation' },
        ],
        serviceAreas: ['Beheira', 'Matrouh'],
      },
    ],
  };
  const verification: VerificationRequest = {
    id: '7301',
    requestNumber: 'FX-VISUAL-7301',
    status: 'draft',
    professionalCapabilityId: '7201',
    professionalType: 'farmManager',
    verificationSummary: locale === 'ar' ? 'ملخص خاص مقدم للمراجعة.' : 'Private verification summary.',
    reviews: [],
  };
  const history = [
    { toStatus: 'draft', reason: null, createdAt: '2026-01-01T12:00:00Z' },
    { toStatus: 'underFarmExitReview', reason: null, createdAt: '2026-01-02T12:00:00Z' },
  ];
  let content;
  if (screen === 'management-wizard')
    content = (
      <ManagementWizard
        farms={[
          {
            id: '1001',
            name: management.farmName,
            governorate: 'Beni Suef',
            areaName: 'Beba',
            areaFeddan: 48,
            farmType: 'fruit',
          },
        ]}
        initial={management}
        initialStep={Number(query.step) || 1}
      />
    );
  else if (screen === 'management-new')
    content = (
      <ManagementWizard
        farms={[
          {
            id: '1001',
            name: management.farmName,
            governorate: 'Beni Suef',
            areaName: 'Beba',
            areaFeddan: 48,
            farmType: 'fruit',
          },
        ]}
      />
    );
  else if (screen === 'management-changes')
    content = (
      <ManagementRequestDetail
        initial={{
          ...management,
          status: 'changesRequested',
          reviews: [
            {
              decision: 'changesRequested',
              comment: locale === 'ar' ? 'وضّح الوضع الحالي للمزرعة.' : 'Please clarify the current farm situation.',
              createdAt: null,
            },
          ],
        }}
        initialStep={3}
      />
    );
  else if (['management-underReview', 'management-approved', 'management-rejected'].includes(screen))
    content = (
      <ManagementRequestDetail
        initial={{
          ...management,
          status: screen.endsWith('underReview') ? 'underFarmExitReview' : screen.slice('management-'.length),
        }}
        history={history}
      />
    );
  else if (screen === 'management-list' || screen === 'management-empty')
    content = (
      <RequestList
        items={
          screen.endsWith('empty')
            ? []
            : ['draft', 'underFarmExitReview', 'changesRequested', 'approved', 'rejected'].map((status, i) => ({
                ...management,
                id: String(7001 + i),
                status,
                requestNumber: `FX-VISUAL-${7001 + i}`,
              }))
        }
      />
    );
  else if (screen === 'professional-wizard')
    content = <ProfessionalHub initial={profile} name={user.fullName} initialStep={Number(query.step) || 1} />;
  else if (screen === 'professional-new') content = <ProfessionalHub initial={null} name={user.fullName} />;
  else if (['professional-profile', 'professional-verified', 'professional-notApproved'].includes(screen))
    content = (
      <ProfessionalHub
        initial={{
          ...profile,
          capabilities: profile.capabilities.map((c) => ({
            ...c,
            verificationStatus:
              screen === 'professional-profile' ? 'verificationRequired' : screen.slice('professional-'.length),
          })),
        }}
        name={user.fullName}
      />
    );
  else if (screen === 'verification-wizard')
    content = <VerificationRequestDetail initial={verification} initialStep={Number(query.step) || 4} />;
  else if (screen === 'verification-changes')
    content = (
      <VerificationRequestDetail
        initial={{
          ...verification,
          status: 'changesRequested',
          reviews: [
            {
              decision: 'changesRequested',
              comment: locale === 'ar' ? 'ارفع نسخة أوضح من المستند.' : 'Upload a clearer document copy.',
              createdAt: null,
            },
          ],
        }}
      />
    );
  else if (['verification-underReview', 'verification-approved', 'verification-rejected'].includes(screen))
    content = (
      <VerificationRequestDetail
        initial={{
          ...verification,
          status: screen.endsWith('underReview') ? 'underFarmExitReview' : screen.slice('verification-'.length),
        }}
        history={history}
      />
    );
  else if (screen === 'verification-list' || screen === 'verification-empty')
    content = (
      <RequestList
        professional
        items={
          screen.endsWith('empty')
            ? []
            : ['draft', 'underFarmExitReview', 'changesRequested', 'approved', 'rejected'].map((status, i) => ({
                ...verification,
                id: String(7301 + i),
                status,
                requestNumber: `FX-VISUAL-${7301 + i}`,
              }))
        }
      />
    );
  else notFound();
  return <MyFarmExitLayout session={{ accessToken: 'isolated-only', user }}>{content}</MyFarmExitLayout>;
}
