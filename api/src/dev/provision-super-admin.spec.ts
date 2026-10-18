import { StaffRole } from '../generated/prisma/enums';
import { createFakePrisma, type FakePrisma } from '../../test/support/fake-prisma';
import {
  parseProvisionSuperAdminArgv,
  provisionAdditionalSuperAdmin,
  ProvisionSuperAdminError,
  validateOperatorProvisionPassword,
} from './provision-super-admin';
describe('provision-super-admin', () => {
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = createFakePrisma();
  });

  it('requires confirm flag', () => {
    expect(() =>
      parseProvisionSuperAdminArgv(['--email', 'a@b.com', '--mobile', '01012345678', '--name', 'A']),
    ).toThrow(ProvisionSuperAdminError);
  });

  it('creates an additional super admin with credentials', async () => {
    const result = await provisionAdditionalSuperAdmin(prisma, {
      email: 'second@farmexit.test',
      mobile: '01022222222',
      fullName: 'Second',
      password: 'Abdo&12345',
      confirm: true,
    });
    expect(result.roles).toContain(StaffRole.superAdmin);
    expect(result.credentialCreated).toBe(true);
  });

  it('accepts operator password policy', () => {
    expect(validateOperatorProvisionPassword('Abdo&1234')).toBeNull();
  });
});
