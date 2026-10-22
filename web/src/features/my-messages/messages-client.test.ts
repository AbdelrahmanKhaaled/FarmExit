import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchCaseMessages } from './messages-client.ts';

test('loads both older and recent messages using API-supported pages', async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    const page = urls.length;
    const items = Array.from({ length: page === 1 ? 50 : 2 }, (_, index) => ({
      id: String((page - 1) * 50 + index + 1),
    }));
    return Response.json({ items, total: 52 });
  });
  const result = await fetchCaseMessages('27');
  assert.equal(result?.length, 52);
  assert.equal(result?.at(-1)?.id, '52');
  assert.deepEqual(urls, [
    '/api/communication/cases/27/messages?page=1&pageSize=50',
    '/api/communication/cases/27/messages?page=2&pageSize=50',
  ]);
});

test('does not present partial history when a later page fails', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1 ? Response.json({ items: [{ id: '1' }], total: 2 }) : new Response(null, { status: 403 }),
  );
  assert.equal(await fetchCaseMessages('27'), null);
});
