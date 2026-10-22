const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const DB_NAME = 'farmexit';

function parseDatabaseUrl(env) {
  if (!env.DATABASE_URL) throw new Error('Refusing: DATABASE_URL is unidentified.');
  const url = new URL(env.DATABASE_URL);
  if (url.protocol !== 'mysql:') throw new Error('Refusing: only mysql DATABASE_URL is supported.');
  const database = url.pathname.replace(/^\//, '') || '';
  if (database !== DB_NAME) {
    throw new Error(`Refusing: only database ${DB_NAME} is authorized (got ${database || '(empty)'}).`);
  }
  return { host: url.hostname, port: url.port || '3306', database: DB_NAME };
}

function assertLocalDevelopment(env, args = []) {
  if (env.NODE_ENV !== 'development') throw new Error('Refusing: NODE_ENV must explicitly be development.');
  const target = parseDatabaseUrl(env);
  if (!LOCAL_HOSTS.has(target.host)) {
    throw new Error('Refusing: only loopback MySQL database farmexit is authorized.');
  }
  if (args.includes('--apply') && !args.includes('--confirm-local-development')) {
    throw new Error('Refusing: --apply requires --confirm-local-development.');
  }
  return { mode: 'local', ...target, nodeEnv: env.NODE_ENV };
}

function allowedProductionDbHosts(env) {
  const raw = env.PUBLIC_FARMS_DEMO_SEED_DB_HOSTS ?? '127.0.0.1,localhost';
  return new Set(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

/** Production VPS: synthetic [DEMO] PFM rows only; never auto-runs on deploy. */
function assertProductionServer(env, args = []) {
  if (env.PUBLIC_FARMS_DEMO_SEED_ENABLED !== 'true') {
    throw new Error(
      'Refusing: set PUBLIC_FARMS_DEMO_SEED_ENABLED=true in server .env before production demo seed.',
    );
  }
  const target = parseDatabaseUrl(env);
  const allowed = allowedProductionDbHosts(env);
  if (!allowed.has(target.host)) {
    throw new Error(
      `Refusing: MySQL host ${target.host} is not in PUBLIC_FARMS_DEMO_SEED_DB_HOSTS (${[...allowed].join(', ')}).`,
    );
  }
  if (args.includes('--apply') && !args.includes('--confirm-production-demo-seed')) {
    throw new Error('Refusing: production --apply requires --confirm-production-demo-seed.');
  }
  return { mode: 'production', ...target, nodeEnv: env.NODE_ENV ?? 'production' };
}

function assertPublicFarmsDemoTarget(env, args = []) {
  if (args.includes('--production-server')) return assertProductionServer(env, args);
  return assertLocalDevelopment(env, args);
}

function assertApplyOptIn(args, target) {
  if (!args.includes('--apply')) throw new Error('Explicit --apply required.');
  if (target.mode === 'local' && !args.includes('--confirm-local-development')) {
    throw new Error('Explicit --confirm-local-development required.');
  }
  if (target.mode === 'production' && !args.includes('--confirm-production-demo-seed')) {
    throw new Error('Explicit --confirm-production-demo-seed required.');
  }
}

async function assertDatabaseServer(prisma, target) {
  const [database] = await prisma.$queryRaw`SELECT DATABASE() AS databaseName, @@hostname AS serverHostname`;
  if (database.databaseName !== DB_NAME) {
    throw new Error(`Refusing: connected database must be ${DB_NAME}.`);
  }
  if (target.mode === 'local') {
    const expected = require('node:os').hostname().toLowerCase();
    if (database.serverHostname.toLowerCase() !== expected) {
      throw new Error('Refusing unidentified database server: must match this development machine.');
    }
    return database;
  }
  const expected = process.env.PUBLIC_FARMS_DEMO_SEED_EXPECTED_DB_HOSTNAME;
  if (expected && database.serverHostname.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(
      `Refusing: @@hostname ${database.serverHostname} does not match PUBLIC_FARMS_DEMO_SEED_EXPECTED_DB_HOSTNAME.`,
    );
  }
  return database;
}

module.exports = {
  assertPublicFarmsDemoTarget,
  assertApplyOptIn,
  assertDatabaseServer,
  assertLocalDevelopment,
};
