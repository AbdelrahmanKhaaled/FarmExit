import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  assertDevelopmentProvisionAllowed,
  parseProvisionSuperAdminArgv,
  provisionAdditionalSuperAdmin,
  ProvisionSuperAdminError,
  readMaskedPassword,
} from '../src/dev/provision-super-admin';

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

async function main(): Promise<void> {
  assertDevelopmentProvisionAllowed(process.env.NODE_ENV);
  const args = parseProvisionSuperAdminArgv(process.argv.slice(2));
  const password = await readMaskedPassword('Super Admin password (input hidden): ');
  const prisma = createPrisma();
  try {
    const result = await provisionAdditionalSuperAdmin(prisma, { ...args, password });
    console.log('Additional Super Admin provisioned.');
    console.log(`  userId: ${result.userId.toString()}`);
    console.log(`  email: ${result.email}`);
    console.log(`  mobileE164: ${result.mobileE164}`);
    console.log(`  fullName: ${result.fullName}`);
    console.log(`  roles: ${result.roles.join(', ')}`);
    console.log(`  userCreated: ${result.userCreated}`);
    console.log(`  credentialCreated: ${result.credentialCreated}`);
    const superCount = await prisma.staffMembership.count({
      where: { staffRole: 'superAdmin', status: 'active' },
    });
    console.log(`  activeSuperAdmins: ${superCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ProvisionSuperAdminError) {
    console.error(`Provision failed [${error.code}]: ${error.message}`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
