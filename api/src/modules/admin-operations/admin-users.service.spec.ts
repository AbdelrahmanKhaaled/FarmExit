import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  const prisma = {
    user: { findFirst: jest.fn() },
    request: { count: jest.fn() },
    farmRelationship: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [AdminUsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AdminUsersService);
  });

  it('getPlatformUser excludes staff and returns farm roles not global buyer/owner labels', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 5n,
      fullName: 'User',
      email: 'u@example.com',
      mobileE164: '+201000000001',
      accountStatus: 'active',
      mobileVerifiedAt: null,
      lastLoginAt: null,
      createdAt: new Date(),
    });
    prisma.request.count.mockResolvedValue(2);
    prisma.farmRelationship.findMany.mockResolvedValue([
      { relationshipRole: 'owner', farm: { id: 10n, name: 'Farm A' } },
    ]);
    const res = await service.getPlatformUser(5n);
    expect(res.farmRelationships[0].relationshipRole).toBe('owner');
    expect(res.requestsCreatedCount).toBe(2);
    expect(res).not.toHaveProperty('passwordHash');
  });

  it('getPlatformUser throws when user is staff', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getPlatformUser(1n)).rejects.toBeInstanceOf(NotFoundException);
  });
});
