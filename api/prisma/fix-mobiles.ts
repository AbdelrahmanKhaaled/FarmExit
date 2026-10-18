import 'dotenv/config';
import { join } from 'node:path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { toMariaDbPoolConfig } from '../src/prisma/database-url';
import {
  FixMobilesError,
  applyMobileFixPlan,
  assertFixMobilesEnvironment,
  buildMobileFixPlan,
  loadUsersWithStaff,
  parseFixMobilesArgv,
  summarizePlan,
  validateAllUserMobiles,
  writeMobileFixBackup,
} from '../src/dev/fix-mobiles';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in api/.env');
  process.exit(1);
}

assertFixMobilesEnvironment(process.env.NODE_ENV);

const { apply } = parseFixMobilesArgv(process.argv.slice(2));

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(toMariaDbPoolConfig(databaseUrl)),
});

function printPlan(rows: ReturnType<typeof buildMobileFixPlan>) {
  console.log('');
  console.log('User ID | Admin | Current mobile | Proposed mobile | Action');
  console.log('--------|-------|----------------|-----------------|-------');
  for (const row of rows) {
    if (row.action === 'keep') continue;
    console.log(
      `${row.userId.padEnd(7)} | ${row.isAdmin ? 'yes' : 'no '} | ${row.currentMobile} | ${row.proposedMobile ?? '(unchanged)'} | ${row.action}${row.note ? ` — ${row.note}` : ''}`,
    );
  }
}

async function main() {
  const users = await loadUsersWithStaff(prisma);
  const plan = buildMobileFixPlan(users);
  const summary = summarizePlan(plan);

  console.log('FarmExit dev:fix-mobiles (dry-run unless --apply --confirm)');
  console.log(`  Users scanned:     ${summary.scanned}`);
  console.log(`  Valid mobiles:     ${summary.valid}`);
  console.log(`  Invalid / other:   ${summary.invalid}`);
  console.log(`  Auto-fix proposed: ${summary.toApply}`);
  console.log(`  Manual review:     ${summary.manualReview}`);

  printPlan(plan);

  if (!apply) {
    if (summary.toApply > 0) {
      console.log('\nNo changes written. Re-run with --apply --confirm to apply after review.');
    }
    return;
  }

  if (summary.toApply === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  const backupPath = writeMobileFixBackup(join(process.cwd(), 'backups'), users);
  console.log(`\nBackup written: ${backupPath}`);

  const { updated } = await applyMobileFixPlan(prisma, plan);
  console.log(`\nApplied ${updated.length} mobile correction(s):`);
  for (const row of updated) {
    console.log(`  user ${row.userId}: ${row.currentMobile} → ${row.proposedMobile} (${row.action})`);
  }

  const validation = await validateAllUserMobiles(prisma);
  console.log('\nPost-check:');
  console.log(`  All mobiles valid E.164 Egyptian: ${validation.allValid}`);
  if (validation.duplicates.length) console.log(`  Duplicates: ${validation.duplicates.join(', ')}`);
  if (validation.invalid.length) console.log(`  Still invalid: ${validation.invalid.join(', ')}`);

  const admins = await prisma.staffMembership.count({
    where: { staffRole: 'admin', status: 'active' },
  });
  const usersCount = await prisma.user.count();
  const farms = await prisma.farmRelationship.count();
  console.log(`  Users: ${usersCount}, active admins: ${admins}, farm relationships: ${farms}`);
  console.log('  Sessions/OTPs for updated users were revoked/consumed.');
}

main()
  .catch((error: unknown) => {
    if (error instanceof FixMobilesError) {
      console.error(`fix-mobiles failed [${error.code}]: ${error.message}`);
      process.exit(1);
    }
    console.error('fix-mobiles failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
