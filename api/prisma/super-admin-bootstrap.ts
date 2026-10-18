import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  assertDevelopmentSuperAdminBootstrapAllowed,
  parseSuperAdminBootstrapArgv,
  provisionSuperAdmin,
  SuperAdminBootstrapError,
} from '../src/dev/super-admin-bootstrap';

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

async function main(): Promise<void> {
  assertDevelopmentSuperAdminBootstrapAllowed(process.env.NODE_ENV);
  const input = parseSuperAdminBootstrapArgv(process.argv.slice(2));
  const prisma = createPrisma();
  try {
    const result = await provisionSuperAdmin(prisma, input);
    console.log('Super Admin bootstrap complete.');
    console.log(`  userId: ${result.userId.toString()}`);
    console.log(`  email: ${result.email}`);
    console.log(`  mobileE164: ${result.mobileE164}`);
    console.log(`  fullName: ${result.fullName}`);
    console.log(`  roles: ${result.roles.join(', ')}`);
    console.log(`  created: ${result.created}`);
    if (result.passwordReset) console.log('  password: reset');
    if (result.generatedPassword) {
      console.log('');
      console.log('=== ONE-TIME INITIAL PASSWORD (store securely; not shown again) ===');
      console.log(result.generatedPassword);
      console.log('===================================================================');
    } else if (!result.created && !result.passwordReset) {
      console.log('  (existing Super Admin — no new password generated)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof SuperAdminBootstrapError) {
    console.error(`Bootstrap failed [${error.code}]: ${error.message}`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
