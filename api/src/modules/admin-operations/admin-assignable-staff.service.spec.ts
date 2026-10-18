import { Test } from '@nestjs/testing';
import { StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAssignableStaffService } from './admin-assignable-staff.service';

describe('AdminAssignableStaffService', () => {
  let service: AdminAssignableStaffService;
  const prisma = {
    staffMembership: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [AdminAssignableStaffService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AdminAssignableStaffService);
  });

  it('lists active reviewers only', async () => {
    prisma.staffMembership.findMany.mockResolvedValue([
      { userId: 2n, staffRole: StaffRole.reviewer, user: { fullName: 'Reviewer A' } },
    ]);
    const res = await service.list({ role: 'reviewer' });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].userId).toBe('2');
    expect(prisma.staffMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ staffRole: StaffRole.reviewer }),
      }),
    );
  });
});
