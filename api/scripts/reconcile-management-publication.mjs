// Read-only by default. No bulk mode; requires one explicitly verified numeric request ID.
const id = process.argv[2];
if (!/^[1-9]\d{0,18}$/.test(id ?? '')) throw Error('Usage: node scripts/reconcile-management-publication.mjs VERIFIED_REQUEST_ID [--execute]');
const base = process.env.FARMEXIT_RECONCILE_API_URL;
const token = process.env.FARMEXIT_RECONCILE_TOKEN;
if (!base || !token) throw Error('Set FARMEXIT_RECONCILE_API_URL and FARMEXIT_RECONCILE_TOKEN without putting credentials in command arguments.');
const endpoint = `${base.replace(/\/$/, '')}/staff/farm-management-requests/${id}`;
async function call(url, method = 'GET') {
  const response = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, redirect: 'error' });
  const result = await response.json();
  if (!response.ok) throw Error(`${response.status}: ${Array.isArray(result.message) ? result.message.join('; ') : result.message}`);
  return result;
}
const before = await call(endpoint);
const readiness = await call(endpoint + '/publication-readiness');
const execute = process.argv.includes('--execute');
console.log(JSON.stringify({ requestId: id, mode: execute ? 'execute' : 'dry-run', status: before.status,
  visibility: before.visibility, publishedAt: before.publishedAt, ownerConsentAt: before.publicationConsentAt, ...readiness }, null, 2));
if (execute) {
  if (!readiness.eligible) throw Error('Publication blocked; resolve the reported requirement first. Nothing was changed.');
  const result = await call(endpoint + '/publish', 'POST');
  console.log(JSON.stringify({ requestId: id, status: result.status, visibility: result.visibility, publishedAt: result.publishedAt }, null, 2));
}
