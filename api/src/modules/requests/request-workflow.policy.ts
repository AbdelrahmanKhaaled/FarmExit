import { FarmRelationshipRole, RequestType, StaffRole } from '../../generated/prisma/enums';
import { staffHasAdminScope } from '../authorization/staff-permissions';
import type { StaffContext } from '../authorization/staff.types';

/** Status vocabulary shared with the frontend (web/src/lib/domain/status.ts). */
export const REQUEST_STATUS_DRAFT = 'draft';
export const REQUEST_STATUS_SUBMITTED = 'submitted';
export const REQUEST_STATUS_UNDER_REVIEW = 'underFarmExitReview';
export const REQUEST_STATUS_CHANGES_REQUESTED = 'changesRequested';
export const REQUEST_STATUS_APPROVED = 'approved';
export const REQUEST_STATUS_REJECTED = 'rejected';
export const REQUEST_STATUS_WITHDRAWN = 'withdrawn';
export const REQUEST_STATUS_CLOSED = 'closed';
export const REQUEST_STATUS_PUBLISHED = 'published';
export const REQUEST_STATUS_SENT_TO_OWNER = 'sentToOwner';

export const OWNER_EDITABLE_STATUSES = new Set([REQUEST_STATUS_DRAFT, REQUEST_STATUS_CHANGES_REQUESTED]);

export const ACTIVE_VERIFICATION_REQUEST_STATUSES = new Set([
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_SUBMITTED,
  REQUEST_STATUS_UNDER_REVIEW,
  REQUEST_STATUS_CHANGES_REQUESTED,
]);

/**
 * Types with dedicated submit/review services. Generic unified endpoints must not bypass their validation.
 */
export const SPECIALIZED_WORKFLOW_TYPES = new Set<RequestType>([
  RequestType.farmListing,
  RequestType.farmManagement,
  RequestType.professionalVerification,
  RequestType.partnership,
  RequestType.partnershipApplication,
  RequestType.farmDetails,
]);

export const ACTIVE_FARM_DETAILS_REQUEST_STATUSES = new Set([
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_SUBMITTED,
  REQUEST_STATUS_UNDER_REVIEW,
  REQUEST_STATUS_CHANGES_REQUESTED,
  REQUEST_STATUS_APPROVED,
  REQUEST_STATUS_SENT_TO_OWNER,
]);

export const ACTIVE_PARTNERSHIP_REQUEST_STATUSES = new Set([
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_SUBMITTED,
  REQUEST_STATUS_UNDER_REVIEW,
  REQUEST_STATUS_CHANGES_REQUESTED,
  REQUEST_STATUS_APPROVED,
]);

export const ACTIVE_PARTNERSHIP_APPLICATION_STATUSES = new Set([
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_SUBMITTED,
  REQUEST_STATUS_UNDER_REVIEW,
  REQUEST_STATUS_CHANGES_REQUESTED,
]);

/** Parent partnership requests that accept new applications (nonbinding interest). */
export const PARTNERSHIP_PARENT_OPEN_FOR_APPLICATIONS = new Set([
  REQUEST_STATUS_APPROVED,
  REQUEST_STATUS_PUBLISHED,
]);

export function specializedWorkflowMessage(type: RequestType): string {
  return `Use the dedicated ${type} API for this request; the generic request workflow does not apply`;
}

/** Reviewer inbox: listing, management and professional verification. Case agents: applications and relay types. */
export function staffInboxRequestTypes(staff: StaffContext): RequestType[] | null {
  if (staffHasAdminScope(staff.roles)) return null;
  const types = new Set<RequestType>();
  if (staff.roles.includes(StaffRole.reviewer)) {
    types.add(RequestType.farmListing);
    types.add(RequestType.farmManagement);
    types.add(RequestType.professionalVerification);
    types.add(RequestType.partnership);
  }
  if (staff.roles.includes(StaffRole.caseAgent)) {
    types.add(RequestType.professionalApplication);
    types.add(RequestType.partnershipApplication);
    types.add(RequestType.farmDetails);
    types.add(RequestType.farmPurchaseProposal);
  }
  if (types.size === 0) return [];
  return [...types];
}

export function forwardingRequiresFarmOwner(): boolean {
  return true;
}

export const FORWARDING_RECIPIENT_ROLES: FarmRelationshipRole[] = [FarmRelationshipRole.owner];
