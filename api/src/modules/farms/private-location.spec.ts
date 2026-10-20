import { ValidationPipe } from '@nestjs/common';
import type { Farm } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { FarmRelationshipRole } from '../../generated/prisma/enums';
import { UpdatePrivateLocationDto } from './dto/private-location.dto';
import { PrivateLocationService } from './private-location.service';

describe('private farm location', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = async (body: unknown): Promise<UpdatePrivateLocationDto> => {
    const result: unknown = await pipe.transform(body, { type: 'body', metatype: UpdatePrivateLocationDto });
    return result as UpdatePrivateLocationDto;
  };
  let row: Farm;
  let roles: FarmRelationshipRole[];
  let staff: boolean;
  let service: PrivateLocationService;
  let update: jest.Mock;
  beforeEach(() => {
    row = {
      id: 1n,
      deletedAt: null,
      updatedAt: null,
      privatePinLatitude: null,
      privatePinLongitude: null,
      accessDetails: { gate: 'Keep private', nested: { keep: true } },
      publicMapLatitude: null,
      publicMapLongitude: null,
    } as unknown as Farm;
    roles = [FarmRelationshipRole.owner];
    staff = false;
    update = jest.fn(({ data }: { data: object }) => {
      row = { ...row, ...data };
      return { count: 1 };
    });
    const tx = { farm: { findFirst: jest.fn(() => row), updateMany: update, findUniqueOrThrow: jest.fn(() => row) } };
    const prisma = { ...tx, $transaction: (callback: (value: typeof tx) => unknown) => Promise.resolve(callback(tx)) };
    service = new PrivateLocationService(
      prisma as unknown as PrismaService,
      { activeRoles: () => Promise.resolve(roles) } as unknown as FarmAccessService,
      { hasPermission: () => Promise.resolve(staff) } as unknown as StaffAuthorizationService,
    );
  });

  it('saves, reloads, edits and explicitly clears paired coordinates without touching public coordinates', async () => {
    await service.update(1n, 1n, await validate({ privatePinLatitude: 29.12345678, privatePinLongitude: 31.12345678 }));
    expect(await service.get(1n, 1n)).toMatchObject({
      privatePinLatitude: 29.12345678,
      privatePinLongitude: 31.12345678,
    });
    await service.update(1n, 1n, await validate({ privatePinLatitude: 0, privatePinLongitude: 0 }));
    expect((await service.get(1n, 1n)).privatePinLatitude).toBe(0);
    await service.update(1n, 1n, await validate({ privatePinLatitude: null, privatePinLongitude: null }));
    expect((await service.get(1n, 1n)).privatePinLatitude).toBeNull();
    expect(row.publicMapLatitude).toBeNull();
    expect(row.publicMapLongitude).toBeNull();
  });
  it('merges only approved road keys and preserves coordinates and other JSON keys', async () => {
    await service.update(1n, 1n, await validate({ nearestMainRoad: '  Cairo road  ', roadDistanceKm: 0 }));
    expect(row.accessDetails).toEqual({
      gate: 'Keep private',
      nested: { keep: true },
      nearestMainRoad: 'Cairo road',
      roadDistanceKm: 0,
    });
    expect(await service.get(1n, 1n)).toEqual({
      farmId: '1',
      privatePinLatitude: null,
      privatePinLongitude: null,
      nearestMainRoad: 'Cairo road',
      roadDistanceKm: 0,
    });
    await service.update(1n, 1n, await validate({ nearestMainRoad: null }));
    expect(row.accessDetails).toEqual({ gate: 'Keep private', nested: { keep: true }, roadDistanceKm: 0 });
  });
  it.each([
    { privatePinLatitude: 91, privatePinLongitude: 31 },
    { privatePinLatitude: -91 },
    { privatePinLongitude: 181 },
    { privatePinLatitude: '29' },
    { privatePinLatitude: Infinity },
    { privatePinLatitude: NaN },
    { privatePinLatitude: 0.123456789 },
    { roadDistanceKm: -1 },
    { roadDistanceKm: '3' },
    { nearestMainRoad: '' },
    { nearestMainRoad: 'a'.repeat(256) },
    { publicMapLatitude: 29 },
    { accessDetails: { arbitrary: true } },
  ])('rejects invalid or unapproved input %j', async (body) => {
    await expect(validate(body)).rejects.toThrow();
  });
  it.each([
    {},
    { privatePinLatitude: 29 },
    { privatePinLongitude: 31 },
    { privatePinLatitude: null, privatePinLongitude: 31 },
    { privatePinLatitude: 29, privatePinLongitude: null },
  ])('rejects empty updates and incomplete coordinate pairs %j', async (body) => {
    await expect(service.update(1n, 1n, await validate(body))).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
  it.each([[], ['manager'], ['partner'], ['agriculturalEngineer'], ['tenant']].map((value) => ({ value })))(
    'denies non-owner role %j',
    async ({ value }) => {
      roles = value as FarmRelationshipRole[];
      await expect(service.get(2n, 1n)).rejects.toThrow('Farm not found');
      await expect(service.update(2n, 1n, { roadDistanceKm: 1 })).rejects.toThrow('Farm not found');
      expect(update).not.toHaveBeenCalled();
    },
  );
  it('lets dedicated staff read only, and rejects concurrent writes', async () => {
    roles = [];
    staff = true;
    await expect(service.get(3n, 1n)).resolves.toMatchObject({ farmId: '1' });
    await expect(service.update(3n, 1n, { roadDistanceKm: 1 })).rejects.toThrow('Farm not found');
    roles = [FarmRelationshipRole.owner];
    update.mockReturnValueOnce({ count: 0 });
    await expect(service.update(1n, 1n, { roadDistanceKm: 2 })).rejects.toThrow('Farm changed');
  });
  it('refuses to replace legacy non-object access JSON', async () => {
    row.accessDetails = ['legacy'];
    await expect(service.update(1n, 1n, { roadDistanceKm: 2 })).rejects.toThrow('Existing access details');
    expect(update).not.toHaveBeenCalled();
  });
});
