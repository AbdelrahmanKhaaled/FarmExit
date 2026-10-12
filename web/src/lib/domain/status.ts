import type { StatusTone } from './enums';

/** CONFIRMED (4i): owner listing statuses (Farm Submission Status). */
export const listingStatuses = [
  'draft',
  'underFarmExitReview',
  'changesRequested',
  'approved',
  'published',
  'rejected',
] as const;
export type ListingStatus = (typeof listingStatuses)[number];

/** CONFIRMED (1A): states after publishing. */
export const publishedListingStates = ['paused', 'soldOrRented', 'archived'] as const;
export type PublishedListingState = (typeof publishedListingStates)[number];

/** CONFIRMED (4j / 4l): Management Request Status and Partnership Request Status. */
export const requestStatuses = [
  'draft',
  'submitted',
  'underFarmExitReview',
  'changesRequested',
  'approved',
  'published',
  'closed',
  'rejected',
] as const;
export type RequestStatus = (typeof requestStatuses)[number];

/** CONFIRMED (4k / 4l): Application Status Card. "shortlisted" is possible, not required. */
export const applicationStatuses = [
  'draft',
  'submitted',
  'underFarmExitReview',
  'changesRequested',
  'shortlisted',
  'sentToOwner',
  'accepted',
  'declined',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/** CONFIRMED (1A): Farm Details Request. */
export const detailsRequestStatuses = [
  'sent',
  'farmExitContactingOwner',
  'detailsShared',
  'siteVisitArranged',
  'closed',
] as const;
export type DetailsRequestStatus = (typeof detailsRequestStatuses)[number];

/** CONFIRMED (4k): professional verification, tracked separately per professional type. */
export const verificationStatuses = [
  'verificationRequired',
  'draft',
  'underFarmExitReview',
  'changesRequested',
  'verifiedByFarmExit',
  'notApproved',
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

/** CONFIRMED (4i): Document Upload Row states. */
export const documentStatuses = [
  'required',
  'uploading',
  'uploaded',
  'underReview',
  'changesRequested',
  'unsupported',
] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

/** CONFIRMED (4l): Owner Decision Panel. Whether a decision is final is a pending business decision. */
export const ownerDecisions = ['pending', 'accepted', 'declined'] as const;
export type OwnerDecision = (typeof ownerDecisions)[number];

/** CONFIRMED (4h): status → Badge / Status tone. */
export const statusTone = {
  draft: 'neutral',
  closed: 'neutral',
  submitted: 'review',
  underFarmExitReview: 'review',
  sentToOwner: 'review',
  farmExitContactingOwner: 'review',
  changesRequested: 'action',
  verificationRequired: 'action',
  approved: 'positive',
  published: 'positive',
  accepted: 'positive',
  detailsShared: 'positive',
  verifiedByFarmExit: 'positive',
  rejected: 'negative',
  declined: 'negative',
  notApproved: 'negative',
} as const satisfies Record<string, StatusTone>;
