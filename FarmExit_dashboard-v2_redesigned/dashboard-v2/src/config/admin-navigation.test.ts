import assert from 'node:assert/strict';
import test from 'node:test';
import { adminNavigation } from './admin-navigation';

test('phase 13.4 navigation enables platform admin modules', () => {
  const items = adminNavigation.flatMap((g) => g.items);
  const byKey = new Map(items.map((i) => [i.key, i]));
  assert.equal(byKey.get('evaluations')?.enabled, true);
  assert.equal(byKey.get('communications')?.enabled, true);
  assert.equal(byKey.get('administrators')?.enabled, true);
  assert.equal(byKey.get('users')?.enabled, true);
  assert.equal(byKey.get('auditLogs')?.enabled, true);
});

test('specialized request queues share the unified inbox while publication remains distinct', () => {
  const keys = adminNavigation.flatMap((group) => group.items.map((item) => item.key));
  for (const key of ['verification', 'partnerships', 'farmManagement', 'farmDetails']) assert.equal(keys.includes(key), false);
  for (const key of ['requestsHub', 'listings', 'listingPipeline']) assert.equal(keys.includes(key), true);
});
