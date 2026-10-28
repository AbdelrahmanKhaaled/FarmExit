import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { specializedAdminPath } from './specialized-request-path';

describe('specializedAdminPath', () => {
  it('maps known request types', () => {
    assert.equal(specializedAdminPath('farmListing', '9'), '/admin/listings/9');
    assert.equal(specializedAdminPath('farmPurchaseProposal', '12'), '/admin/proposals/12');
    assert.equal(specializedAdminPath('unknown', '1'), null);
  });
});
