import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isNearScrollBottom, shouldStickToLatest } from './message-scroll.ts';

describe('message-scroll', () => {
  it('detects near-bottom within threshold', () => {
    assert.equal(isNearScrollBottom(1000, 900, 100, 80), true);
    assert.equal(isNearScrollBottom(1000, 700, 100, 80), false);
  });

  it('sticks to latest when forced or already near bottom', () => {
    assert.equal(shouldStickToLatest(true, false), true);
    assert.equal(shouldStickToLatest(false, true), true);
    assert.equal(shouldStickToLatest(false, false), false);
  });
});
