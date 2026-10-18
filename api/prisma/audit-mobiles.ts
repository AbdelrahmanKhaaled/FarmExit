import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { normalizeMobile } from '../src/modules/auth/phone-number';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  const users = await prisma.user.findMany({ select: { id: true, mobileE164: true, email: true } });
  let invalid = 0;
  let placeholder = 0;
  let missing = 0;
  const invalidSamples: { id: string; mobile: string }[] = [];
  for (const u of users) {
    if (!u.mobileE164?.trim()) {
      missing++;
      continue;
    }
    if (u.mobileE164.startsWith('+20109998')) placeholder++;
    if (!normalizeMobile(u.mobileE164)) {
      invalid++;
      if (invalidSamples.length < 10) {
        invalidSamples.push({ id: u.id.toString(), mobile: u.mobileE164 });
      }
    }
  }
  console.log(
    JSON.stringify(
      { total: users.length, missing, invalid, placeholderAdminRange: placeholder, invalidSamples },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
