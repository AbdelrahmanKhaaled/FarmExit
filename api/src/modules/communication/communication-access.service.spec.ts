import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RequestType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { CommunicationAccessService } from './communication-access.service';

describe('CommunicationAccessService', () => {
  let service: CommunicationAccessService;
  const prisma = {
    request: { findUnique: jest.fn() },
    conversation: { findFirst: jest.fn() },
    requestForwarding: { findFirst: jest.fn() },
    requestStaffAssignment: { findFirst: jest.fn() },
  };
  const farmAccess = { hasAnyRole: jest.fn() };
  const staffAuth = { loadContext: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommunicationAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: FarmAccessService, useValue: farmAccess },
        { provide: StaffAuthorizationService, useValue: staffAuth },
      ],
    }).compile();
    service = moduleRef.get(CommunicationAccessService);
  });

  it('rejects relay targets who are not case participants', async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: 10n,
      createdBy: 1n,
      requestType: RequestType.farmPurchaseProposal,
      farmId: 5n,
      status: 'submitted',
    });
    farmAccess.hasAnyRole.mockResolvedValue(false);
    prisma.requestForwarding.findFirst.mockResolvedValue(null);
    await expect(service.assertStaffMessageRecipient({ requestId: 10n } as never, 99n)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows the request creator as relay target', async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: 10n,
      createdBy: 1n,
      requestType: RequestType.farmDetails,
      farmId: 5n,
      status: 'approved',
    });
    await expect(service.assertStaffMessageRecipient({ requestId: 10n } as never, 1n)).resolves.toBeUndefined();
  });

  it('denies staff case access when not assigned', async () => {
    staffAuth.loadContext.mockResolvedValue({
      roles: ['caseAgent'],
      permissions: ['communication.relay'],
    });
    prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);
    await expect(
      service.assertStaffCaseAccess(2n, { requestId: 10n, assignedStaffId: 3n } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
