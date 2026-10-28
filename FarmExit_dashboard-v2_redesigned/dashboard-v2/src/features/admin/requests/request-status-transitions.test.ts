import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allowedGenericStatusTransitions, supportsGenericStatusTransition } from './request-status-transitions';

describe('request-status-transitions', () => {
  it('blocks specialized workflow types', () => {
    assert.equal(supportsGenericStatusTransition('farmListing'), false);
    assert.equal(supportsGenericStatusTransition('farmPurchaseProposal'), true);
  });

  it('offers close from active generic states', () => {
    const opts = allowedGenericStatusTransitions('approved', false);
    assert.ok(opts.some((o) => o.status === 'closed'));
  });

  it('offers no transitions from closed for non-admin', () => {
    assert.equal(allowedGenericStatusTransitions('closed', false).length, 0);
  });
});
