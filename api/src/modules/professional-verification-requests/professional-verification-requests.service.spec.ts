import { BadRequestException, ConflictException } from '@nestjs/common';
import { RequestType, VerificationStatus } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProfessionalProfilesService } from '../professional-profiles/professional-profiles.service';
import { ProfessionalVerificationRequestsService } from './professional-verification-requests.service';

describe('ProfessionalVerificationRequestsService', () => {
  const profiles = { buildSnapshot: jest.fn().mockResolvedValue({ profile: {} }) };
  let prisma: {
    professionalCapability: { findFirst: jest.Mock };
    request: { findFirst: jest.Mock; count: jest.Mock };
    requestDocument: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: ProfessionalVerificationRequestsService;

  beforeEach(() => {
    prisma = {
      professionalCapability: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5n,
          verificationStatus: VerificationStatus.verificationRequired,
          profile: { userId: 1n },
        }),
      },
      request: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn(),
      },
      requestDocument: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    service = new ProfessionalVerificationRequestsService(
      prisma as unknown as PrismaService,
      profiles as unknown as ProfessionalProfilesService,
    );
  });

  it('blocks duplicate active verification requests for the same capability', async () => {
    prisma.request.findFirst.mockResolvedValue({ id: 9n });
    await expect(service.create(1n, { professionalCapabilityId: '5' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a supporting document before submit', async () => {
    prisma.request.findFirst.mockResolvedValue({
      id: 10n,
      createdBy: 1n,
      requestType: RequestType.professionalVerification,
      status: 'draft',
    });
    await expect(service.submit(1n, 10n)).rejects.toBeInstanceOf(BadRequestException);
  });
});
