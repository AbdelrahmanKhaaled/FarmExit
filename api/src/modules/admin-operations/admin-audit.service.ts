import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminAuditLogListResponseDto, AdminAuditLogsQueryDto } from './dto/admin-audit.dto';

const SENSITIVE_KEYS = /password|token|secret|credential|refresh/i;

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAuditLogsQueryDto): Promise<AdminAuditLogListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.module) where.entityType = { contains: query.module };
    if (query.action) where.action = { contains: query.action };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { action: { contains: q } },
        { entityType: { contains: q } },
        { actor: { is: { fullName: { contains: q } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { actor: { select: { id: true, fullName: true } } },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: rows.map((row) => ({
        id: row.id.toString(),
        createdAt: row.createdAt?.toISOString() ?? '',
        actorName: row.actor?.fullName ?? null,
        actorUserId: row.actorUserId?.toString() ?? null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId.toString(),
        summary: this.summarizeChanges(row.changes),
      })),
    };
  }

  private summarizeChanges(changes: unknown): string | null {
    if (!changes || typeof changes !== 'object') return null;
    const parts: string[] = [];
    for (const [key, value] of Object.entries(changes as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) continue;
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      if (text.length > 80) parts.push(`${key}: …`);
      else parts.push(`${key}: ${text}`);
      if (parts.length >= 3) break;
    }
    return parts.length ? parts.join(' · ') : null;
  }
}
