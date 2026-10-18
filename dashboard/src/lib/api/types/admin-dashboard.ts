/** Mirrors `AdminDashboardOverviewDto` / `AdminWorkQueueDto` from the Nest API. */
export type AdminDashboardOverview = {
  registeredUsers: number;
  farms: number;
  publishedSaleListings: number;
  publishedRentListings: number;
  pendingListingRequests: number;
  farmManagementRequests: number;
  partnershipRequests: number;
  partnershipApplications: number;
  professionalVerificationRequests: number;
  farmDetailsInquiries: number;
  purchaseProposals: number;
  activeCommunicationCases: number;
  requestsAwaitingStaffAssignment: number;
  requestsAwaitingReview: number;
};

export type AdminWorkQueue = {
  unassignedUnderReview: number;
  changesRequested: number;
  pendingDocumentReviews: number;
  activeCommunicationCases: number;
  recentlyUpdatedRequests: number;
};

export type StaffMe = {
  id: string;
  fullName: string | null;
  roles: string[];
  permissions: string[];
};
