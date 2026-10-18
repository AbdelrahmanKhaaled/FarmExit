import { AccountStatus, StaffRole, type PrismaClient } from '../generated/prisma/client';
import { normalizeMobile } from '../modules/auth/phone-number';
import { isProfileCompleted } from '../modules/auth/auth.errors';
import { permissionsForRoles } from '../modules/authorization/staff-permissions';

export class AdminBootstrapError extends Error {
  constructor(
    readonly code:
      | 'PRODUCTION_FORBIDDEN'
      | 'INVALID_MOBILE'
      | 'INVALID_NAME'
      | 'MISSING_ARGUMENTS'
      | 'ADMIN_ALREADY_EXISTS',
    message: string,
  ) {
    super(message);
    this.name = 'AdminBootstrapError';
  }
}

export type AdminBootstrapInput = {
  mobile: string;
  fullName: string;
};

export type AdminBootstrapResult = {
  userId: bigint;
  mobileE164: string;
  fullName: string;
  userCreated: boolean;
  membershipUpserted: boolean;
  profileCompleted: boolean;
  roles: StaffRole[];
  permissions: string[];
};

const ACTIVE = 'active';

export function assertDevelopmentBootstrapAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new AdminBootstrapError(
      'PRODUCTION_FORBIDDEN',
      'Admin bootstrap is disabled when NODE_ENV=production.',
    );
  }
}

export function parseBootstrapArgv(argv: string[]): AdminBootstrapInput {
  let mobile: string | undefined;
  let fullName: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--mobile' || arg === '-m') mobile = argv[++i];
    else if (arg === '--name' || arg === '--full-name' || arg === '-n') fullName = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      throw new AdminBootstrapError(
        'MISSING_ARGUMENTS',
        'Usage: admin-bootstrap --mobile <number> --name "<Full Name>"',
      );
    }
  }
  if (!mobile?.trim() || !fullName?.trim()) {
    throw new AdminBootstrapError(
      'MISSING_ARGUMENTS',
      'Both --mobile and --name are required. Example: --mobile 01012345678 --name "FarmExit Admin"',
    );
  }
  return { mobile: mobile.trim(), fullName: fullName.trim() };
}

export async function countActiveAdmins(prisma: Pick<PrismaClient, 'staffMembership'>): Promise<number> {
  return prisma.staffMembership.count({
    where: { staffRole: StaffRole.admin, status: ACTIVE },
  });
}

async function userIsActiveAdmin(
  prisma: Pick<PrismaClient, 'staffMembership'>,
  userId: bigint,
): Promise<boolean> {
  const row = await prisma.staffMembership.findFirst({
    where: { userId, staffRole: StaffRole.admin, status: ACTIVE },
  });
  return row !== null;
}

/**
 * Provisions the first development admin (or re-runs safely for the same mobile).
 * Does not create a second admin for a different mobile when one already exists.
 */
export async function provisionDevelopmentAdmin(
  prisma: PrismaClient,
  input: AdminBootstrapInput,
): Promise<AdminBootstrapResult> {
  const mobileE164 = normalizeMobile(input.mobile);
  if (!mobileE164) {
    throw new AdminBootstrapError('INVALID_MOBILE', `Invalid mobile number: ${input.mobile}`);
  }
  const fullName = input.fullName.trim();
  if (!isProfileCompleted({ fullName })) {
    throw new AdminBootstrapError('INVALID_NAME', 'Full name must not be empty.');
  }

  const existingAdmins = await countActiveAdmins(prisma);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { mobileE164 } });
    let userCreated = false;

    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          fullName,
          accountStatus: AccountStatus.active,
          mobileVerifiedAt: user.mobileVerifiedAt ?? now,
        },
      });
    } else {
      userCreated = true;
      user = await tx.user.create({
        data: {
          mobileE164,
          fullName,
          accountStatus: AccountStatus.active,
          mobileVerifiedAt: now,
        },
      });
    }

    const alreadyAdmin = await userIsActiveAdmin(tx, user.id);
    if (existingAdmins > 0 && !alreadyAdmin) {
      throw new AdminBootstrapError(
        'ADMIN_ALREADY_EXISTS',
        'An active FarmExit admin already exists. Bootstrap only provisions the first admin, or re-runs for the same mobile.',
      );
    }

    await tx.staffMembership.upsert({
      where: { userId_staffRole: { userId: user.id, staffRole: StaffRole.admin } },
      update: { status: ACTIVE },
      create: { userId: user.id, staffRole: StaffRole.admin, status: ACTIVE },
    });

    const roles = [StaffRole.admin];
    return {
      userId: user.id,
      mobileE164,
      fullName: user.fullName ?? fullName,
      userCreated,
      membershipUpserted: true,
      profileCompleted: isProfileCompleted(user),
      roles,
      permissions: permissionsForRoles(roles),
    };
  });
}
