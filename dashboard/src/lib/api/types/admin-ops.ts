export type AdminTimeSeriesPoint = { date: string; count: number };

export type AdminAnalyticsReport = {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  timezone: 'UTC';
  newFarms: number;
  publishedListings: number;
  requestsCreated: number;
  purchaseProposals: number;
  farmsOverTime: AdminTimeSeriesPoint[];
  listingsPublishedOverTime: AdminTimeSeriesPoint[];
  requestsOverTime: AdminTimeSeriesPoint[];
  usersRegisteredOverTime: AdminTimeSeriesPoint[];
  requestsByType: Record<string, number>;
  requestsByStatus: Record<string, number>;
  saleListingsPublished: number;
  rentListingsPublished: number;
  openCommunicationCases: number;
  overview: {
    newUsers: number;
    newFarms: number;
    publishedListings: number;
    requestsCreated: number;
    purchaseProposals: number;
    saleListingsPublished: number;
    rentListingsPublished: number;
  };
  timeseries: {
    granularity: 'day' | 'week' | 'month';
    usersRegistered: AdminTimeSeriesPoint[];
    farmsCreated: AdminTimeSeriesPoint[];
    requestsCreated: AdminTimeSeriesPoint[];
    listingsPublished: AdminTimeSeriesPoint[];
    listingsPublishedSale: AdminTimeSeriesPoint[];
    listingsPublishedRent: AdminTimeSeriesPoint[];
    proposalsCreated: AdminTimeSeriesPoint[];
    communicationCasesCreated: AdminTimeSeriesPoint[];
  };
  distributions: {
    requestsByType: Record<string, number>;
    requestsByStatusSnapshot: Record<string, number>;
    requestsByStatusInRange: Record<string, number>;
    listingsSaleVsRent: { sale: number; rent: number };
    listingsByGovernorate: { governorate: string; count: number }[];
    proposalsByKind: Record<string, number>;
    proposalsByStatus: Record<string, number>;
    partnershipRequestsCreated: number;
    partnershipApplicationsCreated: number;
    professionalVerificationByStatus: Record<string, number>;
    farmManagementByStatus: Record<string, number>;
    communicationByStatus: Record<string, number>;
  };
  workflows: {
    awaitingReview: number;
    unassignedReviewer: number;
    changesRequested: number;
    openCommunicationCases: number;
    communicationCasesCreatedInRange: number;
    documentsPendingReview: number;
  };
};

/** @deprecated Use AdminAnalyticsReport */
export type AdminAnalytics = AdminAnalyticsReport;

export type AdminFarmList = {
  items: {
    id: string;
    name: string;
    governorate: string;
    areaName?: string | null;
    areaFeddan: string;
    farmStatus: string;
    createdAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUserDetail = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  mobile: string;
  accountStatus: string;
  mobileVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  requestsCreatedCount: number;
  farmRelationships: { farmId: string; farmName: string; relationshipRole: string }[];
};

export type AdminEvaluationList = {
  items: {
    id: string;
    farmId: string;
    farmName: string;
    status: string;
    scoreValue: number | null;
    scoreMax: number | null;
    reviewerName: string | null;
    createdAt: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUsersList = {
  userItems: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    mobile?: string | null;
    accountStatus: string;
    createdAt: string;
  }[];
  adminItems: {
    userId: string;
    fullName?: string | null;
    email?: string | null;
    mobile?: string | null;
    roles: string[];
    hasCredential: boolean;
    createdAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminAuditList = {
  items: {
    id: string;
    createdAt: string;
    actorName?: string | null;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    summary?: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export type StaffRequestList = {
  items: {
    id: string;
    requestType: string;
    status: string;
    createdAt: string;
    farm?: { id: string; name: string } | null;
    createdBy?: { id: string; fullName: string | null } | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
};
