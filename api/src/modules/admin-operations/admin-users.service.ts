import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminUserDetailDto } from './dto/admin-user-detail.dto';
import type { AdminUsersListResponseDto, AdminUsersQueryDto } from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminUsersQueryDto): Promise<AdminUsersListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const tab = query.tab ?? 'users';

    if (tab === 'admins') {
      return this.listAdministrators(query, page, pageSize, skip);
    }
    return this.listUsers(query, page, pageSize, skip);
  }

  private async listUsers(
    query: AdminUsersQueryDto,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<AdminUsersListResponseDto> {
    const where: Prisma.UserWhereInput = {
      staffMemberships: { none: {} },
    };
    if (query.accountStatus?.trim()) where.accountStatus = query.accountStatus.trim() as never;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { mobileE164: { contains: q } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          email: true,
          mobileE164: true,
          accountStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      userItems: rows.map((u) => ({
        id: u.id.toString(),
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobileE164,
        accountStatus: u.accountStatus,
        createdAt: u.createdAt?.toISOString() ?? '',
      })),
      adminItems: [],
    };
  }

  private async listAdministrators(
    query: AdminUsersQueryDto,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<AdminUsersListResponseDto> {
    const adminRoles = [StaffRole.admin, StaffRole.superAdmin];
    const where: Prisma.UserWhereInput = {
      staffMemberships: {
        some: { staffRole: { in: adminRoles }, status: 'active' },
      },
    };
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [{ fullName: { contains: q } }, { email: { contains: q } }, { mobileE164: { contains: q } }],
        },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          staffMemberships: { where: { staffRole: { in: adminRoles }, status: 'active' } },
          adminCredential: { select: { id: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      userItems: [],
      adminItems: rows.map((u) => ({
        userId: u.id.toString(),
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobileE164,
        roles: u.staffMemberships.map((m) => m.staffRole),
        hasCredential: Boolean(u.adminCredential),
        createdAt: u.createdAt?.toISOString() ?? '',
      })),
    };
  }

  async getPlatformUser(id: bigint): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, staffMemberships: { none: {} } },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobileE164: true,
        accountStatus: true,
        mobileVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [requestsCreatedCount, relationships] = await Promise.all([
      this.prisma.request.count({ where: { createdBy: id } }),
      this.prisma.farmRelationship.findMany({
        where: { userId: id },
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          relationshipRole: true,
          farm: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      id: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobileE164,
      accountStatus: user.accountStatus,
      mobileVerifiedAt: user.mobileVerifiedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt?.toISOString() ?? '',
      requestsCreatedCount,
      farmRelationships: relationships.map((r) => ({
        farmId: r.farm.id.toString(),
        farmName: r.farm.name,
        relationshipRole: String(r.relationshipRole),
      })),
    };
  }
}
