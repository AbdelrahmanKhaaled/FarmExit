import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canAccessConsoleRoute,
  filterAdminNavigation,
  getStaffHomePath,
  resolveConsoleRouteKey,
} from './console-routes';
import { StaffPermission } from './staff-permissions';

const admin = {
  id: '1',
  fullName: 'Admin',
  roles: ['admin'],
  permissions: Object.values(StaffPermission),
};

const caseAgent = {
  id: '2',
  fullName: 'Agent',
  roles: ['caseAgent'],
  permissions: ['communication.relay', 'requests.forward', 'requests.read'],
};

const reviewer = {
  id: '3',
  fullName: 'Reviewer',
  roles: ['reviewer'],
  permissions: ['evaluations.manage', 'requests.read', 'requests.review'],
};

describe('console route access', () => {
  it('allows the publication queue only for admin scope and hides restricted navigation', () => {
    const superAdmin = { ...admin, roles: ['superAdmin'] };
    assert.equal(canAccessConsoleRoute(superAdmin, 'listingPipeline'), true);
    for (const staff of [caseAgent, reviewer]) {
      assert.equal(canAccessConsoleRoute(staff, 'listingPipeline'), false);
      assert.equal(
        filterAdminNavigation(staff)
          .flatMap((g) => g.items)
          .some((i) => i.key === 'listingPipeline'),
        false,
      );
    }
  });
  it('resolves locale-prefixed paths', () => {
    assert.equal(resolveConsoleRouteKey('/en/admin/communications/5'), 'communicationDetail');
    assert.equal(resolveConsoleRouteKey('/ar/admin/requests'), 'requests');
  });

  it('allows case agents communications but not analytics', () => {
    assert.equal(canAccessConsoleRoute(caseAgent, 'communications'), true);
    assert.equal(canAccessConsoleRoute(caseAgent, 'analytics'), false);
    assert.equal(canAccessConsoleRoute(caseAgent, 'users'), false);
  });

  it('allows reviewers requests and evaluations but not communications', () => {
    assert.equal(canAccessConsoleRoute(reviewer, 'requests'), true);
    assert.equal(canAccessConsoleRoute(reviewer, 'evaluations'), true);
    assert.equal(canAccessConsoleRoute(reviewer, 'communications'), false);
    assert.equal(canAccessConsoleRoute(reviewer, 'proposals'), false);
  });

  it('keeps full admin navigation', () => {
    const groups = filterAdminNavigation(admin);
    const keys = groups.flatMap((g) => g.items.map((i) => i.key));
    assert.ok(keys.includes('analytics'));
    assert.ok(keys.includes('auditLogs'));
  });

  it('filters navigation for case agents', () => {
    const keys = filterAdminNavigation(caseAgent).flatMap((g) => g.items.map((i) => i.key));
    assert.ok(keys.includes('communications'));
    assert.ok(keys.includes('requestsHub'));
    assert.equal(keys.includes('analytics'), false);
    assert.equal(keys.includes('users'), false);
  });

  it('picks staff home paths', () => {
    assert.equal(getStaffHomePath(admin), '/admin');
    assert.equal(getStaffHomePath(caseAgent), '/admin/communications');
    assert.equal(getStaffHomePath(reviewer), '/admin/requests');
  });
});
