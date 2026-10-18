import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminEvaluationListResponseDto, AdminEvaluationsQueryDto } from './dto/admin-evaluations.dto';

@Injectable()
export class AdminEvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminEvaluationsQueryDto): Promise<AdminEvaluationListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.FarmEvaluationWhereInput = {};
    if (query.farmId) where.farmId = BigInt(query.farmId);
    if (query.status?.trim()) where.status = query.status.trim() as never;

    const [total, rows] = await Promise.all([
      this.prisma.farmEvaluation.count({ where }),
      this.prisma.farmEvaluation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          farmId: true,
          status: true,
          scoreValue: true,
          scoreMax: true,
          createdAt: true,
          farm: { select: { name: true } },
          reviewer: { select: { fullName: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: rows.map((row) => ({
        id: row.id.toString(),
        farmId: row.farmId.toString(),
        farmName: row.farm.name,
        status: String(row.status),
        scoreValue: row.scoreValue != null ? Number(row.scoreValue) : null,
        scoreMax: row.scoreMax != null ? Number(row.scoreMax) : null,
        reviewerName: row.reviewer.fullName,
        createdAt: row.createdAt?.toISOString() ?? null,
      })),
    };
  }
}
