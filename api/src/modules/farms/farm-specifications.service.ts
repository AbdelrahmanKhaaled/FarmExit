import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Farm } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type FarmSpecificationResponseDto,
  PRODUCTION_DETAIL_KEYS,
  type ProductionDetailsPatchDto,
  type UpdateFarmSpecificationDto,
} from './dto/farm-specification.dto';
import { FarmMemberAccessService } from './farm-member-access.service';

type ProductionKey = (typeof PRODUCTION_DETAIL_KEYS)[number];

/**
 * Structured farm specifications, separate from basic farm CRUD. Access (see FarmMemberAccessService): any active
 * farm role reads, active owner/manager edits, staff get nothing here. Only allow-listed fields can change, and
 * `production_details` is merged key by key so unspecified properties are never overwritten.
 */
@Injectable()
export class FarmSpecificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: FarmMemberAccessService,
  ) {}

  async get(userId: bigint, farmId: bigint): Promise<FarmSpecificationResponseDto> {
    const { farm, canEdit } = await this.access.require(userId, farmId, 'read');
    return this.view(farm, canEdit);
  }

  async update(userId: bigint, farmId: bigint, dto: UpdateFarmSpecificationDto): Promise<FarmSpecificationResponseDto> {
    const { canEdit } = await this.access.require(userId, farmId, 'edit');

    const columns: Prisma.FarmUncheckedUpdateManyInput = {};
    for (const key of ['waterSource', 'irrigationMethod', 'energySource', 'soilType'] as const) {
      if (dto[key] !== undefined) columns[key] = dto[key];
    }
    const production = definedProductionKeys(dto.productionDetails);
    if (Object.keys(columns).length === 0 && dto.cropTypes === undefined && Object.keys(production).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.farm.findFirst({ where: { id: farmId, deletedAt: null } });
      if (!current) throw new NotFoundException('Farm not found');

      const data: Prisma.FarmUncheckedUpdateManyInput = { ...columns };
      if (Object.keys(production).length > 0)
        data.productionDetails = mergeProduction(current.productionDetails, production);
      // Compare-and-swap on updated_at: a concurrent writer makes this fail (409) instead of silently overwriting.
      data.updatedAt = new Date(Math.max(Date.now(), (current.updatedAt?.getTime() ?? 0) + 1));
      const written = await tx.farm.updateMany({
        where: { id: farmId, deletedAt: null, updatedAt: current.updatedAt },
        data,
      });
      if (written.count !== 1)
        throw new ConflictException('The farm was changed by someone else. Reload and try again');

      if (dto.cropTypes !== undefined) {
        const wanted = new Set<string>(dto.cropTypes);
        const existing = await tx.farmCropType.findMany({ where: { farmId } });
        const have = new Set(existing.map((c) => c.cropType));
        const removed = [...have].filter((c) => !wanted.has(c));
        if (removed.length > 0) await tx.farmCropType.deleteMany({ where: { farmId, cropType: { in: removed } } });
        for (const cropType of wanted)
          if (!have.has(cropType)) await tx.farmCropType.create({ data: { farmId, cropType } });
      }
    });

    const { farm } = await this.access.require(userId, farmId, 'read');
    return this.view(farm, canEdit);
  }

  private async view(farm: Farm, canEdit: boolean): Promise<FarmSpecificationResponseDto> {
    const crops = await this.prisma.farmCropType.findMany({ where: { farmId: farm.id } });
    const stored = asObject(farm.productionDetails);
    const text = (key: ProductionKey): string | null => (typeof stored[key] === 'string' ? stored[key] : null);
    return {
      farmId: farm.id.toString(),
      waterSource: farm.waterSource ?? null,
      irrigationMethod: farm.irrigationMethod ?? null,
      energySource: farm.energySource ?? null,
      soilType: farm.soilType ?? null,
      cropTypes: crops.map((c) => c.cropType).sort(),
      // Only allow-listed keys are ever returned, even if other keys exist in the stored JSON.
      productionDetails: {
        currentProduction: text('currentProduction'),
        harvestSeasons: text('harvestSeasons'),
        notes: text('notes'),
      },
      canEdit,
      updatedAt: farm.updatedAt?.toISOString() ?? null,
    };
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function definedProductionKeys(
  patch: ProductionDetailsPatchDto | undefined,
): Partial<Record<ProductionKey, string | null>> {
  const out: Partial<Record<ProductionKey, string | null>> = {};
  if (!patch) return out;
  for (const key of PRODUCTION_DETAIL_KEYS) if (patch[key] !== undefined) out[key] = patch[key];
  return out;
}

/** Key-level merge: listed keys are set (string) or removed (null); every other stored key is preserved. */
export function mergeProduction(
  stored: unknown,
  patch: Partial<Record<ProductionKey, string | null>>,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const merged = { ...asObject(stored) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else if (value !== undefined) merged[key] = value;
  }
  return Object.keys(merged).length === 0 ? Prisma.DbNull : (merged as Prisma.InputJsonObject);
}
