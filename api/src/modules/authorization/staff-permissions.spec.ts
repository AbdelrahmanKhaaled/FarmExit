import { StaffRole } from '../../generated/prisma/enums';
import {
  permissionsForRoles,
  staffHasDashboardAccess,
  staffSatisfiesDeclaredRole,
  STAFF_ROLE_PERMISSIONS,
  StaffPermission,
} from './staff-permissions';

describe('staff permission matrix', () => {
  it('covers exactly the approved staff roles (superAdmin, admin, caseAgent, reviewer)', () => {
    expect(Object.keys(STAFF_ROLE_PERMISSIONS).sort()).toEqual(Object.values(StaffRole).sort());
    expect(Object.values(StaffRole).sort()).toEqual(['admin', 'caseAgent', 'reviewer', 'superAdmin']);
  });

  it('treats superAdmin as satisfying admin-only @StaffRoles', () => {
    expect(staffSatisfiesDeclaredRole(['superAdmin'], StaffRole.admin)).toBe(true);
    expect(staffSatisfiesDeclaredRole(['admin'], StaffRole.admin)).toBe(true);
    expect(staffSatisfiesDeclaredRole(['superAdmin'], StaffRole.reviewer)).toBe(false);
    expect(staffSatisfiesDeclaredRole(['reviewer'], StaffRole.admin)).toBe(false);
  });

  it('gives admin and superAdmin every permission', () => {
    expect(permissionsForRoles(['admin'])).toEqual(Object.values(StaffPermission).sort());
    expect(permissionsForRoles(['superAdmin'])).toEqual(Object.values(StaffPermission).sort());
  });

  it('keeps case agents and reviewers on their own duties', () => {
    expect(permissionsForRoles(['caseAgent'])).toEqual(['communication.relay', 'requests.forward', 'requests.read']);
    expect(permissionsForRoles(['reviewer'])).toEqual(['evaluations.manage', 'requests.read', 'requests.review']);
    for (const role of ['caseAgent', 'reviewer']) {
      expect(permissionsForRoles([role])).not.toContain(StaffPermission.StaffManage);
    }
  });

  it('merges multiple roles without duplicates and ignores unknown roles', () => {
    expect(permissionsForRoles(['caseAgent', 'reviewer'])).toEqual([
      'communication.relay',
      'evaluations.manage',
      'requests.forward',
      'requests.read',
      'requests.review',
    ]);
    expect(permissionsForRoles(['owner', 'buyer', 'superuser', ''])).toEqual([]);
    expect(permissionsForRoles([])).toEqual([]);
  });

  it('allows dashboard sign-in for approved staff roles only', () => {
    expect(staffHasDashboardAccess(['admin'])).toBe(true);
    expect(staffHasDashboardAccess(['superAdmin'])).toBe(true);
    expect(staffHasDashboardAccess(['caseAgent'])).toBe(true);
    expect(staffHasDashboardAccess(['reviewer'])).toBe(true);
    expect(staffHasDashboardAccess(['caseAgent', 'reviewer'])).toBe(true);
    expect(staffHasDashboardAccess(['owner', 'buyer'])).toBe(false);
    expect(staffHasDashboardAccess([])).toBe(false);
    expect(staffHasDashboardAccess(['admin', 'owner'])).toBe(true);
  });

  it('has no customer-style roles or permissions', () => {
    const names = [...Object.keys(STAFF_ROLE_PERMISSIONS), ...Object.values(StaffPermission)].join(' ');
    expect(names).not.toMatch(/owner|buyer|tenant|renter|payment|commission|checkout/i);
  });
});
