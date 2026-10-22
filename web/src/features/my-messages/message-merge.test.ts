import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendMessageIfNew, mergeMessageRows } from './message-merge.ts';
import type { MessageRow } from './messages-types.ts';

const row = (id: string, sentAt: string, senderId = '1'): MessageRow => ({
  id,
  senderId,
  body: `m${id}`,
  sentAt,
  isRelayedCopy: false,
});

describe('mergeMessageRows', () => {
  it('deduplicates by id', () => {
    const a = [row('1', '2026-01-01T10:00:00.000Z'), row('2', '2026-01-01T11:00:00.000Z')];
    const b = [row('2', '2026-01-01T11:00:00.000Z', '9'), row('3', '2026-01-01T12:00:00.000Z')];
    const merged = mergeMessageRows(a, b);
    assert.equal(merged.length, 3);
    assert.equal(merged.find((m) => m.id === '2')?.senderId, '9');
  });

  it('sorts by sentAt then id', () => {
    const merged = mergeMessageRows([row('b', '2026-01-02T00:00:00.000Z')], [row('a', '2026-01-01T00:00:00.000Z')]);
    assert.deepEqual(merged.map((m) => m.id), ['a', 'b']);
  });
});

describe('appendMessageIfNew', () => {
  it('ignores wrong case', () => {
    const prev = [row('1', '2026-01-01T00:00:00.000Z')];
    const next = appendMessageIfNew(prev, '5', '9', row('2', '2026-01-01T01:00:00.000Z'));
    assert.deepEqual(next, prev);
  });

  it('skips duplicate id', () => {
    const prev = [row('1', '2026-01-01T00:00:00.000Z')];
    const next = appendMessageIfNew(prev, '5', '5', row('1', '2026-01-01T00:00:00.000Z'));
    assert.deepEqual(next, prev);
  });
});
