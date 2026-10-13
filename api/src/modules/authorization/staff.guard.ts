import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { StaffRole } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from '../auth/auth.decorators';
import { unauthorized } from '../auth/auth.errors';
import { forbidden } from './authorization.errors';
import { PERMISSIONS_KEY, ROLES_KEY } from './staff.metadata';
import { StaffAuthorizationService } from './staff-authorization.service';
import type { StaffPermission } from './staff-permissions';
import type { StaffContext } from './staff.types';

export type StaffRequest = AuthenticatedRequest & { staff?: StaffContext };

/**
 * Requires active FarmExit staff membership (checked in the database on every request) and, when the route declares
 * them, one of the listed roles (`@StaffRoles`) and all listed permissions (`@StaffPermissions`).
 * It runs after `AccessTokenGuard`: unauthenticated callers are rejected there with 401; everything here is 403.
 * Nothing the client sends (headers, body, query, token claims) influences the decision.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<StaffRequest>();
    if (!req.auth) throw unauthorized();

    const staff = await this.staffAuth.loadContext(req.auth.userId);
    if (!staff) throw forbidden();

    // Requirements declared on the class AND on the handler must all hold: a handler can tighten a class-level rule
    // but never loosen it. A declared-but-empty list is a mistake and denies (deny by default).
    for (const target of [context.getClass(), context.getHandler()]) {
      const roles = this.reflector.get<StaffRole[] | undefined>(ROLES_KEY, target);
      if (roles && !roles.some((role) => staff.roles.includes(role))) throw forbidden();

      const permissions = this.reflector.get<StaffPermission[] | undefined>(PERMISSIONS_KEY, target);
      if (permissions && (permissions.length === 0 || !permissions.every((p) => staff.permissions.includes(p)))) {
        throw forbidden();
      }
    }
    req.staff = staff;
    return true;
  }
}
