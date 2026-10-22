export const ADMIN_ROLE = 'admin';
export const SUPER_ADMIN_ROLE = 'superAdmin';

export function staffRoleLabelKey(
  roles: readonly string[],
): 'roleSuperAdmin' | 'roleAdmin' | 'roleCaseAgent' | 'roleReviewer' | 'roleStaff' {
  if (roles.includes(SUPER_ADMIN_ROLE)) return 'roleSuperAdmin';
  if (roles.includes(ADMIN_ROLE)) return 'roleAdmin';
  if (roles.includes('caseAgent')) return 'roleCaseAgent';
  if (roles.includes('reviewer')) return 'roleReviewer';
  return 'roleStaff';
}
