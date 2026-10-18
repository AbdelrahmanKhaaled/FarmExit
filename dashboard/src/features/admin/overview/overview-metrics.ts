import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';

export function formatAdminNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale).format(n);
}

export function listingSplit(overview: AdminDashboardOverview) {
  const sale = overview.publishedSaleListings;
  const rent = overview.publishedRentListings;
  const total = sale + rent;
  return { sale, rent, total };
}

export function workflowRequestMix(overview: AdminDashboardOverview) {
  return [
    { key: 'pendingListingRequests', value: overview.pendingListingRequests },
    { key: 'farmManagementRequests', value: overview.farmManagementRequests },
    { key: 'partnershipRequests', value: overview.partnershipRequests },
    { key: 'partnershipApplications', value: overview.partnershipApplications },
    { key: 'professionalVerificationRequests', value: overview.professionalVerificationRequests },
    { key: 'farmDetailsInquiries', value: overview.farmDetailsInquiries },
    { key: 'purchaseProposals', value: overview.purchaseProposals },
  ].filter((row) => row.value > 0);
}

export function queuePriorityItems(queue: AdminWorkQueue, overview: AdminDashboardOverview) {
  return [
    { key: 'unassignedUnderReview', value: queue.unassignedUnderReview, high: queue.unassignedUnderReview > 0 },
    { key: 'pendingDocumentReviews', value: queue.pendingDocumentReviews, high: queue.pendingDocumentReviews > 0 },
    { key: 'changesRequested', value: queue.changesRequested, high: false },
    { key: 'activeCommunicationCases', value: queue.activeCommunicationCases, high: queue.activeCommunicationCases > 0 },
    { key: 'recentlyUpdatedRequests', value: queue.recentlyUpdatedRequests, high: false },
    { key: 'requestsAwaitingReview', value: overview.requestsAwaitingReview, high: overview.requestsAwaitingReview > 0 },
    {
      key: 'requestsAwaitingStaffAssignment',
      value: overview.requestsAwaitingStaffAssignment,
      high: overview.requestsAwaitingStaffAssignment > 0,
    },
  ];
}

export function attentionCount(queue: AdminWorkQueue, overview: AdminDashboardOverview) {
  return (
    (queue.unassignedUnderReview > 0 ? 1 : 0) +
    (queue.pendingDocumentReviews > 0 ? 1 : 0) +
    (queue.activeCommunicationCases > 0 ? 1 : 0) +
    (overview.requestsAwaitingReview > 0 ? 1 : 0)
  );
}
