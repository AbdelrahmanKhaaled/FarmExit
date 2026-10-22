import type { IconName } from '@/components/icons/Icon';
import {
  REQUEST_FILTER_ORDER,
  categoryForRequestType,
  filterByCategory,
  isRequestActive,
  needsAttention,
  resolveRequestAction,
  shouldExcludeFromMyRequests,
  type RequestActionKey,
  type RequestFilterCategory,
  type UnifiedRequestItem,
} from './unified-requests-core';

export {
  REQUEST_FILTER_ORDER,
  categoryForRequestType,
  filterByCategory,
  isRequestActive,
  needsAttention,
  resolveRequestAction,
  shouldExcludeFromMyRequests,
  type RequestActionKey,
  type RequestFilterCategory,
  type UnifiedRequestItem,
};

export function iconForRequestType(requestType: string): IconName {
  switch (categoryForRequestType(requestType)) {
    case 'farmListing':
      return 'tree';
    case 'farmDetails':
      return 'document-text';
    case 'farmManagement':
      return 'building';
    case 'partnership':
      return 'category';
    case 'professionalVerification':
      return 'shield-tick';
    case 'farmPurchaseProposal':
      return 'clipboard-tick';
    default:
      return 'clipboard-tick';
  }
}
