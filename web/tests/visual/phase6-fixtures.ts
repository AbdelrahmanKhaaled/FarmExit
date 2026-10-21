import type { Page } from '@playwright/test';
import { resolve } from 'node:path';
import type { Facility } from '../../src/features/my-farms/FarmFacilitiesPanel';
export async function isolatePhase6(
  page: Page,
  locale = 'en',
  options: { uploadError?: boolean; saveError?: boolean; submitError?: boolean; submitDelay?: number } = {},
) {
  const mutations: { url: string; method: string; body: unknown }[] = [];
  const facilities: Facility[] = [];
  let specification = {
    amenities: [] as string[],
    cropTypes: ['citrus'],
    productionDetails: { currentProduction: null, harvestSeasons: null, notes: null },
    canEdit: true,
  };
  let location = {
    farmId: '1001',
    privatePinLatitude: null,
    privatePinLongitude: null,
    nearestMainRoad: null,
    roadDistanceKm: null,
  };
  let docs = [
    {
      id: '3001',
      slotKey: 'supporting_document_1',
      documentType: locale === 'ar' ? 'مستند مرجعي' : 'Reference document',
      originalName: 'visual-reference.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: '1024',
      reviewStatus: 'changesRequested',
      reviewNote: locale === 'ar' ? 'نسخة أوضح مطلوبة.' : 'A clearer copy is needed.',
      createdAt: '2026-01-01T12:00:00Z',
    },
  ];
  let farm = {
    id: '1001',
    name: 'Visual reference farm',
    farmType: 'fruit',
    mainActivity: 'Oranges and mandarins',
    areaFeddan: 48,
    governorate: 'Beni Suef',
    areaName: 'Beba',
    description: null,
    irrigationMethod: 'drip',
    waterSource: 'well',
    energySource: 'electricity',
    soilType: null,
    myRoles: ['owner'],
  };
  let listing = {
    id: '2001',
    farmId: '1001',
    farmName: farm.name,
    requestNumber: 'FX-VISUAL-2001',
    listingType: 'sale',
    status: 'draft',
    visibility: 'private',
    askingPrice: 18500000,
    annualRentPerFeddan: null,
    statedSalePricePerFeddan: null,
    availability: 'Available now',
    listingDescription: null,
    highlights: [],
    createdAt: null,
    updatedAt: null,
    reviews: [],
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname,
      method = request.method();
    if (method !== 'GET')
      mutations.push({
        url: path,
        method,
        body: request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : 'multipart',
      });
    if (path.endsWith('/file'))
      return route.fulfill({
        path: resolve(__dirname, '../../public/images/home/farm-beni-suef.jpg').replace(
          'farm-beni-suef.jpg',
          'farm-wadi-el-natrun.jpg',
        ),
      });
    if (path === '/api/auth/me') return route.fulfill({ status: 401, json: { message: 'Isolated fixture' } });
    if (path.endsWith('/private-location')) {
      if (options.saveError && method !== 'GET')
        return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      if (method === 'PATCH') location = { ...location, ...request.postDataJSON() };
      return route.fulfill({ json: location });
    }
    if (path.endsWith('/submit')) {
      if (options.submitDelay) await new Promise((resolve) => setTimeout(resolve, options.submitDelay));
      if (options.submitError) return route.fulfill({ status: 409, json: { message: 'Not confirmed' } });
      listing = { ...listing, status: 'underFarmExitReview' };
      return route.fulfill({ json: listing });
    }
    if (path.endsWith('/documents')) {
      if (method === 'GET') return route.fulfill({ json: docs });
      if (options.uploadError) return route.fulfill({ status: 413, json: { message: 'Upload rejected' } });
      docs = [
        {
          ...docs[0]!,
          id: String(3001 + docs.length),
          slotKey: /name="slotKey"\r\n\r\n([^\r\n]+)/.exec(request.postDataBuffer()?.toString() ?? '')?.[1] ?? '',
          reviewStatus: 'uploaded',
          reviewNote: '',
          originalName: /filename="([^"]+)"/.exec(request.postDataBuffer()?.toString() ?? '')?.[1] ?? 'new-copy.pdf',
        },
        ...docs,
      ];
      return route.fulfill({ json: docs[0] });
    }
    if (path.endsWith('/media')) {
      if (method === 'GET')
        return route.fulfill({
          json: {
            items: [
              {
                id: '4001',
                altEn: 'Approved visual fixture image',
                altAr: 'صورة مرجعية للاختبار',
                contentType: 'image/jpeg',
                isIllustrative: false,
              },
            ],
          },
        });
      if (options.uploadError) return route.fulfill({ status: 413, json: { message: 'Upload rejected' } });
      return route.fulfill({ json: { id: '4002' } });
    }
    if (path.endsWith('/facilities')) {
      if (method === 'GET') return route.fulfill({ json: { items: facilities } });
      const facility = {
        ...request.postDataJSON(),
        id: String(5001 + facilities.length),
        status: 'active',
      } as Facility;
      facilities.push(facility);
      return route.fulfill({ json: facility });
    }
    if (path.endsWith('/specifications')) {
      if (method === 'PATCH') specification = { ...specification, ...request.postDataJSON() };
      return route.fulfill({ json: specification });
    }
    if (path.endsWith('/sale-terms')) {
      if (options.saveError && method !== 'GET') return route.fulfill({status:503,json:{message:'Unavailable'}});
      return method === 'GET' ? route.fulfill({status:404,json:{message:'Not configured'}}) : route.fulfill({json:{...request.postDataJSON(),configured:true}});
    }
    if (path.includes('/listing-requests')) {
      if (options.saveError && method !== 'GET')
        return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      if (method !== 'GET') listing = { ...listing, ...request.postDataJSON() };
      return route.fulfill({ json: listing });
    }
    if (path === '/api/farms' || /^\/api\/farms\/\d+$/.test(path)) {
      if (options.saveError) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      if (method !== 'GET') farm = { ...farm, ...request.postDataJSON() };
      return route.fulfill({ json: farm });
    }
    return route.fulfill({ status: 401, json: { message: 'No backend in this fixture app' } });
  });
  return mutations;
}
