import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeHomepageAggregates, localizeGovernorate } from './home-aggregates';
import type { PublicListingDto } from '@/lib/api/public-listing';
import type { PublicOpportunity } from '@/lib/opportunities/public-opportunity';

test('localizeGovernorate translates known governorates into Arabic and preserves English', () => {
  assert.equal(localizeGovernorate('Beheira', 'en'), 'Beheira');
  assert.equal(localizeGovernorate('Beheira', 'ar'), 'البحيرة');
  assert.equal(localizeGovernorate('Kafr El Sheikh', 'ar'), 'كفر الشيخ');
  assert.equal(localizeGovernorate('Minya', 'ar'), 'المنيا');
  assert.equal(localizeGovernorate('Fayoum', 'ar'), 'الفيوم');
  assert.equal(localizeGovernorate('Sharqia', 'ar'), 'الشرقية');
  assert.equal(localizeGovernorate('Giza', 'ar'), 'الجيزة');
});

test('computeHomepageAggregates does not invent unique-farm totals from legacy listing names', () => {
  const listings: PublicListingDto[] = [
    {
      id: '1',
      slug: 'sale-farm-alpha',
      farmName: 'Farm Alpha',
      governorate: 'Beheira',
      areaName: 'Wadi Natrun',
      areaFeddan: 100,
      listingType: 'sale',
      askingPrice: 50_000_000,
      annualRentPerFeddan: null,
      statedSalePricePerFeddan: 500_000,
      currency: 'EGP',
      availability: 'immediate',
      listingDescription: 'Sale listing',
      highlights: [],
      publishedAt: '2026-10-25T10:00:00Z',
      farmExitScore: null,
    },
    {
      id: '2',
      slug: 'rent-farm-alpha',
      farmName: 'Farm Alpha', // Duplicate farm under rent
      governorate: 'Beheira',
      areaName: 'Wadi Natrun',
      areaFeddan: 100,
      listingType: 'rent',
      askingPrice: null,
      annualRentPerFeddan: 20_000,
      statedSalePricePerFeddan: null,
      currency: 'EGP',
      availability: 'immediate',
      listingDescription: 'Rent listing',
      highlights: [],
      publishedAt: '2026-10-25T11:00:00Z',
      farmExitScore: null,
    },
    {
      id: '3',
      slug: 'sale-farm-beta',
      farmName: 'Farm Beta',
      governorate: 'Giza',
      areaName: 'Birqash',
      areaFeddan: 50,
      listingType: 'sale',
      askingPrice: 20_000_000,
      annualRentPerFeddan: null,
      statedSalePricePerFeddan: 400_000,
      currency: 'EGP',
      availability: 'immediate',
      listingDescription: 'Sale listing',
      highlights: [],
      publishedAt: '2026-10-25T12:00:00Z',
      farmExitScore: null,
    },
  ];

  const management: PublicOpportunity[] = [
    {
      id: 'm1',
      farmName: 'Mgmt Farm 1',
      governorate: 'Giza',
      areaName: 'Birqash',
      areaFeddan: 30,
      farmType: 'fruit',
      mainActivity: 'Citrus',
      publishedAt: '2026-10-25T10:00:00Z',
      reviewStatus: 'approved',
    },
    {
      id: 'm2',
      farmName: 'Mgmt Farm 2',
      governorate: 'Minya',
      areaName: null,
      areaFeddan: 40,
      farmType: null,
      mainActivity: null,
      publishedAt: '2026-10-25T11:00:00Z',
      reviewStatus: 'approved',
    },
    {
      id: 'm3',
      farmName: 'Mgmt Farm 3',
      governorate: 'Fayoum',
      areaName: null,
      areaFeddan: 20,
      farmType: null,
      mainActivity: null,
      publishedAt: '2026-10-25T12:00:00Z',
      reviewStatus: 'approved',
    },
    {
      id: 'm4',
      farmName: 'Mgmt Farm 4', // 4th opportunity should be truncated to 3 for Homepage
      governorate: 'Sharqia',
      areaName: null,
      areaFeddan: 10,
      farmType: null,
      mainActivity: null,
      publishedAt: '2026-10-25T13:00:00Z',
      reviewStatus: 'approved',
    },
  ];

  const result = computeHomepageAggregates({
    allListings: listings,
    managementOpportunities: management,
    managementTotal: 10,
    partnershipOpportunities: [],
    partnershipTotal: 5,
    locale: 'en',
  });

  // Unique farm identity is unavailable in the legacy contract.
  assert.equal(result.metrics.farms, null);
  // Do not infer an exact unique-farm area from listing rows.
  assert.equal(result.metrics.feddans, null);
  // Total listings: 3 listings
  assert.equal(result.metrics.listings, 3);
  // Opportunities: 10 management + 5 partnership = 15
  assert.equal(result.metrics.opportunities, 15);
  // Governorates: Beheira and Giza = 2
  assert.equal(result.metrics.governorates, 2);

  // Exactly 3 management opportunities sliced for display
  assert.equal(result.management.length, 3);
  assert.equal(result.management[0].id, 'm1');
  assert.equal(result.management[1].id, 'm2');
  assert.equal(result.management[2].id, 'm3');

  // Market Insights calculations:
  // Beheira: 2 listings (1 sale @ 50M/100 = 500,000, 1 rent @ 20,000)
  // Giza: 1 listing (1 sale @ 20M/50 = 400,000, 0 rent)
  assert.equal(result.insights.length, 2);
  const beheiraInsight = result.insights.find((i) => i.governorate === 'Beheira');
  assert.ok(beheiraInsight);
  assert.equal(beheiraInsight.listings, 2);
  assert.equal(beheiraInsight.salePerFeddan, 500_000);
  assert.equal(beheiraInsight.rentPerFeddan, 20_000);

  const gizaInsight = result.insights.find((i) => i.governorate === 'Giza');
  assert.ok(gizaInsight);
  assert.equal(gizaInsight.listings, 1);
  assert.equal(gizaInsight.salePerFeddan, 400_000);
  assert.equal(gizaInsight.rentPerFeddan, null);
});
