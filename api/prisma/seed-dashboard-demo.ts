import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { toMariaDbPoolConfig } from '../src/prisma/database-url';
import { isValidStoredEgyptianMobile } from '../src/modules/auth/phone-number';
import { applyDashboardDemo, countDemoRecords, manifestPath } from './seed-dashboard-demo-apply';
import { assertDashboardDemoSeedEnvironment, redactedDatabaseTarget } from './seed-dashboard-demo-safety';
import { buildDemoPlan, DEMO_TAG, REQ_PREFIX, STAFF_MOBILE, demoMobile } from './seed-dashboard-demo-plan';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const backupOnly = args.has('--backup-only');
const dryRun = args.has('--dry-run') || (!apply && !backupOnly);
const confirmed = args.has('--confirm');

function usage(): void {
  console.log(`
FarmExit dashboard demo seed (local MySQL "farmexit" only).

  npx tsx prisma/seed-dashboard-demo.ts              # dry-run (default)
  npx tsx prisma/seed-dashboard-demo.ts --dry-run
  npx tsx prisma/seed-dashboard-demo.ts --apply --confirm

Never use --apply without --confirm.
`);
}

async function preflightCounts(prisma: PrismaClient) {
  const [users, farms, requests, adminCreds] = await Promise.all([
    prisma.user.count(),
    prisma.farm.count(),
    prisma.request.count(),
    prisma.adminCredential.count().catch(() => -1),
  ]);
  return { users, farms, requests, adminCreds };
}

function resolveMysqldump(): string {
  const fromEnv = process.env.MYSQLDUMP_PATH;
  if (fromEnv) return fromEnv;
  const candidates = [
    'mysqldump',
    'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysqldump.exe',
    'C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin\\mysqldump.exe',
  ];
  for (const bin of candidates) {
    if (bin !== 'mysqldump' && existsSync(bin)) return bin;
  }
  return 'mysqldump';
}

function tryBackup(databaseUrl: string, required: boolean): string | null {
  const cfg = toMariaDbPoolConfig(databaseUrl);
  const dir = join(process.cwd(), 'prisma', 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = join(dir, `farmexit-pre-dashboard-demo-${stamp}.sql`);
  const dumpBin = resolveMysqldump();
  const quotedBin = dumpBin.includes(' ') ? `"${dumpBin}"` : dumpBin;
  try {
    const sql = execSync(
      `${quotedBin} --host=${cfg.host} --port=${cfg.port} --user=${cfg.user} ${cfg.database}`,
      {
        env: { ...process.env, MYSQL_PWD: cfg.password },
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
      },
    );
    if (!sql || sql.length < 500) {
      throw new Error('mysqldump output too small');
    }
    writeFileSync(out, sql, 'utf8');
    return out;
  } catch (err) {
    if (required) {
      throw new Error(
        `Mandatory database backup failed (set MYSQLDUMP_PATH to Laragon mysqldump.exe). ${String(err)}`,
      );
    }
    console.warn('⚠️  mysqldump unavailable; skip file backup (manual backup recommended).');
    return null;
  }
}

async function main() {
  if (args.has('--help') || args.has('-h')) {
    usage();
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured in api/.env');

  const safety = assertDashboardDemoSeedEnvironment(databaseUrl);
  console.log('Database target:', redactedDatabaseTarget(databaseUrl));
  console.log('NODE_ENV:', safety.nodeEnv);

  const plan = buildDemoPlan();
  console.log('\n--- Dry-run plan ---');
  console.log('Tag:', DEMO_TAG);
  console.log('Request prefix:', REQ_PREFIX);
  console.log('Targets:', plan);
  console.log('Staff mobile (synthetic):', STAFF_MOBILE);
  console.log('Sample user mobile:', demoMobile(1), isValidStoredEgyptianMobile(demoMobile(1)) ? '✓' : '✗');

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(toMariaDbPoolConfig(databaseUrl)),
  });

  try {
    let dbReachable = true;
    try {
      const before = await preflightCounts(prisma);
      console.log('\n--- Existing DB snapshot (preserved) ---');
      console.log({
        users: before.users,
        farms: before.farms,
        requests: before.requests,
        adminCredentials: before.adminCreds,
      });
      const existingDemo = await countDemoRecords(prisma);
      console.log('Existing demo-tagged rows:', existingDemo);
    } catch (err) {
      dbReachable = false;
      console.warn('\n⚠️  Database unreachable (start Laragon MySQL for counts/apply).');
      if (!dryRun) throw err;
    }

    if (backupOnly) {
      const backupPath = tryBackup(databaseUrl, true);
      console.log('\n✅ Backup complete (no seed writes).');
      console.log('Backup written:', backupPath);
      return;
    }

    if (dryRun) {
      console.log('\n✅ Dry-run complete. No writes performed.');
      if (!dbReachable) console.log('(Reconnect MySQL before --apply.)');
      console.log('To apply: npm run seed:dashboard-demo -- --apply --confirm');
      return;
    }

    if (!confirmed) {
      throw new Error('Refusing --apply without --confirm (operator acknowledgement required).');
    }

    const backupPath = tryBackup(databaseUrl, true);
    console.log('Backup written:', backupPath);

    console.log('\nApplying dashboard demo seed...');
    const manifest = await applyDashboardDemo(prisma);
    const after = await countDemoRecords(prisma);
    console.log('\n✅ Apply complete.');
    console.log('Manifest:', manifestPath());
    console.log('Counts:', after);
    console.log('Manifest summary:', {
      users: manifest.users.length,
      farms: manifest.farms.length,
      requests: manifest.requests.length,
      coPurchaseGroups: manifest.coPurchaseGroups.length,
      communicationCases: manifest.communicationCases.length,
      evaluations: manifest.evaluations.length,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
