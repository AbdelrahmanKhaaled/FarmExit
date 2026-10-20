import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AddFarmWizard } from '@/features/my-farms/AddFarmWizard';
import { MyFarmsList } from '@/features/my-farms/MyFarmsList';
import { FarmWorkspace } from '@/features/my-farms/FarmWorkspace';
import { ListingTracking } from '@/features/my-farms/ListingTracking';
import { MyFarmExitLayout } from '@/features/my-farmexit/MyFarmExitLayout';
import type { Farm, ListingDraft } from '@/features/my-farms/types';

// Synthetic records ONLY in this environment-guarded test app. No BFF or database exists here.
export default async function Fixture({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; screen: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale, screen } = await params;
  const query = await searchParams;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  const user = {
    id: 'visual-user',
    fullName: locale === 'ar' ? 'حساب اختبار' : 'Visual test',
    mobileE164: '+201000000000',
    email: null,
    mobileVerified: true,
    profileCompleted: true,
  };
  const farm: Farm = {
    id: '1001',
    name: locale === 'ar' ? 'مزرعة مرجعية للاختبار' : 'Visual reference farm',
    farmType: 'fruit',
    mainActivity: locale === 'ar' ? 'برتقال ويوسفي' : 'Oranges and mandarins',
    areaFeddan: 48,
    governorate: 'Beni Suef',
    areaName: 'Beba',
    description: null,
    waterSource: 'well',
    irrigationMethod: 'drip',
    energySource: 'electricity',
    soilType: null,
    myRoles: ['owner'],
  };
  const listing: ListingDraft = {
    id: '2001',
    farmId: farm.id,
    farmName: farm.name,
    requestNumber: 'FX-VISUAL-2001',
    listingType: 'sale',
    status: screen === 'changes' ? 'changesRequested' : screen === 'readonly' ? 'underFarmExitReview' : 'draft',
    visibility: 'private',
    askingPrice: 18500000,
    annualRentPerFeddan: null,
    statedSalePricePerFeddan: null,
    availability: locale === 'ar' ? 'متاحة دلوقتي' : 'Available now',
    listingDescription:
      locale === 'ar' ? 'وصف مرجعي للاختبار فقط.' : 'Reference description for isolated visual verification only.',
    highlights: [],
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
    reviews:
      screen === 'changes'
        ? [
            {
              decision: 'changesRequested',
              comment: locale === 'ar' ? 'ارفع نسخة أوضح من المستند.' : 'Upload a clearer copy of the document.',
              createdAt: '2026-01-02T12:00:00Z',
            },
          ]
        : [],
  };
  const request = {
    id: listing.id,
    requestNumber: listing.requestNumber,
    requestType: 'farmListing',
    status: 'changesRequested',
    visibility: 'private',
    submittedAt: '2026-01-01T12:00:00Z',
    publishedAt: null,
    farm: { id: farm.id, name: farm.name, governorate: farm.governorate },
    statusHistory: [
      { toStatus: 'draft', reason: null, createdAt: '2026-01-01T12:00:00Z' },
      { toStatus: 'underFarmExitReview', reason: null, createdAt: '2026-01-01T13:00:00Z' },
      {
        toStatus: 'changesRequested',
        reason: locale === 'ar' ? 'نسخة أوضح مطلوبة.' : 'A clearer copy is needed.',
        createdAt: '2026-01-02T12:00:00Z',
      },
    ],
    reviews: [
      {
        decision: 'changesRequested',
        comment: locale === 'ar' ? 'ارفع نسخة أوضح.' : 'Please upload a clearer copy.',
        createdAt: '2026-01-02T12:00:00Z',
      },
    ],
  };
  if (['wizard', 'changes', 'readonly', 'new'].includes(screen))
    return (
      <AddFarmWizard
        user={user}
        initialFarm={screen === 'new' ? undefined : farm}
        initialListing={screen === 'new' ? undefined : listing}
        initialSpecification={
          screen === 'new'
            ? undefined
            : {
                cropTypes: ['citrus'],
                productionDetails: { currentProduction: null, harvestSeasons: null, notes: null },
                canEdit: true,
              }
        }
        initialStep={screen === 'changes' || screen === 'readonly' ? 6 : Number(query.step) || 1}
      />
    );
  let content;
  if (screen === 'farms')
    content = (
      <MyFarmsList
        farms={['draft', 'underFarmExitReview', 'changesRequested', 'published'].map((status, index) => ({
          ...farm,
          id: String(1001 + index),
          name: `${farm.name} ${index + 1}`,
        }))}
        listings={['draft', 'underFarmExitReview', 'changesRequested', 'published'].map((status, index) => ({
          ...listing,
          id: String(2001 + index),
          farmId: String(1001 + index),
          status,
        }))}
      />
    );
  else if (screen === 'workspace')
    content = <FarmWorkspace farm={farm} listings={[{ ...listing, status: 'changesRequested' }]} tracking={request} />;
  else if (screen === 'tracking')
    content = <ListingTracking request={request} listing={{ ...listing, status: 'changesRequested' }} />;
  else notFound();
  return <MyFarmExitLayout session={{ accessToken: 'isolated-only', user }}>{content}</MyFarmExitLayout>;
}
