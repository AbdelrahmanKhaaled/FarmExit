import { applyDecorators, createParamDecorator, type ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { StaffRole } from '../../generated/prisma/enums';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CompletedProfileGuard } from '../auth/completed-profile.guard';
import type { StaffPermission } from './staff-permissions';
import { PERMISSIONS_KEY, ROLES_KEY } from './staff.metadata';
import { StaffGuard, type StaffRequest } from './staff.guard';
import type { StaffContext } from './staff.types';

/**
 * Active FarmExit staff only. Order: authenticated (401) -> completed profile -> staff membership (403).
 * Add `@StaffRoles(...)` / `@StaffPermissions(...)` to narrow it further.
 */
export const StaffOnly = (): ClassDecorator & MethodDecorator =>
  applyDecorators(
    UseGuards(AccessTokenGuard, CompletedProfileGuard, StaffGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse({ description: 'Not active FarmExit staff, or missing the required role/permission' }),
  );

/** Any ONE of these staff roles is required (use with `@StaffOnly()`). */
export const StaffRoles = (...roles: StaffRole[]): ClassDecorator & MethodDecorator => SetMetadata(ROLES_KEY, roles);

/** ALL of these staff permissions are required (use with `@StaffOnly()`). Prefer permissions over roles. */
export const StaffPermissions = (...permissions: StaffPermission[]): ClassDecorator & MethodDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** The caller's staff identity, as loaded by `StaffGuard`. */
export const CurrentStaff = createParamDecorator((_data: unknown, context: ExecutionContext): StaffContext => {
  const staff = context.switchToHttp().getRequest<StaffRequest>().staff;
  if (!staff) throw new Error('CurrentStaff used on a route without @StaffOnly()');
  return staff;
});
