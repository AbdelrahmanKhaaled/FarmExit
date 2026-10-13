import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { toMariaDbPoolConfig } from './database-url';

const runDbIntegration = process.env.RUN_DB_INTEGRATION === '1';

loadEnv({ path: resolve(__dirname, '../../.env') });

const describeDb = runDbIntegration ? describe : describe.skip;

describeDb('MySQL connectivity (Prisma 7 + MariaDB adapter)', () => {
  let client: PrismaClient;

  beforeAll(() => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required when RUN_DB_INTEGRATION=1 (set it in api/.env)');
    }
    client = new PrismaClient({
      adapter: new PrismaMariaDb(toMariaDbPoolConfig(databaseUrl)),
    });
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('runs a parameterized query against the configured database', async () => {
    const rows = await client.$queryRaw<{ ok: unknown }[]>`SELECT 1 AS ok`;
    expect(Number(rows[0]?.ok)).toBe(1);
  });
});
