import { FarmRelationshipRole, RequestType, StaffRole } from '../../generated/prisma/enums';
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
]);

export function specializedWorkflowMessage(type: RequestType): string {
  return `Use the dedicated ${type} API for this request; the generic request workflow does not apply`;
}

/** Reviewer inbox: listing, management and professional verification. Case agents: applications and relay types. */
export function staffInboxRequestTypes(staff: StaffContext): RequestType[] | null {
  if (staff.roles.includes(StaffRole.admin)) return null;
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
