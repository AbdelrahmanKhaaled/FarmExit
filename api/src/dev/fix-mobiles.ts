import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { StaffRole, type PrismaClient } from '../generated/prisma/client';
import { normalizeMobile } from '../modules/auth/phone-number';

const EGYPT_STORED = /^\+201[0125]\d{8}$/;

/** Reserved dev-only replacements: 010990xxxxx → +2010990xxxxx */
const SYNTHETIC_BASE = 990_000_01n;

export class FixMobilesError extends Error {
  constructor(
    readonly code: 'PRODUCTION_FORBIDDEN' | 'NOT_DEVELOPMENT' | 'CONFIRM_REQUIRED' | 'DUPLICATE_PLAN',
    message: string,
  ) {
    super(message);
    this.name = 'FixMobilesError';
  }
}

export function assertFixMobilesEnvironment(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new FixMobilesError('PRODUCTION_FORBIDDEN', 'dev:fix-mobiles is disabled when NODE_ENV=production.');
  }
  if (nodeEnv !== 'development') {
    throw new FixMobilesError('NOT_DEVELOPMENT', 'dev:fix-mobiles only runs when NODE_ENV=development.');
  }
}

export function isStoredEgyptianMobileValid(mobileE164: string): boolean {
  return EGYPT_STORED.test(mobileE164);
}

/** True for seed/demo accounts that may receive synthetic test numbers. */
export function isSyntheticDevUser(user: {
  fullName: string | null;
  email: string | null;
  mobileE164: string;
}): boolean {
  if (user.fullName?.includes('[DEMO]')) return true;
  if (user.email?.toLowerCase().endsWith('@example.test')) return true;
  if (/^\+20100000000[1-9]$/.test(user.mobileE164)) return true;
  if (/^\+2010990\d{5}$/.test(user.mobileE164)) return true;
  return false;
}

export type UserRow = {
  id: bigint;
  fullName: string | null;
  email: string | null;
  mobileE164: string;
  staffRoles: StaffRole[];
};

export type MobileFixAction = 'keep' | 'normalize' | 'replace_synthetic' | 'manual_review';

export type MobileFixPlanRow = {
  userId: string;
  fullName: string | null;
  currentMobile: string;
  proposedMobile: string | null;
  action: MobileFixAction;
  isAdmin: boolean;
  note?: string;
};

export function buildMobileFixPlan(users: UserRow[]): MobileFixPlanRow[] {
  const sorted = [...users].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const taken = new Set(sorted.filter((u) => isStoredEgyptianMobileValid(u.mobileE164)).map((u) => u.mobileE164));
  let syntheticSerial = 0n;

  const plan: MobileFixPlanRow[] = [];

  for (const user of sorted) {
    const isAdmin = user.staffRoles.includes(StaffRole.admin);
    if (isStoredEgyptianMobileValid(user.mobileE164)) {
      plan.push({
        userId: user.id.toString(),
        fullName: user.fullName,
        currentMobile: user.mobileE164,
        proposedMobile: user.mobileE164,
        action: 'keep',
        isAdmin,
      });
      continue;
    }

    const normalized = normalizeMobile(user.mobileE164);
    if (normalized && isStoredEgyptianMobileValid(normalized)) {
      if (!isSyntheticDevUser(user) && user.fullName && !user.fullName.includes('[DEMO]')) {
        plan.push({
          userId: user.id.toString(),
          fullName: user.fullName,
          currentMobile: user.mobileE164,
          proposedMobile: null,
          action: 'manual_review',
          isAdmin,
          note: 'Non-synthetic account: normalize only after authorized manual review.',
        });
        continue;
      }
      plan.push({
        userId: user.id.toString(),
        fullName: user.fullName,
        currentMobile: user.mobileE164,
        proposedMobile: normalized,
        action: 'normalize',
        isAdmin,
      });
      taken.add(normalized);
      continue;
    }

    if (!isSyntheticDevUser(user)) {
      plan.push({
        userId: user.id.toString(),
        fullName: user.fullName,
        currentMobile: user.mobileE164,
        proposedMobile: null,
        action: 'manual_review',
        isAdmin,
        note: 'Non-synthetic account: invalid mobile kept unchanged.',
      });
      continue;
    }

    let proposed: string | null = null;
    while (!proposed) {
      const serial = SYNTHETIC_BASE + syntheticSerial;
      syntheticSerial += 1n;
      if (serial > 999_999_99n) {
        throw new FixMobilesError('DUPLICATE_PLAN', 'Exhausted synthetic mobile number pool.');
      }
      const national = `010${serial.toString().padStart(8, '0')}`;
      const candidate = normalizeMobile(national);
      if (!candidate || taken.has(candidate)) continue;
      proposed = candidate;
      taken.add(candidate);
    }

    plan.push({
      userId: user.id.toString(),
      fullName: user.fullName,
      currentMobile: user.mobileE164,
      proposedMobile: proposed,
      action: 'replace_synthetic',
      isAdmin,
      note: 'Synthetic dev test number (not the original contact).',
    });
  }

  const proposedMobiles = plan
    .filter((r) => r.proposedMobile && r.action !== 'keep')
    .map((r) => r.proposedMobile!);
  if (new Set(proposedMobiles).size !== proposedMobiles.length) {
    throw new FixMobilesError('DUPLICATE_PLAN', 'Plan would create duplicate mobile numbers.');
  }

  return plan;
}

export type FixMobilesSummary = {
  scanned: number;
  valid: number;
  invalid: number;
  toApply: number;
  manualReview: number;
};

export function summarizePlan(plan: MobileFixPlanRow[]): FixMobilesSummary {
  const valid = plan.filter((r) => r.action === 'keep').length;
  const manualReview = plan.filter((r) => r.action === 'manual_review').length;
  const toApply = plan.filter((r) => r.action === 'normalize' || r.action === 'replace_synthetic').length;
  return {
    scanned: plan.length,
    valid,
    invalid: plan.length - valid,
    toApply,
    manualReview,
  };
}

export function writeMobileFixBackup(dir: string, users: UserRow[]): string {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(dir, `users-mobile-backup-${stamp}.json`);
  writeFileSync(
    path,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        users: users.map((u) => ({
          id: u.id.toString(),
          fullName: u.fullName,
          email: u.email,
          mobileE164: u.mobileE164,
          staffRoles: u.staffRoles,
        })),
      },
      null,
      2,
    ),
    'utf8',
  );
  return path;
}

export async function loadUsersWithStaff(prisma: PrismaClient): Promise<UserRow[]> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      mobileE164: true,
      staffMemberships: { select: { staffRole: true, status: true } },
    },
    orderBy: { id: 'asc' },
  });
  return rows.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    mobileE164: u.mobileE164,
    staffRoles: u.staffMemberships.filter((m) => m.status === 'active').map((m) => m.staffRole),
  }));
}

export async function applyMobileFixPlan(
  prisma: PrismaClient,
  plan: MobileFixPlanRow[],
): Promise<{ updated: MobileFixPlanRow[] }> {
  const toUpdate = plan.filter((r) => r.action === 'normalize' || r.action === 'replace_synthetic');
  const updated: MobileFixPlanRow[] = [];

  await prisma.$transaction(async (tx) => {
    for (const row of toUpdate) {
      if (!row.proposedMobile) continue;
      const userId = BigInt(row.userId);
      const oldMobile = row.currentMobile;
      await tx.user.update({
        where: { id: userId },
        data: { mobileE164: row.proposedMobile },
      });
      const now = new Date();
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.otpVerification.updateMany({
        where: {
          consumedAt: null,
          OR: [{ userId }, { mobileE164: oldMobile }],
        },
        data: { consumedAt: now },
      });
      updated.push(row);
    }
  });

  return { updated };
}

export async function validateAllUserMobiles(prisma: PrismaClient): Promise<{
  allValid: boolean;
  duplicates: string[];
  invalid: string[];
}> {
  const users = await prisma.user.findMany({ select: { mobileE164: true } });
  const invalid = users.filter((u) => !isStoredEgyptianMobileValid(u.mobileE164)).map((u) => u.mobileE164);
  const counts = new Map<string, number>();
  for (const u of users) counts.set(u.mobileE164, (counts.get(u.mobileE164) ?? 0) + 1);
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([m]) => m);
  return { allValid: invalid.length === 0 && duplicates.length === 0, duplicates, invalid };
}

export function parseFixMobilesArgv(argv: string[]): { apply: boolean; confirm: boolean } {
  const apply = argv.includes('--apply');
  const confirm = argv.includes('--confirm');
  if (apply && !confirm) {
    throw new FixMobilesError('CONFIRM_REQUIRED', 'Pass both --apply and --confirm to modify the database.');
  }
  return { apply, confirm };
}
