import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Farm, Prisma } from '../../generated/prisma/client';
import { FarmRelationshipRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { StaffPermission } from '../authorization/staff-permissions';
import { PrivateLocationResponseDto, UpdatePrivateLocationDto } from './dto/private-location.dto';

@Injectable()
export class PrivateLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  private async requireAccess(userId: bigint, farmId: bigint, write = false): Promise<void> {
    const roles = await this.farmAccess.activeRoles(userId, farmId);
    const owner = roles.includes(FarmRelationshipRole.owner);
    // Staff may inspect only with the dedicated permission. Existing staff farm-edit rules remain unchanged.
    const staff = !write && !owner && (await this.staffAuth.hasPermission(userId, StaffPermission.PrivateLocationRead));
    if (!owner && !staff) throw new NotFoundException('Farm not found');
  }

  async get(userId: bigint, farmId: bigint): Promise<PrivateLocationResponseDto> {
    await this.requireAccess(userId, farmId);
    const farm = await this.prisma.farm.findFirst({ where: { id: farmId, deletedAt: null } });
    if (!farm) throw new NotFoundException('Farm not found');
    return view(farm);
  }

  async update(userId: bigint, farmId: bigint, dto: UpdatePrivateLocationDto): Promise<PrivateLocationResponseDto> {
    await this.requireAccess(userId, farmId, true);
    const lat = dto.privatePinLatitude;
    const lng = dto.privatePinLongitude;
    if ((lat === undefined) !== (lng === undefined) || (lat === null) !== (lng === null))
      throw new BadRequestException('Supply both coordinates, or clear both with null');
    if (lat === undefined && dto.nearestMainRoad === undefined && dto.roadDistanceKm === undefined)
      throw new BadRequestException('Nothing to update');

    return this.prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findFirst({ where: { id: farmId, deletedAt: null } });
      if (!farm) throw new NotFoundException('Farm not found');
      const data: Prisma.FarmUncheckedUpdateManyInput = {};
      if (lat !== undefined) {
        data.privatePinLatitude = lat;
        data.privatePinLongitude = lng;
      }
      if (dto.nearestMainRoad !== undefined || dto.roadDistanceKm !== undefined) {
        // Never silently replace a legacy scalar/array JSON value.
        if (farm.accessDetails !== null && !isObject(farm.accessDetails))
          throw new ConflictException('Existing access details require review before updating road fields');
        const access = { ...asObject(farm.accessDetails) };
        for (const key of ['nearestMainRoad', 'roadDistanceKm'] as const) {
          if (dto[key] === null) delete access[key];
          else if (dto[key] !== undefined) access[key] = dto[key];
        }
        data.accessDetails = access as Prisma.InputJsonObject;
      }
      data.updatedAt = new Date(Math.max(Date.now(), (farm.updatedAt?.getTime() ?? 0) + 1));
      const written = await tx.farm.updateMany({
        where: { id: farmId, deletedAt: null, updatedAt: farm.updatedAt },
        data,
      });
      if (written.count !== 1) throw new ConflictException('Farm changed. Reload and try again');
      const updated = await tx.farm.findUniqueOrThrow({ where: { id: farmId } });
      return view(updated);
    });
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function asObject(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}
function view(farm: Farm): PrivateLocationResponseDto {
  const access = asObject(farm.accessDetails);
  return {
    farmId: farm.id.toString(),
    privatePinLatitude: farm.privatePinLatitude === null ? null : Number(farm.privatePinLatitude),
    privatePinLongitude: farm.privatePinLongitude === null ? null : Number(farm.privatePinLongitude),
    nearestMainRoad: typeof access.nearestMainRoad === 'string' ? access.nearestMainRoad : null,
    roadDistanceKm:
      typeof access.roadDistanceKm === 'number' && Number.isFinite(access.roadDistanceKm) && access.roadDistanceKm >= 0
        ? access.roadDistanceKm
        : null,
  };
}
