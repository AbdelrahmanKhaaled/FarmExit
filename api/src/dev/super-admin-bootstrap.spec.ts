import { StaffRole } from '../generated/prisma/enums';
import { createFakePrisma, type FakePrisma } from '../../test/support/fake-prisma';
import {
  assertDevelopmentSuperAdminBootstrapAllowed,
  countActiveSuperAdmins,
  generateSecurePassword,
  parseSuperAdminBootstrapArgv,
  provisionSuperAdmin,
  SuperAdminBootstrapError,
} from './super-admin-bootstrap';
import { validatePasswordPolicy } from '../modules/admin-auth/password-policy';

describe('super-admin-bootstrap', () => {
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = createFakePrisma();
  });

  it('rejects production environment', () => {
    expect(() => assertDevelopmentSuperAdminBootstrapAllowed('production')).toThrow(SuperAdminBootstrapError);
  });

  it('parses email and mobile arguments', () => {
    expect(
      parseSuperAdminBootstrapArgv(['--email', 'superadmin@farmexit.test', '--mobile', '01012345678']),
    ).toEqual({
      email: 'superadmin@farmexit.test',
      mobile: '01012345678',
      fullName: undefined,
      resetPassword: false,
      confirm: false,
    });
  });

  it('requires mobile for initial provisioning', () => {
    expect(() => parseSuperAdminBootstrapArgv(['--email', 'superadmin@farmexit.test'])).toThrow(
      SuperAdminBootstrapError,
    );
  });

  it('creates exactly one super admin with admin credentials', async () => {
    const result = await provisionSuperAdmin(prisma, {
      email: 'superadmin@farmexit.test',
      mobile: '01012345678',
    });
    expect(result.created).toBe(true);
    expect(result.mobileE164).toBe('+201012345678');
    expect(result.roles).toContain(StaffRole.superAdmin);
    expect(result.generatedPassword).toBeDefined();
    expect(validatePasswordPolicy(result.generatedPassword!)).toBeNull();
    expect(await countActiveSuperAdmins(prisma)).toBe(1);
  });

  it('is idempotent for the same super admin email', async () => {
    await provisionSuperAdmin(prisma, {
      email: 'superadmin@farmexit.test',
      mobile: '01012345678',
    });
    const second = await provisionSuperAdmin(prisma, {
      email: 'superadmin@farmexit.test',
      mobile: '01012345678',
    });
    expect(second.created).toBe(false);
    expect(second.generatedPassword).toBeUndefined();
    expect(await countActiveSuperAdmins(prisma)).toBe(1);
  });

  it('refuses a second super admin for a different email', async () => {
    await provisionSuperAdmin(prisma, {
      email: 'superadmin@farmexit.test',
      mobile: '01012345678',
    });
    await expect(
      provisionSuperAdmin(prisma, { email: 'other@farmexit.test', mobile: '01098765432' }),
    ).rejects.toMatchObject({
      code: 'SUPER_ADMIN_ALREADY_EXISTS',
    });
  });

  it('generates compliant passwords', () => {
    for (let i = 0; i < 5; i++) {
      expect(validatePasswordPolicy(generateSecurePassword())).toBeNull();
    }
  });
});
