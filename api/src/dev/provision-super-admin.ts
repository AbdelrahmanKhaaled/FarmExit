import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import * as argon2 from 'argon2';
import { AccountStatus, StaffRole, type PrismaClient } from '../generated/prisma/client';
import { isProfileCompleted } from '../modules/auth/auth.errors';
import { normalizeDashboardEmail } from '../modules/admin-auth/dashboard-email';
import { isValidStoredEgyptianMobile, normalizeMobile } from '../modules/auth/phone-number';
import { permissionsForRoles } from '../modules/authorization/staff-permissions';

export class ProvisionSuperAdminError extends Error {
  constructor(
    readonly code:
      | 'PRODUCTION_FORBIDDEN'
      | 'INVALID_EMAIL'
      | 'INVALID_MOBILE'
      | 'INVALID_NAME'
      | 'MISSING_ARGUMENTS'
      | 'CONFIRMATION_REQUIRED'
      | 'INVALID_PASSWORD'
      | 'EMAIL_CONFLICT'
      | 'MOBILE_CONFLICT'
      | 'IDENTITY_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'ProvisionSuperAdminError';
  }
}

export type ProvisionSuperAdminInput = {
  email: string;
  mobile: string;
  fullName: string;
  password: string;
  confirm: boolean;
};

export type ProvisionSuperAdminResult = {
  userId: bigint;
  email: string;
  mobileE164: string;
  fullName: string;
  userCreated: boolean;
  credentialCreated: boolean;
  roles: StaffRole[];
  permissions: string[];
};

const ACTIVE = 'active';

export function assertDevelopmentProvisionAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new ProvisionSuperAdminError(
      'PRODUCTION_FORBIDDEN',
      'Super Admin provisioning CLI is disabled when NODE_ENV=production.',
    );
  }
}

export function parseProvisionSuperAdminArgv(argv: string[]): Omit<ProvisionSuperAdminInput, 'password'> {
  let email: string | undefined;
  let mobile: string | undefined;
  let fullName: string | undefined;
  let confirm = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' || arg === '-e') email = argv[++i];
    else if (arg === '--mobile' || arg === '-m') mobile = argv[++i];
    else if (arg === '--name' || arg === '--full-name' || arg === '-n') fullName = argv[++i];
    else if (arg === '--confirm') confirm = true;
    else if (arg === '--help' || arg === '-h') {
      throw new ProvisionSuperAdminError(
        'MISSING_ARGUMENTS',
        'Usage: provision-super-admin --email <email> --mobile <egyptian-mobile> --name "Full Name" --confirm',
      );
    }
  }
  if (!email?.trim() || !mobile?.trim() || !fullName?.trim()) {
    throw new ProvisionSuperAdminError(
      'MISSING_ARGUMENTS',
      '--email, --mobile, and --name are required. Use --confirm after reviewing conflicts.',
    );
  }
  if (!confirm) {
    throw new ProvisionSuperAdminError(
      'CONFIRMATION_REQUIRED',
      'Additional Super Admin provisioning requires --confirm. This will not modify unrelated users.',
    );
  }
  return { email: email.trim(), mobile: mobile.trim(), fullName: fullName.trim(), confirm };
}

export async function readMaskedPassword(prompt = 'Password: '): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input, output, terminal: true });
    const stdin = input;
    if (!stdin.isTTY) {
      rl.close();
      reject(new ProvisionSuperAdminError('MISSING_ARGUMENTS', 'Password must be entered on an interactive terminal.'));
      return;
    }
    let password = '';
    output.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          output.write('\n');
          rl.close();
          resolve(password);
          return;
        }
        if (char === '\u0003') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          rl.close();
          reject(new ProvisionSuperAdminError('MISSING_ARGUMENTS', 'Cancelled.'));
          return;
        }
        if (char === '\u007f' || char === '\b') {
          password = password.slice(0, -1);
          continue;
        }
        password += char;
      }
    };
    stdin.on('data', onData);
  });
}

/** Operator-chosen local passwords (min 8, mixed case + digit). Dashboard login accepts any stored hash. */
export function validateOperatorProvisionPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a digit.';
  return null;
}

async function hashPassword(password: string): Promise<string> {
  const policyError = validateOperatorProvisionPassword(password);
  if (policyError) throw new ProvisionSuperAdminError('INVALID_PASSWORD', policyError);
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function provisionAdditionalSuperAdmin(
  prisma: PrismaClient,
  input: ProvisionSuperAdminInput,
): Promise<ProvisionSuperAdminResult> {
  const email = normalizeDashboardEmail(input.email);
  if (!email) throw new ProvisionSuperAdminError('INVALID_EMAIL', `Invalid email: ${input.email}`);
  const mobileE164 = normalizeMobile(input.mobile);
  if (!mobileE164 || !isValidStoredEgyptianMobile(mobileE164)) {
    throw new ProvisionSuperAdminError('INVALID_MOBILE', `Invalid Egyptian mobile: ${input.mobile}`);
  }
  const fullName = input.fullName.trim();
  if (!isProfileCompleted({ fullName })) {
    throw new ProvisionSuperAdminError('INVALID_NAME', 'Full name must not be empty.');
  }
  if (!input.confirm) {
    throw new ProvisionSuperAdminError('CONFIRMATION_REQUIRED', '--confirm is required.');
  }

  const policyError = validateOperatorProvisionPassword(input.password);
  if (policyError) throw new ProvisionSuperAdminError('INVALID_PASSWORD', policyError);

  const credentialByEmail = await prisma.adminCredential.findUnique({ where: { email } });
  const userByMobile = await prisma.user.findUnique({ where: { mobileE164 } });
  const userByProfileEmail = await prisma.user.findFirst({ where: { email } });

  if (credentialByEmail) {
    const owner = await prisma.user.findUnique({ where: { id: credentialByEmail.userId } });
    if (owner?.mobileE164 !== mobileE164) {
      throw new ProvisionSuperAdminError(
        'EMAIL_CONFLICT',
        'Admin credential email is already registered to a different user/mobile. Stop and resolve manually.',
      );
    }
  }

  if (userByMobile && userByProfileEmail && userByMobile.id !== userByProfileEmail.id) {
    throw new ProvisionSuperAdminError(
      'IDENTITY_CONFLICT',
      'Mobile and profile email belong to different users. No changes were made.',
    );
  }

  if (userByMobile && credentialByEmail && userByMobile.id !== credentialByEmail.userId) {
    throw new ProvisionSuperAdminError(
      'MOBILE_CONFLICT',
      'Mobile is tied to a user that does not own this admin credential email.',
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    let user = userByMobile ?? userByProfileEmail ?? null;
    let userCreated = false;
    if (!user) {
      userCreated = true;
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
      if (user.mobileE164 !== mobileE164) {
        throw new ProvisionSuperAdminError(
          'MOBILE_CONFLICT',
          `User ${user.id.toString()} already exists with a different mobile. No changes were made.`,
        );
      }
      if (user.email && user.email !== email) {
        throw new ProvisionSuperAdminError(
          'EMAIL_CONFLICT',
          `User ${user.id.toString()} already has a different profile email. No changes were made.`,
        );
      }
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          fullName: user.fullName ?? fullName,
          email: user.email ?? email,
          accountStatus: AccountStatus.active,
        },
      });
    }

    const existingCredential = await tx.adminCredential.findUnique({ where: { userId: user.id } });
    let credentialCreated = false;
    if (existingCredential && existingCredential.email !== email) {
      throw new ProvisionSuperAdminError(
        'EMAIL_CONFLICT',
        'This user already has admin credentials for a different email.',
      );
    }
    if (!existingCredential) credentialCreated = true;

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
        mustChangePassword: false,
        passwordChangedAt: now,
      },
      update: {
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const roles = [StaffRole.superAdmin];
    return {
      userId: user.id,
      email,
      mobileE164,
      fullName: user.fullName ?? fullName,
      userCreated,
      credentialCreated,
      roles,
      permissions: permissionsForRoles(roles),
    };
  });
}
