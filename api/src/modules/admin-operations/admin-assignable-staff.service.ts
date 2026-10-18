import { Injectable } from '@nestjs/common';
import { StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { STAFF_STATUS_ACTIVE } from '../authorization/staff-authorization.service';
import type {
  AdminAssignableStaffListResponseDto,
  AdminAssignableStaffQueryDto,
} from './dto/admin-assignable-staff.dto';

@Injectable()
export class AdminAssignableStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAssignableStaffQueryDto): Promise<AdminAssignableStaffListResponseDto> {
    const staffRole = query.role === 'caseAgent' ? StaffRole.caseAgent : StaffRole.reviewer;
    const limit = query.limit ?? 50;

    const rows = await this.prisma.staffMembership.findMany({
      where: {
        staffRole,
        status: STAFF_STATUS_ACTIVE,
        ...(query.search?.trim()
          ? { user: { fullName: { contains: query.search.trim() } } }
          : {}),
      },
      take: limit,
      orderBy: { user: { fullName: 'asc' } },
      select: {
        staffRole: true,
        userId: true,
        user: { select: { fullName: true } },
      },
    });

    return {
      items: rows.map((row) => ({
        userId: row.userId.toString(),
        fullName: row.user.fullName,
        staffRole: row.staffRole === StaffRole.caseAgent ? 'caseAgent' : 'reviewer',
      })),
    };
  }
}
