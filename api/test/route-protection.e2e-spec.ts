import { type INestApplication, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AccessTokenGuard } from '../src/modules/auth/access-token.guard';
import { CompletedProfileGuard } from '../src/modules/auth/completed-profile.guard';
import { StaffGuard } from '../src/modules/authorization/staff.guard';
import { PERMISSIONS_KEY, ROLES_KEY } from '../src/modules/authorization/staff.metadata';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma } from './support/fake-prisma';

/**
 * Route inventory. Every route in the real AppModule must be listed here as public, or sign-in only (onboarding),
 * or else it must carry AccessTokenGuard AND CompletedProfileGuard (and StaffGuard when it declares staff roles or
 * permissions). A future business route that forgets its guards fails this test instead of shipping unprotected.
 */
const PUBLIC = new Set([
  'GET health',
  'GET marketplace/farms',
  'GET marketplace/farms/:slug',
  'POST auth/otp/request',
  'POST auth/otp/verify',
  'POST auth/refresh',
  'POST admin-auth/login',
  'POST admin-auth/refresh',
]);
const SIGNED_IN_ONLY = new Set(['POST auth/logout', 'GET auth/me', 'POST auth/profile/complete', 'PATCH auth/profile']);
const DASHBOARD_AUTH = new Set(['POST admin-auth/logout', 'GET admin-auth/me']);

type Route = { key: string; guards: unknown[]; staffMetadata: boolean };

describe('Route protection inventory', () => {
  let app: INestApplication;
  let routes: Route[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] })
      .overrideProvider(PrismaService)
      .useValue(createFakePrisma())
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    routes = [];
    for (const wrapper of app.get(DiscoveryService).getControllers()) {
      const instance = wrapper.instance as object | undefined;
      const cls = wrapper.metatype;
      if (!instance || !cls) continue;
      const base = String(Reflect.getMetadata(PATH_METADATA, cls) ?? '');
      const classGuards = (Reflect.getMetadata(GUARDS_METADATA, cls) ?? []) as unknown[];
      for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(instance))) {
        const handler = (instance as Record<string, unknown>)[name];
        if (
          name === 'constructor' ||
          typeof handler !== 'function' ||
          Reflect.getMetadata(PATH_METADATA, handler) === undefined
        )
          continue;
        const sub = String(Reflect.getMetadata(PATH_METADATA, handler)).replace(/^\/$/, '');
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
        const path = [base, sub].filter(Boolean).join('/');
        routes.push({
          key: `${method} ${path}`,
          guards: [...classGuards, ...((Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[])],
          staffMetadata:
            [ROLES_KEY, PERMISSIONS_KEY].some((k) => Reflect.getMetadata(k, handler) !== undefined) ||
            [ROLES_KEY, PERMISSIONS_KEY].some((k) => Reflect.getMetadata(k, cls) !== undefined),
        });
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('finds the application routes', () => {
    expect(routes.length).toBeGreaterThanOrEqual(9);
    expect(routes.map((r) => r.key)).toEqual(expect.arrayContaining([...PUBLIC, ...SIGNED_IN_ONLY, 'GET staff/me']));
  });

  it('keeps public routes to the reviewed allow-list', () => {
    const open = routes.filter((r) => !r.guards.includes(AccessTokenGuard)).map((r) => r.key);
    expect(open.sort()).toEqual([...PUBLIC].sort());
  });

  it('requires a completed profile on every route that is not sign-in/onboarding', () => {
    const unprotected = routes
      .filter((r) => !PUBLIC.has(r.key) && !SIGNED_IN_ONLY.has(r.key) && !DASHBOARD_AUTH.has(r.key))
      .filter((r) => !r.guards.includes(CompletedProfileGuard))
      .map((r) => r.key);
    expect(unprotected).toEqual([]);
  });

  it('puts StaffGuard on every route that declares staff roles or permissions, after authentication', () => {
    const staffRoutes = routes.filter((r) => r.staffMetadata || r.key.startsWith('GET staff/'));
    expect(staffRoutes.length).toBeGreaterThan(0);
    for (const r of staffRoutes) {
      const order = r.guards.map((g) => (g as { name?: string }).name);
      expect(order).toEqual(expect.arrayContaining([AccessTokenGuard.name, StaffGuard.name]));
      expect(order.indexOf(AccessTokenGuard.name)).toBeLessThan(order.indexOf(StaffGuard.name));
    }
  });
});
