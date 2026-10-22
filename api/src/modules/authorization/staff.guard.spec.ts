/* eslint-disable @typescript-eslint/unbound-method -- jest mocks and decorated handlers are passed as references */
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '../../generated/prisma/enums';
import { StaffPermissions, StaffRoles } from './staff.decorators';
import { StaffGuard, type StaffRequest } from './staff.guard';
import { StaffAuthorizationService } from './staff-authorization.service';
import { StaffPermission } from './staff-permissions';

class Admin {
  @StaffRoles(StaffRole.admin)
  adminOnly(): void {}

  @StaffPermissions(StaffPermission.RequestsReview)
  review(): void {}

  @StaffRoles(StaffRole.caseAgent)
  @StaffPermissions(StaffPermission.RequestsForward)
  both(): void {}

  anyStaff(): void {}
}

function contextFor(handler: () => void, req: Partial<StaffRequest>, cls: unknown = Admin): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

function guardWith(roles: string[] | null): StaffGuard {
  const staffAuth = {
    loadContext: jest.fn((userId: bigint) =>
      Promise.resolve(
        roles === null
          ? null
          : {
              userId,
              roles,
              permissions:
                roles[0] === 'reviewer'
                  ? ['requests.read', 'requests.review', 'evaluations.manage']
                  : roles[0] === 'caseAgent'
                    ? ['communication.relay', 'requests.forward', 'requests.read']
                    : Object.values(StaffPermission),
            },
      ),
    ),
  } as unknown as StaffAuthorizationService;
  return new StaffGuard(new Reflector(), staffAuth);
}

const authed = (userId = 1n): Partial<StaffRequest> => ({
  auth: { userId, sessionId: 1n, user: {} as never },
  headers: { 'x-staff-role': 'admin' },
});

@StaffRoles(StaffRole.admin)
class AdminArea {
  inherits(): void {}

  @StaffRoles(StaffRole.reviewer)
  triesToLoosen(): void {}

  @StaffRoles()
  emptyRoles(): void {}

  @StaffPermissions()
  emptyPermissions(): void {}
}

describe('StaffGuard', () => {
  const admin = new Admin();

  it('rejects an unauthenticated request with 401 (guard order safety net)', async () => {
    await expect(guardWith(['admin']).canActivate(contextFor(admin.anyStaff, {}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects users who are not active staff with 403, whatever the client sends', async () => {
    await expect(guardWith(null).canActivate(contextFor(admin.anyStaff, authed()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('admits any active staff member when no role or permission is declared and exposes the context', async () => {
    const req = authed();
    await expect(guardWith(['reviewer']).canActivate(contextFor(admin.anyStaff, req))).resolves.toBe(true);
    expect(req.staff?.roles).toEqual(['reviewer']);
  });

  it('enforces declared roles (any of)', async () => {
    await expect(guardWith(['admin']).canActivate(contextFor(admin.adminOnly, authed()))).resolves.toBe(true);
    await expect(guardWith(['reviewer']).canActivate(contextFor(admin.adminOnly, authed()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('admits superAdmin to routes declared admin-only', async () => {
    await expect(guardWith(['superAdmin']).canActivate(contextFor(admin.adminOnly, authed()))).resolves.toBe(true);
  });

  it('enforces declared permissions (all of)', async () => {
    await expect(guardWith(['reviewer']).canActivate(contextFor(admin.review, authed()))).resolves.toBe(true);
    await expect(guardWith(['caseAgent']).canActivate(contextFor(admin.review, authed()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requires both the role and the permission when both are declared', async () => {
    await expect(guardWith(['caseAgent']).canActivate(contextFor(admin.both, authed()))).resolves.toBe(true);
    await expect(guardWith(['admin']).canActivate(contextFor(admin.both, authed()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('uses one identical 403 body for every denial', async () => {
    const bodies = await Promise.all(
      [
        guardWith(null).canActivate(contextFor(admin.anyStaff, authed())),
        guardWith(['reviewer']).canActivate(contextFor(admin.adminOnly, authed())),
        guardWith(['caseAgent']).canActivate(contextFor(admin.review, authed())),
      ].map((p) => p.catch((e: ForbiddenException) => e.getResponse())),
    );
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
  });

  describe('class-level and malformed declarations (deny by default)', () => {
    const area = new AdminArea();

    it('applies a class-level role to handlers that declare nothing', async () => {
      await expect(guardWith(['admin']).canActivate(contextFor(area.inherits, authed(), AdminArea))).resolves.toBe(
        true,
      );
      await expect(
        guardWith(['reviewer']).canActivate(contextFor(area.inherits, authed(), AdminArea)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('never lets a handler loosen a class-level role requirement', async () => {
      // reviewer satisfies the handler rule but not the class rule; admin satisfies the class but not the handler
      for (const role of ['reviewer', 'admin']) {
        await expect(
          guardWith([role]).canActivate(contextFor(area.triesToLoosen, authed(), AdminArea)),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    });

    it('denies an empty @StaffRoles() / @StaffPermissions() instead of allowing everyone', async () => {
      for (const handler of [area.emptyRoles, area.emptyPermissions]) {
        await expect(
          guardWith(['admin', 'reviewer']).canActivate(contextFor(handler, authed(), AdminArea)),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
