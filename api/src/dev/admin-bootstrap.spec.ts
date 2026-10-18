import { StaffRole } from '../generated/prisma/enums';
import { createFakePrisma, type FakePrisma } from '../../test/support/fake-prisma';
import {
  AdminBootstrapError,
  assertDevelopmentBootstrapAllowed,
  countActiveAdmins,
  parseBootstrapArgv,
  provisionDevelopmentAdmin,
} from './admin-bootstrap';

describe('admin-bootstrap', () => {
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = createFakePrisma();
  });

  it('rejects production environment', () => {
    expect(() => assertDevelopmentBootstrapAllowed('production')).toThrow(AdminBootstrapError);
    expect(() => assertDevelopmentBootstrapAllowed('development')).not.toThrow();
  });

  it('parses mobile and name arguments', () => {
    expect(parseBootstrapArgv(['--mobile', '01012345678', '--name', 'Ops Lead'])).toEqual({
      mobile: '01012345678',
      fullName: 'Ops Lead',
    });
  });

  it('rejects missing arguments', () => {
    expect(() => parseBootstrapArgv(['--mobile', '01012345678'])).toThrow(AdminBootstrapError);
  });

  it('provisions the first admin with completed profile', async () => {
    const result = await provisionDevelopmentAdmin(prisma, {
      mobile: '01012345678',
      fullName: 'FarmExit Admin',
    });
    expect(result.mobileE164).toBe('+201012345678');
    expect(result.profileCompleted).toBe(true);
    expect(result.permissions).toContain('staff.manage');
    expect(await countActiveAdmins(prisma)).toBe(1);
  });

  it('is idempotent for the same mobile', async () => {
    const first = await provisionDevelopmentAdmin(prisma, {
      mobile: '01012345678',
      fullName: 'FarmExit Admin',
    });
    const second = await provisionDevelopmentAdmin(prisma, {
      mobile: '01012345678',
      fullName: 'FarmExit Admin',
    });
    expect(second.userId).toBe(first.userId);
    expect(await countActiveAdmins(prisma)).toBe(1);
    expect(prisma.user.rows).toHaveLength(1);
  });

  it('rejects a second admin mobile when one already exists', async () => {
    await provisionDevelopmentAdmin(prisma, { mobile: '01012345678', fullName: 'First Admin' });
    await expect(
      provisionDevelopmentAdmin(prisma, { mobile: '01098765432', fullName: 'Second Admin' }),
    ).rejects.toMatchObject({ code: 'ADMIN_ALREADY_EXISTS' });
  });

  it('reuses an existing user and adds admin membership', async () => {
    const owner = await prisma.user.create({
      data: {
        mobileE164: '+201055566677',
        fullName: 'Existing Owner',
        accountStatus: 'active',
        mobileVerifiedAt: new Date(),
      },
    });
    const result = await provisionDevelopmentAdmin(prisma, {
      mobile: '01055566677',
      fullName: 'Existing Owner',
    });
    expect(result.userId).toBe(owner.id);
    expect(result.userCreated).toBe(false);
    const membership = prisma.staffMembership.rows.find(
      (r) => r.userId === owner.id && r.staffRole === StaffRole.admin,
    );
    expect(membership).toBeDefined();
  });

  it('rejects invalid mobile', async () => {
    await expect(
      provisionDevelopmentAdmin(prisma, { mobile: 'not-a-phone', fullName: 'X' }),
    ).rejects.toMatchObject({ code: 'INVALID_MOBILE' });
  });
});
