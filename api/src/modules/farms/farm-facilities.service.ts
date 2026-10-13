import { Injectable, NotFoundException } from '@nestjs/common';
import type { AgriculturalFacility, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type CreateFacilityDto,
  type FacilityListResponseDto,
  type FacilityResponseDto,
  type UpdateFacilityDto,
} from './dto/farm-facility.dto';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from './dto/list-farms-query.dto';
import { FarmMemberAccessService } from './farm-member-access.service';
import { BadRequestException } from '@nestjs/common';

const FACILITY_STATUS_DRAFT = 'draft';
const notFound = (): NotFoundException => new NotFoundException('Facility not found');

/**
 * Facilities linked to a farm (`agricultural_facilities.farm_id`). Same access as specifications: any active farm
 * role reads, active owner/manager creates and edits, staff get nothing. Every query is scoped by the farm id from
 * the route, so a facility id from another farm is a 404 (IDOR). The farm comes from the route, the owner is the
 * authenticated user and the status is always `draft`: none of them is client-controlled. There is no delete.
 */
@Injectable()
export class FarmFacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: FarmMemberAccessService,
  ) {}

  async list(userId: bigint, farmId: bigint, query: ListFarmsQueryDto): Promise<FacilityListResponseDto> {
    await this.access.require(userId, farmId, 'read');
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.AgriculturalFacilityWhereInput = { farmId, deletedAt: null };
    const [total, rows] = await Promise.all([
      this.prisma.agriculturalFacility.count({ where }),
      this.prisma.agriculturalFacility.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map(toResponse), page, pageSize, total };
  }

  async get(userId: bigint, farmId: bigint, facilityId: bigint): Promise<FacilityResponseDto> {
    await this.access.require(userId, farmId, 'read');
    return toResponse(await this.find(farmId, facilityId));
  }

  async create(userId: bigint, farmId: bigint, dto: CreateFacilityDto): Promise<FacilityResponseDto> {
    await this.access.require(userId, farmId, 'edit');
    const created = await this.prisma.agriculturalFacility.create({
      data: {
        farmId,
        ownerUserId: userId,
        status: FACILITY_STATUS_DRAFT,
        ...editable(dto),
      } as Prisma.AgriculturalFacilityUncheckedCreateInput,
    });
    return toResponse(created);
  }

  async update(
    userId: bigint,
    farmId: bigint,
    facilityId: bigint,
    dto: UpdateFacilityDto,
  ): Promise<FacilityResponseDto> {
    await this.access.require(userId, farmId, 'edit');
    const data = editable(dto);
    if (Object.keys(data).length === 0) throw new BadRequestException('Nothing to update');
    // The farm id is part of the WHERE clause: a facility of another farm can never be written through this route.
    const result = await this.prisma.agriculturalFacility.updateMany({
      where: { id: facilityId, farmId, deletedAt: null },
      data,
    });
    if (result.count !== 1) throw notFound();
    return toResponse(await this.find(farmId, facilityId));
  }

  private async find(farmId: bigint, facilityId: bigint): Promise<AgriculturalFacility> {
    const facility = await this.prisma.agriculturalFacility.findFirst({
      where: { id: facilityId, farmId, deletedAt: null },
    });
    if (!facility) throw notFound();
    return facility;
  }
}

/** Explicit allow-list: nothing else (owner, farm, status, coordinates, JSON) can reach Prisma. */
function editable(dto: CreateFacilityDto | UpdateFacilityDto): Prisma.AgriculturalFacilityUncheckedUpdateManyInput {
  const out: Record<string, unknown> = {};
  for (const key of ['facilityType', 'name', 'description', 'governorate', 'areaName'] as const) {
    if (dto[key] !== undefined) out[key] = dto[key];
  }
  return out;
}

function toResponse(f: AgriculturalFacility): FacilityResponseDto {
  return {
    id: f.id.toString(),
    farmId: (f.farmId ?? 0n).toString(),
    facilityType: f.facilityType,
    name: f.name,
    description: f.description ?? null,
    governorate: f.governorate ?? null,
    areaName: f.areaName ?? null,
    status: f.status,
    createdAt: f.createdAt?.toISOString() ?? null,
    updatedAt: f.updatedAt?.toISOString() ?? null,
  };
}
