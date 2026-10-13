/* eslint-disable @typescript-eslint/unbound-method -- jest mocks and decorated handlers are passed as references */
import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from './farm-access.service';
import type { StaffAuthorizationService } from './staff-authorization.service';
import { StaffPermission } from './staff-permissions';

type Rel = { relationshipRole: string; startsAt: Date | null; endsAt: Date | null };
const NOW = new Date('2026-06-01T00:00:00Z');
const past = new Date('2026-01-01T00:00:00Z');
const future = new Date('2026-12-01T00:00:00Z');

function service(rels: Rel[], staffHas = false) {
  const findMany = jest.fn().mockResolvedValue(rels);
  const prisma = { farmRelationship: { findMany } } as unknown as PrismaService;
  const staff = { hasPermission: jest.fn().mockResolvedValue(staffHas) } as unknown as StaffAuthorizationService;
  return { svc: new FarmAccessService(prisma, staff), findMany, staff };
}

describe('FarmAccessService', () => {
  it('queries only ACTIVE relationships of this user on this farm', async () => {
    const { svc, findMany } = service([]);
    await svc.activeRoles(7n, 3n, NOW);
    expect(findMany).toHaveBeenCalledWith({ where: { userId: 7n, farmId: 3n, relationshipStatus: 'active' } });
  });

  it('honours starts_at / ends_at and returns unique sorted roles', async () => {
    const { svc } = service([
      { relationshipRole: 'owner', startsAt: past, endsAt: null },
      { relationshipRole: 'owner', startsAt: null, endsAt: future },
      { relationshipRole: 'manager', startsAt: future, endsAt: null }, // not started
      { relationshipRole: 'tenant', startsAt: null, endsAt: past }, // ended
    ]);
    expect(await svc.activeRoles(1n, 1n, NOW)).toEqual(['owner']);
  });

  it('allows a listed contextual role and denies others', async () => {
    const { svc } = service([{ relationshipRole: 'tenant', startsAt: null, endsAt: null }]);
    expect(await svc.canAccess(1n, 1n, { farmRoles: ['tenant', 'owner'] })).toBe(true);
    expect(await svc.canAccess(1n, 1n, { farmRoles: ['owner'] })).toBe(false);
    expect(await svc.canAccess(1n, 1n, {})).toBe(false);
  });

  it('allows staff with the permission even without a farm relationship', async () => {
    const { svc, staff } = service([], true);
    expect(await svc.canAccess(1n, 1n, { farmRoles: ['owner'], staffPermission: StaffPermission.RequestsRead })).toBe(
      true,
    );
    expect(staff.hasPermission).toHaveBeenCalledWith(1n, StaffPermission.RequestsRead);
  });

  it('assertAccess throws the shared 403 when neither staff nor farm role applies', async () => {
    const { svc } = service([]);
    await expect(
      svc.assertAccess(1n, 1n, { farmRoles: ['owner'], staffPermission: StaffPermission.RequestsRead }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
