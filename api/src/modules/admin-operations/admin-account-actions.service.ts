import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../admin-auth/password.service';
import { validatePasswordPolicy } from '../admin-auth/password-policy';
import { normalizeDashboardEmail } from '../admin-auth/dashboard-email';
import { isValidStoredEgyptianMobile, normalizeMobile } from '../auth/phone-number';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { forbidden } from '../authorization/authorization.errors';
import {
  permissionsForRoles,
  STAFF_ROLE_PERMISSIONS,
  staffIsSuperAdmin,
  StaffPermission,
} from '../authorization/staff-permissions';
import type { CreateDashboardStaffDto, UpdatePlatformUserStatusDto } from './dto/admin-account-actions.dto';

@Injectable()
export class AdminAccountActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  private async authorize(actorId: bigint) {
    const staff = await this.staffAuth.loadContext(actorId);
    if (!staff?.permissions.includes(StaffPermission.StaffManage)) throw forbidden();
    return staff;
  }

  async roleOptions(actorId: bigint) {
    const actor = await this.authorize(actorId);
    return ['reviewer', 'caseAgent', ...(staffIsSuperAdmin(actor.roles) ? ['admin'] : [])].map((role) => ({
      role,
      permissions: STAFF_ROLE_PERMISSIONS[role as keyof typeof STAFF_ROLE_PERMISSIONS],
    }));
  }

  async updateUserStatus(actorId: bigint, userId: bigint, dto: UpdatePlatformUserStatusDto) {
    await this.authorize(actorId);
    return this.prisma.$transaction(async (tx) => {
      // Staff accounts are deliberately excluded: this endpoint cannot suspend administrators.
      const user = await tx.user.findFirst({ where: { id: userId, staffMemberships: { none: {} } } });
      if (!user) throw new NotFoundException('Platform user not found');
      const result = await tx.user.updateMany({
        where: { id: userId, staffMemberships: { none: {} } },
        data: { accountStatus: dto.accountStatus },
      });
      if (result.count !== 1) throw new ConflictException('User membership changed; refresh and try again');
      if (dto.accountStatus === 'suspended') {
        await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'user',
          entityId: userId,
          action: 'account_status_updated',
          changes: { fromStatus: user.accountStatus, accountStatus: dto.accountStatus },
        },
      });
      return { id: userId.toString(), accountStatus: dto.accountStatus };
    });
  }

  async createStaff(actorId: bigint, dto: CreateDashboardStaffDto) {
    const actor = await this.authorize(actorId);
    if (dto.roles.includes('admin') && !staffIsSuperAdmin(actor.roles)) throw forbidden();
    const email = normalizeDashboardEmail(dto.email);
    const mobile = normalizeMobile(dto.mobile);
    if (!email) throw new BadRequestException('Enter a valid email address');
    if (!mobile || !isValidStoredEgyptianMobile(mobile))
      throw new BadRequestException('Enter a valid Egyptian mobile number');
    const policyError = validatePasswordPolicy(dto.password);
    if (policyError) throw new BadRequestException(policyError);
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create a new identity; never silently promote an existing customer by email or mobile.
        const user = await tx.user.create({
          data: {
            fullName: dto.fullName,
            email,
            mobileE164: mobile,
            staffMemberships: { create: dto.roles.map((staffRole) => ({ staffRole, status: 'active' })) },
            adminCredential: {
              create: { email, passwordHash, isActive: true, mustChangePassword: false, passwordChangedAt: new Date() },
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            entityType: 'user',
            entityId: user.id,
            action: 'dashboard_staff_created',
            changes: { roles: dto.roles, permissions: permissionsForRoles(dto.roles) },
          },
        });
        return { id: user.id.toString(), roles: dto.roles };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email or mobile already exists');
      }
      throw error;
    }
  }
}
