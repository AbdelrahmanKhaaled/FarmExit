import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendCaseMessageIfNew, mergeCaseMessages } from './message-merge';
import type { CaseMessage } from './communications-types';

const row = (id: string, sentAt: string): CaseMessage => ({
  id,
  senderId: '1',
  body: `m${id}`,
  sentAt,
  isRelayedCopy: false,
});

describe('mergeCaseMessages', () => {
  it('deduplicates by id', () => {
    const merged = mergeCaseMessages(
      [row('1', '2026-01-01T10:00:00.000Z')],
      [row('1', '2026-01-01T10:00:00.000Z'), row('2', '2026-01-01T11:00:00.000Z')],
    );
    assert.equal(merged.length, 2);
  });
});

describe('appendCaseMessageIfNew', () => {
  it('skips duplicate id', () => {
    const prev = [row('1', '2026-01-01T00:00:00.000Z')];
    assert.deepEqual(appendCaseMessageIfNew(prev, row('1', '2026-01-01T00:00:00.000Z')), prev);
  });
});
