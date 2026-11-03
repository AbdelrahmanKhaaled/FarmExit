// Local browser fixture only. No database, authentication, or production connections.
import http from 'node:http';
let request = {
  id: '901',
  requestNumber: 'TEST-MANAGEMENT-901',
  farmId: '902',
  farmName: 'Test farm',
  professionalNeed: 'farmManager',
  status: 'draft',
  visibility: 'private',
  managementTypes: [],
  goals: [],
  currentSituation: 'Test situation',
  term: '',
  responsibilities: [],
  currentTeam: [],
  resourcesAndFacilities: [],
  reviews: [],
  createdAt: null,
  updatedAt: null,
};
const farm = {
  id: '902',
  name: 'Test farm',
  governorate: 'Giza',
  areaName: 'Test area',
  areaFeddan: 40,
  farmType: 'mixed',
  status: 'active',
};
let verification = {
  id: '903',
  requestNumber: 'TEST-VERIFY-903',
  status: 'draft',
  professionalCapabilityId: '905',
  professionalType: 'farmManager',
  verificationSummary: '',
  reviews: [],
};
let proposal = {
  id: '904',
  requestNumber: 'TEST-PROPOSAL-904',
  listingId: '906',
  proposalKind: 'cash',
  proposedTotalValue: 100,
  requestedSharePercent: null,
  proposalNotes: '',
  status: 'submitted',
  submittedAt: null,
  components: [{ componentType: 'cash', proposedValue: 100 }],
};
http
  .createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = url.pathname.replace('/api/v1', '');
    let data;
    if (pathname === '/professional-verification-requests/903')
      data = req.method === 'PATCH' ? (verification = { ...verification, ...body }) : verification;
    else if (pathname === '/purchase-proposals/904')
      data = req.method === 'PATCH' ? (proposal = { ...proposal, ...body }) : proposal;
    else if (pathname === '/fixture/reset')
      data = request = {
        ...request,
        requestType: body.requestType ?? 'farmManagement',
        status: body.status ?? 'underFarmExitReview',
      };
    else if (pathname === '/staff/me')
      data = {
        id: '900',
        fullName: 'Mock Super Admin',
        roles: ['superAdmin'],
        permissions: ['requests.read', 'requests.review'],
      };
    else if (pathname === '/staff/requests/901')
      data = {
        ...request,
        requestType: request.requestType ?? 'farmManagement',
        currentStep: 7,
        farm,
        creator: { id: '900', fullName: 'Local test owner' },
        statusHistory: [],
        documents: [],
        forwardings: [],
        assignments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    else if (pathname.startsWith('/staff/') && req.method === 'POST')
      data = request = {
        ...request,
        status: body.decision,
        reviews: [{ decision: body.decision, comment: body.comment ?? null }],
      };
    else if (pathname === '/auth/me')
      data = {
        id: '900',
        fullName: 'Local test owner',
        mobileE164: '+201000000000',
        profileCompleted: true,
        mobileVerified: true,
      };
    else if (pathname === '/farm-management-requests/901/submit')
      data = request = { ...request, status: 'underFarmExitReview' };
    else if (pathname === '/farm-management-requests/901')
      data = req.method === 'PATCH' ? (request = { ...request, ...body }) : request;
    else if (pathname === '/farms/902') data = farm;
    else if (pathname === '/farms/mine') data = { items: [farm], total: 1 };
    else if (pathname === '/requests/901') data = { ...request, statusHistory: [] };
    else if (pathname === '/requests') data = { items: [request], total: 1 };
    else if (pathname.includes('/documents')) data = [];
    else if (pathname === '/professional-profile') data = { capabilities: [] };
    else
      data = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        summary: { total: 0, pending: 0, approved: 0, rejected: 0, byStatus: {} },
      };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  })
  .listen(4499, '127.0.0.1', () => console.log('Local mock API on 4499; no database'));
