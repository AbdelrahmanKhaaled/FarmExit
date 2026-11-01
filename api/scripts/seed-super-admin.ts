/** Explicit, interactive production operation. Never import from application startup or migrations. */
import 'dotenv/config';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AccountStatus, Prisma, PrismaClient, StaffRole } from '../src/generated/prisma/client.js';
import { toMariaDbPoolConfig } from '../src/prisma/database-url.js';
import { PasswordService } from '../src/modules/admin-auth/password.service.js';
import { isValidStoredEgyptianMobile, normalizeMobile } from '../src/modules/auth/phone-number.js';

const EMAIL = 'abdo@farmexit.com';

// No readline interface is attached while receiving the password: nothing echoes it.
async function hiddenPassword(label: string): Promise<string> {
  stdout.write(label);
  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.removeListener('end', onEnd);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write('\n');
    };
    const onEnd = () => {
      cleanup();
      reject(new Error('Input closed; cancelled.'));
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003' || char === '\u0004') {
          cleanup();
          reject(new Error('Cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ' && char !== '\u007f') value += char;
      }
    };
    stdin.on('data', onData);
    stdin.once('end', onEnd);
  });
}

async function question(label: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  rl.on('SIGINT', () => rl.close());
  try {
    return (await rl.question(label)).trim();
  } finally {
    rl.close();
  }
}

async function inspect(db: Prisma.TransactionClient): Promise<bigint | null> {
  const user = await db.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, accountStatus: true, mobileE164: true },
  });
  const credential = await db.adminCredential.findUnique({
    where: { email: EMAIL },
    select: { userId: true, isActive: true, lockedUntil: true },
  });
  if (!user && !credential) return null;
  const membership =
    user &&
    (await db.staffMembership.findUnique({
      where: { userId_staffRole: { userId: user.id, staffRole: StaffRole.superAdmin } },
      select: { status: true },
    }));
  if (
    !user ||
    credential?.userId !== user.id ||
    !credential.isActive ||
    (credential.lockedUntil && credential.lockedUntil > new Date()) ||
    user.accountStatus !== AccountStatus.active ||
    !isValidStoredEgyptianMobile(user.mobileE164) ||
    membership?.status !== 'active'
  ) {
    throw new Error(
      'Existing email/account is incomplete, conflicting, disabled, or locked. No records changed; resolve manually.',
    );
  }
  return user.id;
}

async function main(): Promise<void> {
  if (process.argv.length > 2) throw new Error('No CLI arguments accepted. Enter information interactively.');
  if (!stdin.isTTY || !stdout.isTTY)
    throw new Error('An interactive terminal is required (no redirected input/output).');
  if (process.env.NODE_ENV !== 'production')
    throw new Error('Run only on the production server with NODE_ENV=production.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL must be configured in the production environment.');
  let config: ReturnType<typeof toMariaDbPoolConfig>;
  try {
    config = toMariaDbPoolConfig(url);
  } catch {
    throw new Error('Invalid production DATABASE_URL; expected mysql:// with a database name.');
  }
  console.log(`Production database: ${config.host}:${config.port}/${config.database}`);
  console.log(`Create-only Super Admin: ${EMAIL}. Run on the production server only.`);
  const confirmation = `CREATE ${EMAIL} IN ${config.database}`;
  if (
    (await question(`Confirm this is the intended PRODUCTION database by typing "${confirmation}": `)) !== confirmation
  ) {
    throw new Error('Production database confirmation did not match; cancelled.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(config) });
  try {
    const existingId = await inspect(prisma);
    if (existingId !== null) {
      console.log(
        `Verified existing account ${existingId}: active user, active superAdmin membership, enabled Dashboard Credential. No changes made.`,
      );
      return;
    }
    const fullName = await question('Real full name: ');
    if (!fullName || fullName.length > 150) throw new Error('Full name must contain 1–150 characters.');
    const mobileE164 = normalizeMobile(await question('Real, unique Egyptian mobile number (e.g. +20…): '));
    if (!mobileE164 || !isValidStoredEgyptianMobile(mobileE164))
      throw new Error('A valid Egyptian mobile number is required for Dashboard login.');
    if (await prisma.user.findUnique({ where: { mobileE164 }, select: { id: true } })) {
      throw new Error('Mobile number already belongs to an account. No changes made.');
    }
    const passwords = new PasswordService();
    let password = await hiddenPassword('NEW password (hidden; 12–256 characters, uppercase, lowercase, digit): ');
    let confirmationPassword = await hiddenPassword('Confirm NEW password (hidden): ');
    if (password !== confirmationPassword) throw new Error('Passwords do not match.');
    if (password.length > 256) throw new Error('Password must be at most 256 characters (Dashboard login limit).');
    const passwordHash = await passwords.hash(password);
    if (!(await passwords.verify(passwordHash, password))) throw new Error('Password hash verification failed.');
    password = '';
    confirmationPassword = '';

    const result = await prisma.$transaction(async (tx) => {
      const racedId = await inspect(tx);
      if (racedId !== null) return { id: racedId, created: false };
      // Unique indexes also protect against concurrent invocations; any conflict rolls back all three records.
      const user = await tx.user.create({
        data: { email: EMAIL, fullName, mobileE164, accountStatus: AccountStatus.active },
        select: { id: true },
      });
      await tx.staffMembership.create({ data: { userId: user.id, staffRole: StaffRole.superAdmin, status: 'active' } });
      await tx.adminCredential.create({
        data: {
          userId: user.id,
          email: EMAIL,
          passwordHash,
          isActive: true,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        select: { id: true },
      });
      if ((await inspect(tx)) !== user.id) throw new Error('Account verification failed; transaction rolled back.');
      return { id: user.id, created: true };
    });
    if ((await inspect(prisma)) !== result.id)
      throw new Error('Post-commit verification failed; inspect the account manually before retrying.');
    console.log(
      `${result.created ? 'Created and verified' : 'Verified existing'} account ${result.id}: active user, active superAdmin membership, enabled Dashboard Credential.`,
    );
    if (!result.created)
      console.log(
        'Concurrent creation detected. Existing password and roles were preserved; entered password was not applied.',
      );
    console.log(`Login: https://farm-exit-xcmz.vercel.app/en/admin/login (email: ${EMAIL})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Never print raw Prisma/driver exceptions: they may contain connection or query details.
  console.error(
    error instanceof Error && error.constructor === Error
      ? error.message
      : 'Seed failed (database/constraint/runtime error). Any failed transaction was rolled back. No existing password or role was overwritten.',
  );
  process.exitCode = 1;
});
