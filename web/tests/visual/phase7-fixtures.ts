import type { Page } from '@playwright/test';
import type { ProfessionalProfile } from '../../src/features/my-professional/ProfessionalHub';
export async function isolatePhase7(page: Page, options: { fail?: boolean; malformedSubmit?: boolean } = {}) {
  const mutations: { url: string; method: string; body: unknown }[] = [];
  let management = {
    id: '7001',
    requestNumber: 'FX-VISUAL-7001',
    farmId: '1001',
    farmName: 'Visual reference farm',
    professionalNeed: 'farmManager',
    status: 'draft',
    managementTypes: ['fullOperationManagement'],
    term: 'One year',
    currentSituation: 'Owner-stated situation',
    goals: [],
    reviews: [],
    createdAt: null,
    updatedAt: null,
  };
  let profile: ProfessionalProfile = {
    id: '7101',
    headline: 'Farm manager',
    bio: null,
    baseGovernorate: null,
    yearsExperience: null,
    experienceSummary: null,
    capabilities: [],
  };
  let verification = {
    id: '7301',
    requestNumber: 'FX-VISUAL-7301',
    status: 'draft',
    professionalCapabilityId: '7201',
    professionalType: 'farmManager',
    verificationSummary: 'Private verification summary.',
    reviews: [],
  };
  const docs = [
    {
      id: '7401',
      slotKey: 'supporting_document_1',
      documentType: 'Professional document',
      originalName: 'visual-document.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: '1024',
      reviewStatus: 'uploaded',
      reviewNote: null,
      createdAt: null,
    },
  ];
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()).pathname,
      method = req.method();
    const json = req.headers()['content-type']?.includes('application/json');
    const body = json ? req.postDataJSON() : undefined;
    if (method !== 'GET') mutations.push({ url, method, body: body ?? 'multipart' });
    if (options.fail && method !== 'GET') return route.fulfill({ status: 503, json: { message: 'Isolated failure' } });
    if (url.endsWith('/documents')) {
      if (method === 'GET') return route.fulfill({ json: docs });
      const doc = { ...docs[0]!, id: String(7401 + docs.length), originalName: 'new-copy.pdf' };
      docs.unshift(doc);
      return route.fulfill({ json: doc });
    }
    if (url.endsWith('/facilities')) return route.fulfill({ json: { items: [] } });
    if (url === '/api/professional-profile/capabilities' && method === 'POST') {
      profile = {
        ...profile,
        capabilities: [
          ...profile.capabilities,
          {
            id: body.professionalType === 'farmManager' ? '7201' : '7202',
            professionalType: body.professionalType,
            verificationStatus: 'verificationRequired',
            verifiedAt: null,
            notApprovedReason: null,
            expertise: [],
            serviceAreas: [],
          },
        ],
      };
      return route.fulfill({ json: profile });
    }
    if (url.startsWith('/api/professional-profile/capabilities/')) {
      const id = url.split('/').pop();
      if (!profile.capabilities.length)
        profile = {
          ...profile,
          capabilities: [
            {
              id: id!,
              professionalType: 'farmManager',
              verificationStatus: 'verificationRequired',
              verifiedAt: null,
              notApprovedReason: null,
              expertise: [],
              serviceAreas: [],
            },
          ],
        };
      profile = { ...profile, capabilities: profile.capabilities.map((c) => (c.id === id ? { ...c, ...body } : c)) };
      return route.fulfill({ json: profile });
    }
    if (url === '/api/professional-profile') {
      profile = { ...profile, ...body };
      return route.fulfill({ json: profile });
    }
    if (url === '/api/professional-verification-requests' && method === 'GET')
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    if (url.includes('professional-verification-requests')) {
      if (url.endsWith('/submit'))
        verification = { ...verification, status: options.malformedSubmit ? 'draft' : 'underReview' };
      else verification = { ...verification, ...body };
      return route.fulfill({ json: verification });
    }
    if (url.includes('management-requests')) {
      if (url.endsWith('/submit'))
        management = { ...management, status: options.malformedSubmit ? 'draft' : 'underReview' };
      else management = { ...management, ...body };
      return route.fulfill({ json: management });
    }
    return route.fulfill({ status: 404, json: { message: 'Unmocked isolated endpoint' } });
  });
  return mutations;
}
