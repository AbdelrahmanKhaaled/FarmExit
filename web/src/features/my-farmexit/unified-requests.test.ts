import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  categoryForRequestType,
  filterByCategory,
  isRequestActive,
  shouldExcludeFromMyRequests,
} from './unified-requests-filters.ts';

describe('unified-requests', () => {
  it('excludes partnership applications from My Requests', () => {
    assert.equal(shouldExcludeFromMyRequests('partnershipApplication'), true);
    assert.equal(shouldExcludeFromMyRequests('farmManagement'), false);
  });

  it('maps request types to filter categories', () => {
    assert.equal(categoryForRequestType('farmListing'), 'farmListing');
    assert.equal(categoryForRequestType('farmPurchaseProposal'), 'farmPurchaseProposal');
    assert.equal(categoryForRequestType('unknownType'), 'other');
  });

  it('filters by category', () => {
    const items = [
      {
        id: '1',
        requestType: 'farmListing',
        requestNumber: 'A',
        status: 'draft',
        updatedAt: '',
        submittedAt: null,
        closedAt: null,
        farm: null,
      },
      {
        id: '2',
        requestType: 'farmManagement',
        requestNumber: 'B',
        status: 'approved',
        updatedAt: '',
        submittedAt: null,
        closedAt: null,
        farm: null,
      },
    ];
    assert.equal(filterByCategory(items, 'farmManagement').length, 1);
    assert.equal(filterByCategory(items, 'all').length, 2);
  });

  it('groups active vs decided using closedAt and terminal statuses', () => {
    assert.equal(
      isRequestActive({
        id: '1',
        requestType: 'farmListing',
        requestNumber: 'A',
        status: 'rejected',
        updatedAt: '',
        submittedAt: null,
        closedAt: null,
        farm: null,
      }),
      false,
    );
    assert.equal(
      isRequestActive({
        id: '3',
        requestType: 'farmListing',
        requestNumber: 'C',
        status: 'underFarmExitReview',
        updatedAt: '',
        submittedAt: null,
        closedAt: null,
        farm: null,
      }),
      true,
    );
  });
});
