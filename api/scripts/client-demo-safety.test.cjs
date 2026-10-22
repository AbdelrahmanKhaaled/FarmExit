const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertLocalDevelopment } = require('./client-demo-safety.cjs');
const safe = { NODE_ENV: 'development', DATABASE_URL: 'mysql://demo:secret@127.0.0.1:3306/farmexit' };

test('dry-run identifies local target without returning credentials', () => {
  assert.deepEqual(assertLocalDevelopment(safe), {
    host: '127.0.0.1',
    port: '3306',
    database: 'farmexit',
    nodeEnv: 'development',
  });
});
for (const value of ['production', 'staging', 'test', undefined]) {
  test(`refuses unconfirmed environment ${value}`, () => {
    assert.throws(() => assertLocalDevelopment({ ...safe, NODE_ENV: value }));
  });
}
for (const url of [
  'mysql://x:x@example.com/farmexit',
  'mysql://x:x@localhost/customer',
  'mysql://x:x@localhost/farmexit_staging',
  undefined,
]) {
  test(`refuses unsafe target ${url ? new URL(url).host + new URL(url).pathname : 'missing'}`, () => {
    assert.throws(() => assertLocalDevelopment({ ...safe, DATABASE_URL: url }));
  });
}
test('requires explicit local opt-in before any write', () => {
  assert.throws(() => assertLocalDevelopment(safe, ['--apply']));
  assert.doesNotThrow(() => assertLocalDevelopment(safe, ['--apply', '--confirm-local-development']));
});
test('cannot bypass missing publication business rule', () => {
  assert.throws(() => assertLocalDevelopment(safe, ['--publish']), /BLOCKED/);
});
