import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { permissionsForRoles } from '../authorization/staff-permissions';
import { RequestsService } from './requests.service';
import { LinkedRequestApplicationsService } from './linked-request-applications.service';
import { LinkedApplicationsQueryDto } from './dto/linked-applications.dto';

describe('applications linked to a parent request', () => {
  const prisma = { request: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() } };
  const requests = { getStaff: jest.fn() };
  const auth = { loadContext: jest.fn() };
  let service: LinkedRequestApplicationsService;
  beforeEach(async () => {
    jest.clearAllMocks();
    requests.getStaff.mockResolvedValue({ id: '10', requestType: 'partnership' });
    auth.loadContext.mockResolvedValue({ userId: 1n, roles: ['admin'], permissions: permissionsForRoles(['admin']) });
    prisma.request.count.mockResolvedValue(8);
    prisma.request.groupBy.mockResolvedValue([
      { status: 'submitted', _count: { _all: 4 } },
      { status: 'underFarmExitReview', _count: { _all: 2 } },
      { status: 'approved', _count: { _all: 1 } },
      { status: 'rejected', _count: { _all: 1 } },
    ]);
    prisma.request.findMany.mockResolvedValue([
      {
        id: 12n,
        parentRequestId: 10n,
        requestNumber: 'PA-12',
        status: 'approved',
        submittedAt: new Date('2026-10-01Z'),
        creator: { fullName: 'Applicant', email: 'private@example.com' },
        applicationDetail: {
          applicantKind: 'individual',
          applicationMessage: 'Message',
          relevantExperience: 'Experience',
        },
        staffAssignments: [],
      },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        LinkedRequestApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RequestsService, useValue: requests },
        { provide: StaffAuthorizationService, useValue: auth },
      ],
    }).compile();
    service = module.get(LinkedRequestApplicationsService);
  });
  it('requires the exact parent FK, child type, application detail and real submission before pagination', async () => {
    const result = await service.list(1n, 10n, {
      page: 2,
      pageSize: 2,
      search: 'Applicant',
      status: 'approved',
      sort: 'oldest',
    });
    expect(requests.getStaff).toHaveBeenCalledWith(1n, 10n);
    const scope = {
      parentRequestId: 10n,
      requestType: 'partnershipApplication',
      status: { not: 'draft' },
      submittedAt: { not: null },
      applicationDetail: { isNot: null },
    };
    expect(prisma.request.count).toHaveBeenCalledWith({
      where: {
        AND: [
          scope,
          {
            status: 'approved',
            OR: [{ requestNumber: { contains: 'Applicant' } }, { creator: { fullName: { contains: 'Applicant' } } }],
          },
        ],
      },
    });
    expect(prisma.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: prisma.request.count.mock.calls[0][0].where,
        skip: 2,
        take: 2,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(prisma.request.groupBy).toHaveBeenCalledWith({ by: ['status'], where: scope, _count: { _all: true } });
    expect(result.summary).toMatchObject({ total: 8, pending: 6, approved: 1, rejected: 1 });
    expect(result.items[0].parentRequestId).toBe('10');
    expect(JSON.stringify(result)).not.toContain('private@example.com');
  });
  it.each([
    'farmManagement',
    'farmListing',
    'farmDetails',
    'farmPurchaseProposal',
    'partnershipApplication',
    'professionalApplication',
  ])('does not invent applications for %s', async (requestType) => {
    requests.getStaff.mockResolvedValue({ requestType });
    await expect(service.list(1n, 10n, {})).rejects.toMatchObject({ status: 404 });
    expect(prisma.request.findMany).not.toHaveBeenCalled();
  });
  it('does not expose any child or aggregate when parent access fails', async () => {
    requests.getStaff.mockRejectedValue(new Error('Parent access denied'));
    await expect(service.list(1n, 10n, {})).rejects.toThrow('Parent access denied');
    expect(prisma.request.count).not.toHaveBeenCalled();
  });
  it('clamps stale or excessive page numbers to the last filtered page', async () => {
    const result = await service.list(1n, 10n, { page: 100, pageSize: 6 });
    expect(result.page).toBe(2);
    expect(prisma.request.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 6, take: 6 }));
  });
  it('does not inherit child permissions from a reviewer assignment on the parent', async () => {
    auth.loadContext.mockResolvedValue({
      userId: 1n,
      roles: ['reviewer'],
      permissions: permissionsForRoles(['reviewer']),
    });
    await expect(service.list(1n, 10n, {})).rejects.toMatchObject({ status: 403 });
    expect(prisma.request.groupBy).not.toHaveBeenCalled();
  });
  it('scopes both list and summary to the case agent assignment on each child', async () => {
    auth.loadContext.mockResolvedValue({
      userId: 1n,
      roles: ['caseAgent'],
      permissions: permissionsForRoles(['caseAgent']),
    });
    await service.list(1n, 10n, {});
    const assignmentScope = { some: { assignedStaffId: 1n, assignmentType: 'caseAgent' } };
    expect(prisma.request.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ staffAssignments: assignmentScope }) }),
    );
    expect(prisma.request.count).toHaveBeenCalledWith({
      where: { AND: [expect.objectContaining({ staffAssignments: assignmentScope }), {}] },
    });
  });
  it('denies stale or missing staff permission before reading child data', async () => {
    auth.loadContext.mockResolvedValue(null);
    await expect(service.list(1n, 10n, {})).rejects.toMatchObject({ status: 403 });
    expect(prisma.request.findMany).not.toHaveBeenCalled();
  });
  it.each([{ page: 0 }, { pageSize: 100 }, { status: 'shortlisted' }, { sort: 'name' }, { search: 'a'.repeat(151) }])(
    'validates query %j',
    async (query) => {
      expect(await validate(plainToInstance(LinkedApplicationsQueryDto, query))).not.toHaveLength(0);
    },
  );
});
