import { Injectable } from '@nestjs/common';
import { StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { permissionsForRoles, type StaffPermission } from './staff-permissions';
import type { StaffContext } from './staff.types';

/** `staff_memberships.status` value that grants access (the only documented value). */
export const STAFF_STATUS_ACTIVE = 'active';

const KNOWN_ROLES: readonly string[] = Object.values(StaffRole);

/** Database-backed staff authorization: memberships are read on every call, so revocation is immediate. */
@Injectable()
export class StaffAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active staff identity for a user, or null when the user is not (or no longer) active FarmExit staff. */
  async loadContext(userId: bigint): Promise<StaffContext | null> {
    const memberships = await this.prisma.staffMembership.findMany({
      where: { userId, status: STAFF_STATUS_ACTIVE },
    });
    const roles = [...new Set(memberships.map((m) => m.staffRole))].filter((r) => KNOWN_ROLES.includes(r)).sort();
    if (roles.length === 0) return null;
    return { userId, roles, permissions: permissionsForRoles(roles) };
  }

  async hasPermission(userId: bigint, permission: StaffPermission): Promise<boolean> {
    const context = await this.loadContext(userId);
    return context?.permissions.includes(permission) ?? false;
  }
}
