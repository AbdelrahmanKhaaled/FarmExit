import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { SignInForm } from '@/features/auth/SignInForm';
import { ProfileForm } from '@/features/auth/ProfileForm';
import { MyFarmExitLayout } from '@/features/my-farmexit/MyFarmExitLayout';
import { OverviewContent } from '@/features/my-farmexit/OverviewContent';
import { PortalEmpty, PortalHeading, PortalRow, VerificationCard } from '@/features/my-farmexit/PortalUI';
import { MessagesInbox } from '@/features/my-messages/MessagesInbox';
import { MessageThread } from '@/features/my-messages/MessageThread';
import { FarmDetailsRequestForm } from '@/features/my-farm-details/FarmDetailsRequestForm';
import { FarmDetailsRequestDetail } from '@/features/my-farm-details/FarmDetailsRequestDetail';
import { SavedListings } from '@/features/my-farmexit/SavedListings';
import { ProfileContent } from '@/features/my-farmexit/ProfileContent';

// This route exists ONLY in the isolated test app, guarded by FARMEXIT_VISUAL_TEST.
// It has no BFF and never supplies synthetic data to the production application.
export default async function Fixture({ params }: { params: Promise<{ locale: string; screen: string }> }) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale, screen } = await params;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace');
  const auth = await getTranslations('auth');
  if (screen === 'login' || screen === 'modal')
    return (
      <AuthScreen modal={screen === 'modal'}>
        <SignInForm
          returnTo={`/${locale}/my/requests`}
          farmName={screen === 'modal' ? 'Visual reference farm' : undefined}
        />
      </AuthScreen>
    );
  if (screen === 'profile')
    return (
      <AuthScreen>
        <div className="flex flex-col gap-24">
          <h1 className="type-heading-h3">{auth('profile.title')}</h1>
          <p className="type-body-default text-text-muted">{auth('profile.subtitle')}</p>
          <ProfileForm locale={locale} mobile="+201000000000" returnTo={`/${locale}/my`} />
        </div>
      </AuthScreen>
    );
  let content;
  if (screen === 'overview')
    content = (
      <OverviewContent
        data={{
          name: locale === 'ar' ? 'حساب اختبار' : 'Visual test',
          counts: { farms: 0, requests: 0, saved: 0 },
          farms: [],
          requests: [],
          saved: [],
          capabilities: [],
        }}
      />
    );
  else if (screen === 'requests')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t('requests.title')} description={t('visual.requestsIntro')} />
        {['underReview', 'changesRequested', 'detailsShared'].map((status, index) => (
          <PortalRow
            key={status}
            icon="clipboard-tick"
            title={`FX-VISUAL-00${index + 1}`}
            meta={t('farmDetails.newTitle')}
            status={status}
            href="/my/requests"
          />
        ))}
      </div>
    );
  else if (screen === 'empty')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t('farms.title')} description={t('visual.farmsIntro')} />
        <PortalEmpty
          icon="tree"
          title={t('visual.emptyFarms')}
          body={t('farms.empty')}
          href="/my/farms/new"
          action={t('visual.list')}
        />
      </div>
    );
  else if (screen === 'messages')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t('messages.title')} description={t('messages.mediationNote')} />
        <MessagesInbox />
      </div>
    );
  else if (screen === 'conversation') content = <MessageThread caseId="visual-case" userId="visual-user" />;
  else if (screen === 'saved')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t('saved.title')} description={t('visual.savedIntro')} />
        <SavedListings
          items={[
            {
              id: 'visual-listing',
              slug: 'visual-reference-only',
              farmName: 'Visual reference farm',
              governorate: locale === 'ar' ? 'مرجع اختبار' : 'Visual fixture',
              listingType: 'sale',
              farmExitScore: 82,
            },
          ]}
        />
      </div>
    );
  else if (screen === 'account-profile')
    content = (
      <ProfileContent
        user={{
          id: 'visual-user',
          fullName: locale === 'ar' ? 'حساب اختبار' : 'Visual test',
          mobileE164: '+201000000000',
          email: null,
          mobileVerified: true,
          profileCompleted: true,
        }}
      />
    );
  else if (screen === 'documents' || screen === 'notifications')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t(`nav.${screen}`)} />
        <PortalEmpty
          icon={screen === 'documents' ? 'folder' : 'notification'}
          title={t('visual.unavailable')}
          body={screen === 'documents' ? t('documents.gapNote') : t('comingSoon.body')}
        />
      </div>
    );
  else if (screen === 'success')
    content = (
      <FarmDetailsRequestDetail
        request={{
          id: 'visual-request',
          requestNumber: 'FX-VISUAL-001',
          status: 'underFarmExitReview',
          listing: { listingSlug: 'visual-reference-only', listingType: 'sale', listingRequestId: 'visual-listing' },
          message: null,
          reviews: [],
          submittedAt: '2026-01-01T12:00:00Z',
          createdAt: '2026-01-01T12:00:00Z',
        }}
      />
    );
  else if (screen === 'verification')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t('professional.title')} />
        {['verificationRequired', 'underReview', 'verified', 'changesRequested', 'notApproved'].map((status) => (
          <VerificationCard key={status} status={status} name={t('professional.types.farmManager')} />
        ))}
      </div>
    );
  else if (screen === 'confirmation')
    content = (
      <div className="flex flex-col gap-24">
        <PortalHeading title={t('farmDetails.newTitle')} />
        <FarmDetailsRequestForm slug="visual-reference-only" farmName="Visual reference farm" />
      </div>
    );
  else notFound();
  return (
    <MyFarmExitLayout
      session={{
        accessToken: 'isolated-test-only',
        user: {
          id: 'visual-user',
          fullName: locale === 'ar' ? 'حساب اختبار' : 'Visual test',
          mobileE164: '+201000000000',
          email: null,
          mobileVerified: true,
          profileCompleted: true,
        },
      }}
    >
      {content}
    </MyFarmExitLayout>
  );
}
