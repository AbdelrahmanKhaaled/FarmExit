import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnalyticsQueryString } from './analytics-query';

test('buildAnalyticsQueryString prefers custom from/to', () => {
  const qs = buildAnalyticsQueryString({ range: '7d', from: '2026-01-01', to: '2026-01-31' });
  assert.match(qs, /from=2026-01-01/);
  assert.match(qs, /to=2026-01-31/);
  assert.doesNotMatch(qs, /range=/);
});

test('buildAnalyticsQueryString defaults to 30d', () => {
  assert.equal(buildAnalyticsQueryString({}), 'range=30d');
});
