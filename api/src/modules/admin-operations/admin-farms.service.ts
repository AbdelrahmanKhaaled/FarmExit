import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminFarmDetailDto, AdminFarmListResponseDto, AdminListFarmsQueryDto } from './dto/admin-farms.dto';
import { farmPublicationWhere, publishedFarmListingWhere } from './farm-publication-filter';

@Injectable()
export class AdminFarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async filterOptions() {
    const [governorates, statuses] = await Promise.all([
      this.prisma.farm.findMany({
        where: { deletedAt: null },
        distinct: ['governorate'],
        select: { governorate: true },
        orderBy: { governorate: 'asc' },
      }),
      this.prisma.farm.findMany({
        where: { deletedAt: null },
        distinct: ['farmStatus'],
        select: { farmStatus: true },
        orderBy: { farmStatus: 'asc' },
      }),
    ]);
    return { governorates: governorates.map((f) => f.governorate), statuses: statuses.map((f) => f.farmStatus) };
  }
  async list(query: AdminListFarmsQueryDto): Promise<AdminFarmListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FarmWhereInput = { deletedAt: null, ...farmPublicationWhere(query.listingPublication) };
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [{ name: { contains: q } }, { governorate: { contains: q } }, { areaName: { contains: q } }];
    }
    if (query.farmStatus?.trim()) where.farmStatus = query.farmStatus.trim();
    if (query.governorate?.trim()) where.governorate = query.governorate.trim();

    const [total, rows] = await Promise.all([
      this.prisma.farm.count({ where }),
      this.prisma.farm.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          governorate: true,
          areaName: true,
          areaFeddan: true,
          farmStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const published = rows.length
      ? await this.prisma.request.findMany({
          where: {
            farmId: { in: rows.map((f) => f.id) },
            ...publishedFarmListingWhere(),
          },
          select: { id: true, farmId: true, listingDetail: { select: { listingType: true } } },
        })
      : [];
    return {
      total,
      page,
      pageSize,
      items: rows.map((f) => ({
        id: f.id.toString(),
        name: f.name,
        governorate: f.governorate,
        areaName: f.areaName,
        areaFeddan: f.areaFeddan.toString(),
        farmStatus: f.farmStatus,
        createdAt: f.createdAt?.toISOString() ?? '',
        publishedListings: published
          .filter((r) => r.farmId === f.id && r.listingDetail)
          .map((r) => ({ id: r.id.toString(), listingType: String(r.listingDetail!.listingType) })),
      })),
    };
  }

  async getById(id: bigint): Promise<AdminFarmDetailDto> {
    const farm = await this.prisma.farm.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        governorate: true,
        areaName: true,
        areaFeddan: true,
        farmStatus: true,
        farmType: true,
        mainActivity: true,
        createdAt: true,
        updatedAt: true,
        relationships: {
          select: {
            relationshipRole: true,
            userId: true,
            user: { select: { fullName: true } },
          },
        },
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: { id: true, requestType: true, status: true, createdAt: true },
        },
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    const [facilityCount, published] = await Promise.all([
      this.prisma.agriculturalFacility.count({ where: { farmId: id, deletedAt: null } }),
      this.prisma.request.findMany({
        where: {
          farmId: id,
          ...publishedFarmListingWhere(),
        },
        select: { id: true, listingDetail: { select: { listingType: true } } },
      }),
    ]);

    return {
      id: farm.id.toString(),
      name: farm.name,
      governorate: farm.governorate,
      areaName: farm.areaName,
      areaFeddan: farm.areaFeddan.toString(),
      farmStatus: farm.farmStatus,
      farmType: String(farm.farmType),
      mainActivity: farm.mainActivity,
      createdAt: farm.createdAt?.toISOString() ?? '',
      updatedAt: farm.updatedAt?.toISOString() ?? null,
      facilityCount,
      publishedListings: published
        .filter((r) => r.listingDetail)
        .map((r) => ({ id: r.id.toString(), listingType: String(r.listingDetail!.listingType) })),
      relationships: farm.relationships.map((r) => ({
        relationshipRole: String(r.relationshipRole),
        userId: r.userId.toString(),
        fullName: r.user.fullName,
      })),
      recentRequests: farm.requests.map((req) => ({
        id: req.id.toString(),
        requestType: String(req.requestType),
        status: req.status,
        createdAt: req.createdAt?.toISOString() ?? '',
      })),
    };
  }
}
