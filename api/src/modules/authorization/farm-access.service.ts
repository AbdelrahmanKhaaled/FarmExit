import { Injectable } from '@nestjs/common';
import { FarmRelationshipStatus, type FarmRelationshipRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from './authorization.errors';
import { StaffAuthorizationService } from './staff-authorization.service';
import type { StaffPermission } from './staff-permissions';

/** What may reach a farm-scoped resource: any listed contextual farm role, or the staff permission (if given). */
export type FarmAccessRule = {
  farmRoles?: readonly FarmRelationshipRole[];
  staffPermission?: StaffPermission;
};

/**
 * Resource-level authorization foundation. Farm roles (owner, partner, manager, agricultural engineer, tenant) exist
 * only per farm, through `farm_relationships`; there is no global role. Feature services call `assertAccess` with the
 * authenticated user id and the farm the request targets, and decide per resource. Both lookups hit the database.
 */
@Injectable()
export class FarmAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  /** The user's currently effective roles on this farm: active status, within starts_at/ends_at when set. */
  async activeRoles(userId: bigint, farmId: bigint, now = new Date()): Promise<FarmRelationshipRole[]> {
    const relationships = await this.prisma.farmRelationship.findMany({
      where: { userId, farmId, relationshipStatus: FarmRelationshipStatus.active },
    });
    const effective = relationships.filter((r) => isEffective(r, now));
    return [...new Set(effective.map((r) => r.relationshipRole))].sort();
  }

  /** All farms where the user currently holds an effective role: farmId -> sorted unique roles. */
  async activeRolesByFarm(userId: bigint, now = new Date()): Promise<Map<bigint, FarmRelationshipRole[]>> {
    const relationships = await this.prisma.farmRelationship.findMany({
      where: { userId, relationshipStatus: FarmRelationshipStatus.active },
    });
    const byFarm = new Map<bigint, Set<FarmRelationshipRole>>();
    for (const r of relationships.filter((rel) => isEffective(rel, now))) {
      byFarm.set(r.farmId, (byFarm.get(r.farmId) ?? new Set()).add(r.relationshipRole));
    }
    return new Map([...byFarm].map(([farmId, roles]) => [farmId, [...roles].sort()]));
  }

  async hasAnyRole(userId: bigint, farmId: bigint, roles: readonly FarmRelationshipRole[]): Promise<boolean> {
    if (roles.length === 0) return false;
    const held = await this.activeRoles(userId, farmId);
    return roles.some((role) => held.includes(role));
  }

  async canAccess(userId: bigint, farmId: bigint, rule: FarmAccessRule): Promise<boolean> {
    if (rule.staffPermission && (await this.staffAuth.hasPermission(userId, rule.staffPermission))) return true;
    return this.hasAnyRole(userId, farmId, rule.farmRoles ?? []);
  }

  /** Throws the shared 403 unless `canAccess`. It does not reveal whether the farm exists. */
  async assertAccess(userId: bigint, farmId: bigint, rule: FarmAccessRule): Promise<void> {
    if (!(await this.canAccess(userId, farmId, rule))) throw forbidden();
  }
}

function isEffective(r: { startsAt: Date | null; endsAt: Date | null }, now: Date): boolean {
  return (
    (r.startsAt === null || r.startsAt.getTime() <= now.getTime()) &&
    (r.endsAt === null || r.endsAt.getTime() > now.getTime())
  );
}
