import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../admin-auth/password.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { permissionsForRoles } from '../authorization/staff-permissions';
import { AdminAccountActionsService } from './admin-account-actions.service';
import { CreateDashboardStaffDto, UpdatePlatformUserStatusDto } from './dto/admin-account-actions.dto';

describe('dashboard account actions', () => {
  const tx = {
    user: { findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    userSession: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
  const auth = { loadContext: jest.fn() };
  const passwords = { hash: jest.fn().mockResolvedValue('argon2-hash') };
  let service: AdminAccountActionsService;
  const dto: CreateDashboardStaffDto = {
    fullName: 'Test Staff',
    email: 'staff@example.com',
    mobile: '01012345678',
    password: 'StrongPass1234',
    roles: ['reviewer'],
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    auth.loadContext.mockResolvedValue({ roles: ['admin'], permissions: permissionsForRoles(['admin']) });
    tx.user.findFirst.mockResolvedValue({ accountStatus: 'active' });
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    tx.user.create.mockResolvedValue({ id: 22n });
    const module = await Test.createTestingModule({
      providers: [
        AdminAccountActionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwords },
        { provide: StaffAuthorizationService, useValue: auth },
      ],
    }).compile();
    service = module.get(AdminAccountActionsService);
  });

  it('suspends a platform user, revokes sessions, and audits without deleting data', async () => {
    await expect(service.updateUserStatus(1n, 2n, { accountStatus: 'suspended' })).resolves.toEqual({
      id: '2',
      accountStatus: 'suspended',
    });
    expect(tx.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 2n, revokedAt: null } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
  it('reactivates without reviving revoked sessions', async () => {
    await service.updateUserStatus(1n, 2n, { accountStatus: 'active' });
    expect(tx.userSession.updateMany).not.toHaveBeenCalled();
  });
  it('does not allow the platform-user endpoint to change staff', async () => {
    tx.user.findFirst.mockResolvedValue(null);
    await expect(service.updateUserStatus(1n, 2n, { accountStatus: 'suspended' })).rejects.toMatchObject({
      status: 404,
    });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });
  it('denies restricted staff before any write', async () => {
    auth.loadContext.mockResolvedValue({ roles: ['reviewer'], permissions: permissionsForRoles(['reviewer']) });
    await expect(service.createStaff(1n, dto)).rejects.toMatchObject({ status: 403 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('requires a super admin to grant full admin authority', async () => {
    await expect(service.createStaff(1n, { ...dto, roles: ['admin'] })).rejects.toMatchObject({ status: 403 });
    expect(passwords.hash).not.toHaveBeenCalled();
    auth.loadContext.mockResolvedValue({ roles: ['superAdmin'], permissions: permissionsForRoles(['superAdmin']) });
    await expect(service.createStaff(1n, { ...dto, roles: ['admin'] })).resolves.toMatchObject({ id: '22' });
  });
  it('persists real role memberships and hashed credentials without auditing the password', async () => {
    await service.createStaff(1n, dto);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mobileE164: '+201012345678',
        staffMemberships: { create: [{ staffRole: 'reviewer', status: 'active' }] },
        adminCredential: { create: expect.objectContaining({ passwordHash: 'argon2-hash' }) },
      }),
    });
    expect(
      JSON.stringify(tx.auditLog.create.mock.calls, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ).not.toContain(dto.password);
  });
  it('rejects unsupported roles, statuses, and invalid fields at the DTO boundary', async () => {
    expect(
      await validate(plainToInstance(CreateDashboardStaffDto, { ...dto, roles: ['superAdmin'] })),
    ).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdatePlatformUserStatusDto, { accountStatus: 'deleted' }))).not.toHaveLength(
      0,
    );
  });
});
