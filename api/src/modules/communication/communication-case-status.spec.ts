import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { CommunicationAccessService } from './communication-access.service';
import { CommunicationCasesService } from './communication-cases.service';

describe('communication case status changes', () => {
  const closed = {
    id: 1n,
    requestId: 2n,
    assignedStaffId: 3n,
    status: 'closed',
    closedAt: new Date(),
    createdAt: new Date(),
  };
  const tx = { communicationCase: { update: jest.fn() }, auditLog: { create: jest.fn() } };
  const prisma = {
    communicationCase: { findUnique: jest.fn() },
    $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const access = { assertStaffCaseAccess: jest.fn() };
  let service: CommunicationCasesService;
  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.communicationCase.findUnique.mockResolvedValue(closed);
    access.assertStaffCaseAccess.mockResolvedValue(undefined);
    tx.communicationCase.update.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ ...closed, ...data }),
    );
    const module = await Test.createTestingModule({
      providers: [
        CommunicationCasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommunicationAccessService, useValue: access },
        { provide: StaffAuthorizationService, useValue: {} },
      ],
    }).compile();
    service = module.get(CommunicationCasesService);
  });
  it.each(['open', 'waitingCustomer', 'waitingOwner', 'closed'] as const)(
    'allows authorized staff to move a closed case to %s',
    async (status) => {
      const result = await service.updateStatusStaff(3n, 1n, { status });
      expect(result.status).toBe(status);
      expect(result.closedAt === null).toBe(status !== 'closed');
      expect(tx.auditLog.create).toHaveBeenCalled();
    },
  );
  it('retains assignment and permission authorization', async () => {
    access.assertStaffCaseAccess.mockRejectedValue(new Error('Forbidden'));
    await expect(service.updateStatusStaff(9n, 1n, { status: 'open' })).rejects.toThrow('Forbidden');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
