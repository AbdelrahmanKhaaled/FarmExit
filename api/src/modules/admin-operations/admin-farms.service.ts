import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminFarmDetailDto,
  AdminFarmListResponseDto,
  AdminListFarmsQueryDto,
} from './dto/admin-farms.dto';

@Injectable()
export class AdminFarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminListFarmsQueryDto): Promise<AdminFarmListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FarmWhereInput = { deletedAt: null };
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q } },
        { governorate: { contains: q } },
        { areaName: { contains: q } },
      ];
    }
    if (query.farmStatus?.trim()) where.farmStatus = query.farmStatus.trim();
    if (query.governorate?.trim()) where.governorate = query.governorate.trim();

    const [total, rows] = await Promise.all([
      this.prisma.farm.count({ where }),
      this.prisma.farm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

    const facilityCount = await this.prisma.agriculturalFacility.count({
      where: { farmId: id },
    });

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
