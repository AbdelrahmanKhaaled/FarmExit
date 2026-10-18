import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { AccountStatus, StaffRole, type PrismaClient } from '../generated/prisma/client';
import { isProfileCompleted } from '../modules/auth/auth.errors';
import { normalizeMobile, isValidStoredEgyptianMobile } from '../modules/auth/phone-number';
import { normalizeDashboardEmail } from '../modules/admin-auth/dashboard-email';
import { validatePasswordPolicy } from '../modules/admin-auth/password-policy';
import { permissionsForRoles } from '../modules/authorization/staff-permissions';
import * as argon2 from 'argon2';

export class SuperAdminBootstrapError extends Error {
  constructor(
    readonly code:
      | 'PRODUCTION_FORBIDDEN'
      | 'INVALID_EMAIL'
      | 'INVALID_MOBILE'
      | 'MISSING_ARGUMENTS'
      | 'SUPER_ADMIN_ALREADY_EXISTS'
      | 'CONFIRMATION_REQUIRED'
      | 'INVALID_PASSWORD',
    message: string,
  ) {
    super(message);
    this.name = 'SuperAdminBootstrapError';
  }
}

export type SuperAdminBootstrapInput = {
  email: string;
  mobile: string;
  fullName?: string;
  resetPassword?: boolean;
  confirm?: boolean;
};

export type SuperAdminBootstrapResult = {
  userId: bigint;
  email: string;
  mobileE164: string;
  fullName: string;
  created: boolean;
  passwordReset: boolean;
  roles: StaffRole[];
  permissions: string[];
  generatedPassword?: string;
};

const ACTIVE = 'active';
const DEFAULT_FULL_NAME = 'FarmExit Super Admin';

export function assertDevelopmentSuperAdminBootstrapAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new SuperAdminBootstrapError(
      'PRODUCTION_FORBIDDEN',
      'Super Admin bootstrap is disabled when NODE_ENV=production.',
    );
  }
}

export function parseSuperAdminBootstrapArgv(argv: string[]): SuperAdminBootstrapInput {
  let email: string | undefined;
  let mobile: string | undefined;
  let fullName: string | undefined;
  let resetPassword = false;
  let confirm = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' || arg === '-e') email = argv[++i];
    else if (arg === '--mobile' || arg === '-m') mobile = argv[++i];
    else if (arg === '--name' || arg === '--full-name' || arg === '-n') fullName = argv[++i];
    else if (arg === '--reset-password') resetPassword = true;
    else if (arg === '--confirm') confirm = true;
    else if (arg === '--help' || arg === '-h') {
      throw new SuperAdminBootstrapError(
        'MISSING_ARGUMENTS',
        'Usage: super-admin-bootstrap --email <email> --mobile <egyptian-mobile> [--name "Full Name"] | --reset-password --email <email> --confirm',
      );
    }
  }
  if (!email?.trim()) {
    throw new SuperAdminBootstrapError('MISSING_ARGUMENTS', '--email is required.');
  }
  if (!resetPassword && !mobile?.trim()) {
    throw new SuperAdminBootstrapError(
      'MISSING_ARGUMENTS',
      '--mobile is required when provisioning a Super Admin (use a valid Egyptian mobile).',
    );
  }
  return {
    email: email.trim(),
    mobile: mobile?.trim() ?? '',
    fullName: fullName?.trim(),
    resetPassword,
    confirm,
  };
}

export async function countActiveSuperAdmins(prisma: Pick<PrismaClient, 'staffMembership'>): Promise<number> {
  return prisma.staffMembership.count({
    where: { staffRole: StaffRole.superAdmin, status: ACTIVE },
  });
}

export function generateSecurePassword(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${randomBytes(12).toString('base64url')}Aa1`;
    if (!validatePasswordPolicy(candidate)) return candidate;
  }
  throw new Error('Failed to generate a compliant password');
}

async function hashPassword(password: string): Promise<string> {
  const policyError = validatePasswordPolicy(password);
  if (policyError) throw new SuperAdminBootstrapError('INVALID_PASSWORD', policyError);
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function provisionSuperAdmin(
  prisma: PrismaClient,
  input: SuperAdminBootstrapInput,
): Promise<SuperAdminBootstrapResult> {
  const email = normalizeDashboardEmail(input.email);
  if (!email) {
    throw new SuperAdminBootstrapError('INVALID_EMAIL', `Invalid email: ${input.email}`);
  }
  const fullName = (input.fullName?.trim() || DEFAULT_FULL_NAME).trim();
  if (!isProfileCompleted({ fullName })) {
    throw new SuperAdminBootstrapError('INVALID_EMAIL', 'Full name must not be empty.');
  }

  const existingSuperAdmins = await countActiveSuperAdmins(prisma);
  const existingCredential = await prisma.adminCredential.findUnique({
    where: { email },
    include: { user: { include: { staffMemberships: true } } },
  });
  const existingSuperForEmail =
    existingCredential?.user.staffMemberships.some(
      (m) => m.staffRole === StaffRole.superAdmin && m.status === ACTIVE,
    ) ?? false;

  if (input.resetPassword) {
    if (!existingCredential || !existingSuperForEmail) {
      throw new SuperAdminBootstrapError(
        'INVALID_EMAIL',
        'No Super Admin dashboard credential exists for this email.',
      );
    }
    if (!input.confirm) {
      throw new SuperAdminBootstrapError(
        'CONFIRMATION_REQUIRED',
        'Password reset requires --confirm. This will invalidate existing dashboard sessions for that account.',
      );
    }
    const generatedPassword = generateSecurePassword();
    const passwordHash = await hashPassword(generatedPassword);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.adminCredential.update({
        where: { id: existingCredential.id },
        data: {
          passwordHash,
          passwordChangedAt: now,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          isActive: true,
        },
      });
      await tx.userSession.updateMany({
        where: { userId: existingCredential.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
    const roles = [StaffRole.superAdmin];
    return {
      userId: existingCredential.userId,
      email,
      mobileE164: existingCredential.user.mobileE164,
      fullName: existingCredential.user.fullName ?? fullName,
      created: false,
      passwordReset: true,
      roles,
      permissions: permissionsForRoles(roles),
      generatedPassword,
    };
  }

  if (existingCredential && !existingSuperForEmail) {
    throw new SuperAdminBootstrapError(
      'CONFIRMATION_REQUIRED',
      'Admin credentials already exist for this email without super_admin membership. Manual provisioning is required.',
    );
  }

  if (existingSuperAdmins > 0 && !existingSuperForEmail) {
    throw new SuperAdminBootstrapError(
      'SUPER_ADMIN_ALREADY_EXISTS',
      'An active Super Admin already exists. Bootstrap only creates the first Super Admin, or re-runs for the same email.',
    );
  }

  if (existingSuperForEmail) {
    const roles = [StaffRole.superAdmin];
    return {
      userId: existingCredential!.userId,
      email,
      mobileE164: existingCredential!.user.mobileE164,
      fullName: existingCredential!.user.fullName ?? fullName,
      created: false,
      passwordReset: false,
      roles,
      permissions: permissionsForRoles(roles),
    };
  }

  const mobileE164 = normalizeMobile(input.mobile);
  if (!mobileE164 || !isValidStoredEgyptianMobile(mobileE164)) {
    throw new SuperAdminBootstrapError('INVALID_MOBILE', `Invalid Egyptian mobile: ${input.mobile}`);
  }

  const userByMobile = await prisma.user.findUnique({ where: { mobileE164 } });
  const userByEmail = await prisma.user.findFirst({ where: { email } });
  if (userByMobile && userByEmail && userByMobile.id !== userByEmail.id) {
    throw new SuperAdminBootstrapError(
      'CONFIRMATION_REQUIRED',
      'Email and mobile belong to different users. Resolve the conflict before bootstrap.',
    );
  }
  if ((userByMobile || userByEmail) && !input.confirm) {
    throw new SuperAdminBootstrapError(
      'CONFIRMATION_REQUIRED',
      'A user with this email or mobile already exists. Pass --confirm to attach Super Admin credentials to that identity.',
    );
  }

  const generatedPassword = generateSecurePassword();
  const passwordHash = await hashPassword(generatedPassword);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let user = userByMobile ?? userByEmail;
    let created = false;
    if (!user) {
      created = true;
      user = await tx.user.create({
        data: {
          mobileE164,
          email,
          fullName,
          accountStatus: AccountStatus.active,
          mobileVerifiedAt: null,
        },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          fullName: user.fullName ?? fullName,
          email: user.email ?? email,
          accountStatus: AccountStatus.active,
        },
      });
    }

    await tx.staffMembership.upsert({
      where: { userId_staffRole: { userId: user.id, staffRole: StaffRole.superAdmin } },
      update: { status: ACTIVE },
      create: { userId: user.id, staffRole: StaffRole.superAdmin, status: ACTIVE },
    });

    await tx.adminCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: now,
      },
      update: {
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return { userId: user.id, fullName: user.fullName ?? fullName, mobileE164: user.mobileE164, created };
  });

  const roles = [StaffRole.superAdmin];
  return {
    userId: result.userId,
    email,
    mobileE164: result.mobileE164,
    fullName: result.fullName,
    created: result.created,
    passwordReset: false,
    roles,
    permissions: permissionsForRoles(roles),
    generatedPassword,
  };
}

export async function promptYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}
