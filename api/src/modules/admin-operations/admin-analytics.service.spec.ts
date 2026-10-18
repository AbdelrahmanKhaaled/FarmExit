import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAnalyticsService } from './admin-analytics.service';

describe('AdminAnalyticsService', () => {
  const prisma = {
    farm: { count: jest.fn().mockResolvedValue(1) },
    user: { count: jest.fn().mockResolvedValue(3) },
    request: {
      count: jest.fn().mockResolvedValue(2),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    communicationCase: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    requestDocument: { count: jest.fn().mockResolvedValue(0) },
    requestStaffAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };

  let service: AdminAnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.request.findMany = jest.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [AdminAnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminAnalyticsService);
  });

  it('returns analytics payload for default range', async () => {
    const result = await service.analytics({ range: '30d' });
    expect(result.newFarms).toBe(1);
    expect(result.requestsCreated).toBe(2);
    expect(result.timeseries.usersRegistered.length).toBeGreaterThan(0);
    expect(result.overview.newUsers).toBe(3);
  });
});
