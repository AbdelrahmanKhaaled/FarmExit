import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadHomeCompatibility } from './home-compatibility';

const listing = (id: string, governorate = 'Giza') => ({
  id,
  farmName: 'Same name',
  governorate,
  areaFeddan: 10,
  listingType: 'sale',
  askingPrice: 1000,
});
function source(total: number, items: unknown[], page = 1) {
  return { total, items, page, pageSize: 50 };
}
function fake(overrides: Record<string, unknown> = {}) {
  return (async (url: string | URL | Request) => {
    const path = String(url).replace('https://test', '');
    const value = overrides[path] ?? (path.includes('/farms') ? source(0, []) : source(0, []));
    return value instanceof Response ? value : Response.json(value);
  }) as typeof fetch;
}
test('legacy same-name farms never manufacture exact identity totals; governorates remain real', async () => {
  const data = await loadHomeCompatibility(
    'https://test',
    'en',
    fake({
      '/marketplace/farms?pageSize=50&page=1': source(2, [listing('1'), listing('2', 'Minya')]),
    }),
  );
  assert.equal(data.metrics.farms, null);
  assert.equal(data.metrics.feddans, null);
  assert.equal(data.metrics.governorates, 2);
  assert.equal(data.metrics.listings, 2);
});
test('a failed source is unavailable rather than zero opportunities', async () => {
  await assert.rejects(
    loadHomeCompatibility(
      'https://test',
      'en',
      fake({
        '/public/management?pageSize=50&page=1': new Response('', { status: 503 }),
      }),
    ),
    /failed: 503/,
  );
});
test('failed, short, duplicate and changing listing pages cannot produce partial aggregates', async () => {
  const first = source(
    51,
    Array.from({ length: 50 }, (_, i) => listing(String(i))),
  );
  for (const second of [
    new Response('', { status: 500 }),
    source(51, [], 2),
    source(51, [listing('0')], 2),
    source(52, [listing('51')], 2),
  ]) {
    await assert.rejects(
      loadHomeCompatibility(
        'https://test',
        'en',
        fake({
          '/marketplace/farms?pageSize=50&page=1': first,
          '/marketplace/farms?pageSize=50&page=2': second,
        }),
      ),
    );
  }
});
test('legacy read cap fails closed instead of truncating totals', async () => {
  await assert.rejects(
    loadHomeCompatibility(
      'https://test',
      'en',
      fake({
        '/marketplace/farms?pageSize=50&page=1': source(501, []),
      }),
    ),
    /read limit/,
  );
});
