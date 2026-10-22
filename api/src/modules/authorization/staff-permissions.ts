import { StaffRole } from '../../generated/prisma/enums';

/**
 * FarmExit staff permissions. PROVISIONAL minimal matrix: it only names the staff actions the approved ERD already
 * describes (request review, forwarding, FarmExit-relayed communication, staff evaluations) plus staff management.
 * Business owners must confirm it before real endpoints rely on it. Never derive permissions from the client.
 */
export const StaffPermission = {
  /** Exact farm pins: explicit permission, granted only by existing admin full-authority scope. */
  PrivateLocationRead: 'farms.private-location.read',
  /** See requests in the FarmExit review queue. */
  RequestsRead: 'requests.read',
  /** Decide request reviews (request_reviews). */
  RequestsReview: 'requests.review',
  /** Forward reviewed requests to the owner (request_forwardings). */
  RequestsForward: 'requests.forward',
  /** Relay messages between a user and the other party through FarmExit (communication cases). */
  CommunicationRelay: 'communication.relay',
  /** Create and approve FarmExit evaluations (staff-only, never customer ratings). */
  EvaluationsManage: 'evaluations.manage',
  /** Administer staff memberships (no endpoint exists yet; there is no self-service promotion). */
  StaffManage: 'staff.manage',
} as const;

export type StaffPermission = (typeof StaffPermission)[keyof typeof StaffPermission];

const ALL_PERMISSIONS: readonly StaffPermission[] = Object.values(StaffPermission);

/** Admin dashboard and full operational authority (admin or super_admin membership). */
export function staffHasAdminScope(roles: readonly string[]): boolean {
  return roles.includes(StaffRole.admin) || roles.includes(StaffRole.superAdmin);
}

/** Whether active staff roles satisfy a route-declared `@StaffRoles` requirement. */
export function staffSatisfiesDeclaredRole(staffRoles: readonly string[], required: StaffRole): boolean {
  if (staffRoles.includes(required)) return true;
  if (required === StaffRole.admin && staffHasAdminScope(staffRoles)) return true;
  return false;
}

/** Roles allowed to sign in to the shared FarmExit dashboard (email + password, dashboard audience). */
export function staffHasDashboardAccess(roles: readonly string[]): boolean {
  return roles.some((role) => role in STAFF_ROLE_PERMISSIONS);
}

export function staffIsSuperAdmin(roles: readonly string[]): boolean {
  return roles.includes(StaffRole.superAdmin);
}

/** Approved staff roles only (staff_memberships.staff_role). */
export const STAFF_ROLE_PERMISSIONS: Readonly<Record<StaffRole, readonly StaffPermission[]>> = {
  [StaffRole.superAdmin]: ALL_PERMISSIONS,
  [StaffRole.admin]: ALL_PERMISSIONS,
  [StaffRole.caseAgent]: [
    StaffPermission.RequestsRead,
    StaffPermission.RequestsForward,
    StaffPermission.CommunicationRelay,
  ],
  [StaffRole.reviewer]: [
    StaffPermission.RequestsRead,
    StaffPermission.RequestsReview,
    StaffPermission.EvaluationsManage,
  ],
};

/** Union of the permissions of the given roles (sorted, no duplicates). Unknown roles grant nothing. */
export function permissionsForRoles(roles: readonly string[]): StaffPermission[] {
  const granted = new Set<StaffPermission>();
  for (const role of roles) {
    const permissions = (STAFF_ROLE_PERMISSIONS as Record<string, readonly StaffPermission[] | undefined>)[role];
    permissions?.forEach((p) => granted.add(p));
  }
  return [...granted].sort();
}
