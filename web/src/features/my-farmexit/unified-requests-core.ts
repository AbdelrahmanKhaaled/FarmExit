import { requestDetailHref, type RequestRouteRef } from '../my-messages/request-context';
import {
  REQUEST_FILTER_ORDER,
  categoryForRequestType,
  filterByCategory,
  isRequestActive,
  needsAttention,
  shouldExcludeFromMyRequests,
  type RequestFilterCategory,
  type UnifiedRequestItem,
} from './unified-requests-filters';

export {
  REQUEST_FILTER_ORDER,
  categoryForRequestType,
  filterByCategory,
  isRequestActive,
  needsAttention,
  shouldExcludeFromMyRequests,
  type RequestFilterCategory,
  type UnifiedRequestItem,
};

export type RequestActionKey = 'continueDraft' | 'updateInfo' | 'track' | 'view';

export function resolveRequestAction(item: UnifiedRequestItem): { href: string; actionKey: RequestActionKey } {
  const href = requestDetailHref(item as RequestRouteRef);
  if (item.status === 'draft') return { href, actionKey: 'continueDraft' };
  if (item.status === 'changesRequested') return { href, actionKey: 'updateInfo' };
  if (item.status === 'underFarmExitReview' || item.status === 'submitted') return { href, actionKey: 'track' };
  return { href, actionKey: 'view' };
}
