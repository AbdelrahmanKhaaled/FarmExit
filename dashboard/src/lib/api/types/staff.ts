export type StaffListingAssignment = {
  assignmentType: 'reviewer' | 'caseAgent';
  assignedStaffId: string;
  assignedByUserId: string;
  assignedAt: string;
};

export type StaffListingReview = {
  decision: 'approved' | 'changesRequested' | 'rejected';
  reviewerId: string;
  comment: string | null;
  createdAt: string | null;
};

export type StaffListingRequest = {
  id: string;
  requestNumber: string;
  farmId: string;
  farmName: string;
  areaFeddan: number;
  listingType: string;
  status: string;
  visibility: string;
  askingPrice: number | null;
  annualRentPerFeddan: number | null;
  statedSalePricePerFeddan: number | null;
  currency: string;
  availability: string | null;
  listingDescription: string | null;
  highlights: string[];
  slug: string;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignments: StaffListingAssignment[];
  reviews: StaffListingReview[];
};

export type StaffListingList = {
  items: StaffListingRequest[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicationListing = {
  id: string;
  requestNumber: string;
  farmId: string;
  farmName: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: number;
  listingType: string;
  status: string;
  visibility: string;
  askingPrice: number | null;
  annualRentPerFeddan: number | null;
  statedSalePricePerFeddan: number | null;
  currency: string;
  availability: string | null;
  listingDescription: string | null;
  highlights: string[];
  slug: string;
  publishedAt: string | null;
};

export type PublicationQueue = {
  items: PublicationListing[];
  page: number;
  pageSize: number;
  total: number;
};

export type StaffRequestAssignment = {
  id: string;
  assignmentType: string;
  assignedStaffId: string;
  staffName: string | null;
  assignedAt: string;
};

export type StaffRequestStatusHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  changerName: string | null;
  reason: string | null;
  createdAt: string | null;
};

export type StaffRequestReview = {
  id: string;
  reviewerId: string;
  reviewerName: string | null;
  decision: string;
  comment: string | null;
  createdAt: string | null;
};

export type StaffRequestDocument = {
  id: string;
  slotKey: string;
  documentType: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSizeBytes: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string | null;
};

export type StaffRequestDetail = {
  id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  visibility: string;
  currentStep: number;
  submittedAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  farm: { id: string; name: string; governorate: string | null } | null;
  creator: { id: string; fullName: string | null };
  parentRequestId: string | null;
  assignments: StaffRequestAssignment[];
  statusHistory: StaffRequestStatusHistory[];
  reviews: StaffRequestReview[];
  forwardings: unknown[];
  documents: StaffRequestDocument[];
};

export type StaffRequestList = {
  items: StaffRequestDetail[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminFarmDetail = {
  id: string;
  name: string;
  governorate: string;
  areaName?: string | null;
  areaFeddan: string;
  farmStatus: string;
  farmType: string;
  mainActivity?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  relationships: { relationshipRole: string; userId: string; fullName?: string | null }[];
  facilityCount: number;
  recentRequests: { id: string; requestType: string; status: string; createdAt: string }[];
};

/** Request types that must use dedicated staff endpoints for review decisions. */
export const SPECIALIZED_REQUEST_TYPES = new Set([
  'farmListing',
  'farmManagement',
  'professionalVerification',
  'partnership',
  'partnershipApplication',
  'farmDetails',
]);
