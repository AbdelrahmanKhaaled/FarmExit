import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { FarmRelationshipRole, FarmRelationshipStatus } from '../../generated/prisma/enums';
import type { Farm } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { FarmAccessService } from '../authorization/farm-access.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { StaffPermission } from '../authorization/staff-permissions';
import type { CreateFarmDto } from './dto/create-farm.dto';
import type { FarmListResponseDto, FarmResponseDto } from './dto/farm-response.dto';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from './dto/list-farms-query.dto';
import type { UpdateFarmDto } from './dto/update-farm.dto';

/**
 * Farm permission rules (roles are contextual, from `farm_relationships`; there are no global roles):
 *  - read:   any ACTIVE, in-window farm relationship (owner, partner, manager, agricultural engineer, tenant),
 *            or FarmExit staff with `requests.read`.
 *  - update: ACTIVE `owner` or `manager` of THAT farm. Staff cannot edit farms through this API.
 *  - A caller with no read access gets the same 404 as for a missing farm, so ids cannot be probed (IDOR).
 */
export const FARM_READ_ROLES: readonly FarmRelationshipRole[] = Object.values(FarmRelationshipRole);
export const FARM_EDIT_ROLES: readonly FarmRelationshipRole[] = [
  FarmRelationshipRole.owner,
  FarmRelationshipRole.manager,
];

const notFound = (): NotFoundException => new NotFoundException('Farm not found');

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  /**
   * Creates a NEW farm and the creator's `owner` relationship in one transaction. The owner is always the
   * authenticated user and the relationship is always created here, never attached to an existing farm. The
   * relationship records the user's declaration only: it is not verified ownership, a listing, or a FarmExit Score.
   */
  async create(userId: bigint, dto: CreateFarmDto): Promise<FarmResponseDto> {
    const now = new Date();
    const farm = await this.prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({
        data: { ...editableFields(dto), createdBy: userId } as Prisma.FarmUncheckedCreateInput,
      });
      await tx.farmRelationship.create({
        data: {
          farmId: created.id,
          userId,
          relationshipRole: FarmRelationshipRole.owner,
          relationshipStatus: FarmRelationshipStatus.active,
          startsAt: now,
        },
      });
      return created;
    });
    return toResponse(farm, [FarmRelationshipRole.owner]);
  }

  /** The caller's own farms (any active farm role), newest first. */
  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<FarmListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const rolesByFarm = await this.farmAccess.activeRolesByFarm(userId);
    const where: Prisma.FarmWhereInput = { id: { in: [...rolesByFarm.keys()] }, deletedAt: null };

    const [total, farms] = await Promise.all([
      this.prisma.farm.count({ where }),
      this.prisma.farm.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { items: farms.map((f) => toResponse(f, rolesByFarm.get(f.id) ?? [])), page, pageSize, total };
  }

  async get(userId: bigint, farmId: bigint): Promise<FarmResponseDto> {
    const { farm, roles } = await this.readable(userId, farmId);
    return toResponse(farm, roles);
  }

  async update(userId: bigint, farmId: bigint, dto: UpdateFarmDto): Promise<FarmResponseDto> {
    const { farm, roles } = await this.readable(userId, farmId);
    if (!roles.some((role) => FARM_EDIT_ROLES.includes(role))) throw forbidden();

    const data = editableFields(dto);
    if (Object.keys(data).length === 0) throw new BadRequestException('Nothing to update');
    const updated = await this.prisma.farm.update({ where: { id: farm.id }, data });
    return toResponse(updated, roles);
  }

  /** Loads a live farm the caller may at least read, or throws the generic 404. */
  private async readable(userId: bigint, farmId: bigint): Promise<{ farm: Farm; roles: FarmRelationshipRole[] }> {
    const [farm, roles, isStaff] = await Promise.all([
      this.prisma.farm.findFirst({ where: { id: farmId, deletedAt: null } }),
      this.farmAccess.activeRoles(userId, farmId),
      this.staffAuth.hasPermission(userId, StaffPermission.RequestsRead),
    ]);
    if (!farm || (roles.length === 0 && !isStaff)) throw notFound();
    return { farm, roles };
  }
}

/** Explicit allow-list copy of client-editable columns: nothing else can ever reach Prisma (mass assignment). */
function editableFields(dto: CreateFarmDto | UpdateFarmDto): Prisma.FarmUncheckedUpdateInput {
  const out: Record<string, unknown> = {};
  const keys = [
    'name',
    'description',
    'farmType',
    'mainActivity',
    'areaFeddan',
    'governorate',
    'areaName',
    'waterSource',
    'irrigationMethod',
    'energySource',
    'soilType',
  ] as const;
  for (const key of keys) if (dto[key] !== undefined) out[key] = dto[key];
  return out;
}

function toResponse(farm: Farm, myRoles: FarmRelationshipRole[]): FarmResponseDto {
  return {
    id: farm.id.toString(),
    name: farm.name,
    description: farm.description ?? null,
    farmType: farm.farmType,
    mainActivity: farm.mainActivity ?? null,
    areaFeddan: Number(farm.areaFeddan.toString()),
    governorate: farm.governorate,
    areaName: farm.areaName ?? null,
    waterSource: farm.waterSource ?? null,
    irrigationMethod: farm.irrigationMethod ?? null,
    energySource: farm.energySource ?? null,
    soilType: farm.soilType ?? null,
    farmStatus: farm.farmStatus,
    myRoles,
    createdAt: farm.createdAt?.toISOString() ?? null,
    updatedAt: farm.updatedAt?.toISOString() ?? null,
  };
}
