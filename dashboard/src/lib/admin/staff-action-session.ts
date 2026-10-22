import { getAdminSession, type AdminSession } from './session.server';
import { staffHasConsoleAccess, staffHasPermission, staffIsAdminScope, type StaffPermissionValue } from './staff-permissions';

export type StaffActionDenial = { ok: false; message: string };
export type StaffActionGrant = { session: AdminSession };
export type StaffActionResult = StaffActionDenial | StaffActionGrant;

export function isStaffActionDenied(result: StaffActionResult): result is StaffActionDenial {
  return 'ok' in result;
}

function denied(): StaffActionDenial {
  return { ok: false, message: 'Unauthorized' };
}

export async function requireStaffActionSession(): Promise<StaffActionResult> {
  const session = await getAdminSession();
  if (!session || !staffHasConsoleAccess(session.staff)) {
    return denied();
  }
  return { session };
}

export async function requireAdminActionSession(): Promise<StaffActionResult> {
  const base = await requireStaffActionSession();
  if ('ok' in base) return base;
  if (!staffIsAdminScope(base.session.staff.roles)) {
    return denied();
  }
  return base;
}

export async function requirePermissionActionSession(
  permission: StaffPermissionValue,
): Promise<StaffActionResult> {
  const base = await requireStaffActionSession();
  if ('ok' in base) return base;
  if (!staffHasPermission(base.session.staff, permission)) {
    return denied();
  }
  return base;
}

/** Purchase proposals and co-purchase staff APIs: admin or assigned case agent role. */
export async function requireCaseAgentOrAdminActionSession(): Promise<StaffActionResult> {
  const base = await requireStaffActionSession();
  if ('ok' in base) return base;
  const roles = base.session.staff.roles;
  if (staffIsAdminScope(roles) || roles.includes('caseAgent')) {
    return base;
  }
  return denied();
}
