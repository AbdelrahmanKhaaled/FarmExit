// Isolated, in-memory API contract fixture. Never connects to the real API or database.
import http from 'node:http';
const user = {
  id: 'hero-user',
  fullName: 'Hero Tester',
  mobileE164: '+201000000000',
  email: null,
  mobileVerified: true,
  profileCompleted: true,
};
const farm = {
  id: 'hero-farm',
  name: 'Hero Test Farm',
  farmType: 'fruit',
  areaFeddan: 20,
  governorate: 'Giza',
  areaName: null,
  description: null,
  myRoles: ['owner'],
  waterSource: 'well',
};
const location = {
  farmId: farm.id,
  privatePinLatitude: null,
  privatePinLongitude: null,
  nearestMainRoad: null,
  roadDistanceKm: null,
};
const spec = {
  cropTypes: [],
  amenities: [],
  productionDetails: { currentProduction: null, harvestSeasons: null, notes: null },
  canEdit: true,
};
const facets = {
  governorate: ['Giza', 'Beheira'],
  area: [],
  objective: ['expandCultivation', 'operateTogether'],
  partnerType: [],
  managementType: ['fullManagement'],
};
let listing, terms, writes;
const reset = () => {
  listing = undefined;
  terms = undefined;
  writes = [];
};
reset();
http
  .createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const url = new URL(req.url, 'http://127.0.0.1');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const send = (data, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (path === '/fixture/reset') {
      reset();
      return send({ ok: true });
    }
    if (path === '/fixture/state') return send({ listing, terms, writes });
    if (path === '/fixture/draft') {
      listing = {
        id: 'hero-listing',
        farmId: farm.id,
        farmName: farm.name,
        requestNumber: 'TEST',
        listingType: body.listingType ?? 'sale',
        status: 'draft',
        visibility: 'private',
        askingPrice: null,
        statedSalePricePerFeddan: null,
        annualRentPerFeddan: null,
        highlights: [],
        reviews: [],
        ...body,
      };
      terms = body.terms;
      return send(listing);
    }
    if (req.method !== 'GET') writes.push({ path, method: req.method, body });
    if (path === '/auth/me') return req.headers.authorization ? send(user) : send({}, 401);
    if (path.startsWith('/marketplace/home/'))
      return send({
        sale: { items: [], total: 0, page: 1, pageSize: 9 },
        rent: { items: [], total: 0, page: 1, pageSize: 9 },
        management: [],
        partnerships: [],
        metrics: { listings: 0, farms: 0, feddans: 0, opportunities: 0, governorates: 0 },
        insights: [],
        editorial: null,
      });
    if (path === '/public/partnerships' || path === '/public/management')
      return send({ items: [], total: 0, page: 1, pageSize: 20, filterOptions: facets });
    if (path === '/marketplace/farms') return send({ items: [], total: 0, page: 1, pageSize: 9 });
    if (path === '/farms/mine') return send({ items: [farm], total: 1 });
    if (path === '/listing-requests/mine') return send({ items: listing ? [listing] : [], total: listing ? 1 : 0 });
    if (path === '/farms' || path === '/farms/hero-farm')
      return send({ ...farm, ...(req.method === 'GET' ? {} : body) });
    if (path.endsWith('/private-location')) return send(location);
    if (path.endsWith('/specifications')) return send(spec);
    if (path.endsWith('/sale-terms')) {
      if (req.method === 'PUT') terms = { ...body, configured: true };
      return send(terms ?? {}, terms ? 200 : 404);
    }
    if (path === '/farms/hero-farm/listing-requests' || path === '/listing-requests/hero-listing') {
      if (req.method !== 'GET')
        listing = {
          id: 'hero-listing',
          farmId: farm.id,
          farmName: farm.name,
          requestNumber: 'TEST',
          listingType: 'sale',
          status: 'draft',
          visibility: 'private',
          highlights: [],
          reviews: [],
          ...listing,
          ...body,
        };
      return send(listing ?? {}, listing ? 200 : 404);
    }
    if (/\/(facilities|media)$/.test(path)) return send({ items: [] });
    if (path.endsWith('/documents')) return send([]);
    if (path === '/notifications/unread-count') return send({ count: 0 });
    return send({ items: [], total: 0 });
  })
  .listen(4107, '127.0.0.1', () => console.log('Hero fixture API: 4107'));
