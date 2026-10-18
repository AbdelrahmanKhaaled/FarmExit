import { StaffRole } from '../../generated/prisma/enums';
import { permissionsForRoles, STAFF_ROLE_PERMISSIONS, StaffPermission } from './staff-permissions';

describe('staff permission matrix', () => {
  it('covers exactly the approved staff roles (superAdmin, admin, caseAgent, reviewer)', () => {
    expect(Object.keys(STAFF_ROLE_PERMISSIONS).sort()).toEqual(Object.values(StaffRole).sort());
    expect(Object.values(StaffRole).sort()).toEqual(['admin', 'caseAgent', 'reviewer', 'superAdmin']);
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

  it('has no customer-style roles or permissions', () => {
    const names = [...Object.keys(STAFF_ROLE_PERMISSIONS), ...Object.values(StaffPermission)].join(' ');
    expect(names).not.toMatch(/owner|buyer|tenant|renter|payment|commission|checkout/i);
  });
});
