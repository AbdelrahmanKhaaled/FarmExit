import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { statusVariant } from './status-variants';

describe('statusVariant', () => {
  it('maps workflow statuses', () => {
    assert.equal(statusVariant('underFarmExitReview'), 'warning');
    assert.equal(statusVariant('approved'), 'default');
    assert.equal(statusVariant('rejected'), 'muted');
    assert.equal(statusVariant('unknownValue'), 'outline');
  });
});
