import { NotFoundException } from '@nestjs/common';
import { RequestType, StaffRole } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { StaffPermission } from '../authorization/staff-permissions';
import { RequestDocumentsService } from './request-documents.service';

describe('RequestDocumentsService download authorization', () => {
  const doc = {
    id: 5n,
    requestId: 10n,
    storageKey: 'requests/10/documents/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.pdf',
    mimeType: 'application/pdf',
    originalName: 'id.pdf',
  };

  let prisma: {
    requestDocument: { findUnique: jest.Mock };
    request: { findUnique: jest.Mock; findFirst: jest.Mock };
    requestStaffAssignment: { findFirst: jest.Mock; findMany: jest.Mock };
  };
  let staffAuth: { loadContext: jest.Mock };
  let files: { open: jest.Mock };
  let service: RequestDocumentsService;

  beforeEach(() => {
    prisma = {
      requestDocument: { findUnique: jest.fn().mockResolvedValue(doc) },
      request: {
        findUnique: jest.fn().mockResolvedValue({ id: 10n, createdBy: 99n, requestType: RequestType.partnershipApplication }),
        findFirst: jest.fn(),
      },
      requestStaffAssignment: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([{ id: 1n }]) },
    };
    staffAuth = {
      loadContext: jest.fn().mockResolvedValue({
        userId: 2n,
        roles: [StaffRole.reviewer],
        permissions: [StaffPermission.RequestsRead],
      }),
    };
    files = { open: jest.fn() };
    service = new RequestDocumentsService(
      prisma as unknown as PrismaService,
      files as never,
      staffAuth as unknown as StaffAuthorizationService,
    );
  });

  it('denies staff with requests.read but no assignment on a restricted request', async () => {
    await expect(service.download(2n, 10n, 5n)).rejects.toBeInstanceOf(NotFoundException);
  });
});
