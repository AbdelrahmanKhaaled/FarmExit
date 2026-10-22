export type UnifiedRequestItem = {
  id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  updatedAt: string;
  submittedAt: string | null;
  closedAt: string | null;
  farm: { name: string; governorate: string | null } | null;
};

export type RequestFilterCategory =
  | 'all'
  | 'farmListing'
  | 'farmDetails'
  | 'farmManagement'
  | 'partnership'
  | 'professionalVerification'
  | 'farmPurchaseProposal'
  | 'other';

const TERMINAL_STATUSES = new Set(['rejected', 'withdrawn', 'notApproved', 'cancelled']);

export function shouldExcludeFromMyRequests(requestType: string): boolean {
  return requestType === 'partnershipApplication';
}

export function categoryForRequestType(requestType: string): RequestFilterCategory {
  switch (requestType) {
    case 'farmListing':
      return 'farmListing';
    case 'farmDetails':
      return 'farmDetails';
    case 'farmManagement':
      return 'farmManagement';
    case 'partnership':
      return 'partnership';
    case 'professionalVerification':
      return 'professionalVerification';
    case 'farmPurchaseProposal':
      return 'farmPurchaseProposal';
    default:
      return 'other';
  }
}

export function filterByCategory(
  items: UnifiedRequestItem[],
  category: RequestFilterCategory,
): UnifiedRequestItem[] {
  if (category === 'all') return items;
  return items.filter((item) => categoryForRequestType(item.requestType) === category);
}

export function isRequestActive(item: UnifiedRequestItem): boolean {
  if (item.closedAt) return false;
  return !TERMINAL_STATUSES.has(item.status);
}

export function needsAttention(item: UnifiedRequestItem): boolean {
  return item.status === 'changesRequested' || item.status === 'draft';
}

export const REQUEST_FILTER_ORDER: RequestFilterCategory[] = [
  'all',
  'farmListing',
  'farmDetails',
  'farmManagement',
  'partnership',
  'professionalVerification',
  'farmPurchaseProposal',
];
