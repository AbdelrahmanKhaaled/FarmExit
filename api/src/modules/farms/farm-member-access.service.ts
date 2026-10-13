import { Injectable, NotFoundException } from '@nestjs/common';
import type { Farm } from '../../generated/prisma/client';
import { FarmRelationshipRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { FarmAccessService } from '../authorization/farm-access.service';
import { FARM_EDIT_ROLES, FARM_READ_ROLES } from './farms.service';

export type FarmAccessLevel = 'read' | 'edit';

/**
 * Farm-detail access (specifications, facilities): ONLY contextual farm roles count. Unlike the basic farm read,
 * FarmExit staff do not get access merely because they hold `requests.read`: sensitive farm details need a
 * case-assignment rule that is not defined yet (see the Phase 04B report). Staff are therefore treated like any
 * other caller without a role: the same generic 404.
 *
 *  - read: any active, in-window farm relationship.  - edit: active `owner` or `manager` of that farm.
 *  - no role (or missing/deleted farm) -> 404 (ids cannot be probed); read-only role asking to edit -> 403.
 */
@Injectable()
export class FarmMemberAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async require(
    userId: bigint,
    farmId: bigint,
    level: FarmAccessLevel,
  ): Promise<{ farm: Farm; roles: FarmRelationshipRole[]; canEdit: boolean }> {
    const [farm, roles] = await Promise.all([
      this.prisma.farm.findFirst({ where: { id: farmId, deletedAt: null } }),
      this.farmAccess.activeRoles(userId, farmId),
    ]);
    const canRead = roles.some((r) => FARM_READ_ROLES.includes(r));
    if (!farm || !canRead) throw new NotFoundException('Farm not found');
    const canEdit = roles.some((r) => FARM_EDIT_ROLES.includes(r));
    if (level === 'edit' && !canEdit) throw forbidden();
    return { farm, roles, canEdit };
  }
}
