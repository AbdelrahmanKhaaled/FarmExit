import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { toMariaDbPoolConfig } from '../src/prisma/database-url';
import {
  AdminBootstrapError,
  assertDevelopmentBootstrapAllowed,
  countActiveAdmins,
  parseBootstrapArgv,
  provisionDevelopmentAdmin,
} from '../src/dev/admin-bootstrap';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in api/.env');
  process.exit(1);
}

assertDevelopmentBootstrapAllowed(process.env.NODE_ENV);

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(toMariaDbPoolConfig(databaseUrl)),
});

async function main() {
  const input = parseBootstrapArgv(process.argv.slice(2));
  const before = await countActiveAdmins(prisma);
  const result = await provisionDevelopmentAdmin(prisma, input);
  const after = await countActiveAdmins(prisma);

  console.log('FarmExit admin bootstrap (development only)');
  console.log(`  Active admins before: ${before}`);
  console.log(`  Active admins after:  ${after}`);
  console.log(`  User id:              ${result.userId.toString()}`);
  console.log(`  Mobile (E.164):       ${result.mobileE164}`);
  console.log(`  Full name:            ${result.fullName}`);
  console.log(`  Profile complete:     ${result.profileCompleted}`);
  console.log(`  User created:         ${result.userCreated}`);
  console.log(`  Staff roles:          ${result.roles.join(', ')}`);
  console.log('');
  console.log('Sign in at the dashboard with OTP (no password). In development, read the OTP from the API log:');
  console.log('  DEV ONLY: OTP for <mobile> is <code>  (SMS_PROVIDER=development, NODE_ENV=development)');
}

main()
  .catch((error: unknown) => {
    if (error instanceof AdminBootstrapError) {
      console.error(`Admin bootstrap failed [${error.code}]: ${error.message}`);
      process.exit(1);
    }
    console.error('Admin bootstrap failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
