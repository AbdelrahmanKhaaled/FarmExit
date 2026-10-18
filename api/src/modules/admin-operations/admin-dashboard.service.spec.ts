import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  const prisma = {
    user: { count: jest.fn().mockResolvedValue(10) },
    farm: { count: jest.fn().mockResolvedValue(4) },
    request: { count: jest.fn().mockResolvedValue(2), findMany: jest.fn().mockResolvedValue([]) },
    communicationCase: { count: jest.fn().mockResolvedValue(1) },
    requestDocument: { count: jest.fn().mockResolvedValue(3) },
    requestStaffAssignment: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AdminDashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminDashboardService);
  });

  it('returns aggregate overview counts', async () => {
    const overview = await service.overview();
    expect(overview.registeredUsers).toBe(10);
    expect(overview.farms).toBe(4);
    expect(overview.activeCommunicationCases).toBe(1);
  });
});
