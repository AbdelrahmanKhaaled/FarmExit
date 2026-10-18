import { toMariaDbPoolConfig } from '../src/prisma/database-url';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export type DbSafetyReport = {
  nodeEnv: string;
  databaseName: string;
  host: string;
  port: number;
  isLocalHost: boolean;
  isFarmexitDb: boolean;
  productionBlocked: boolean;
};

export function assertDashboardDemoSeedEnvironment(databaseUrl: string): DbSafetyReport {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dashboard demo seed is prohibited when NODE_ENV=production');
  }

  const cfg = toMariaDbPoolConfig(databaseUrl);
  const isLocalHost = LOCAL_HOSTS.has(cfg.host.toLowerCase());
  const isFarmexitDb = cfg.database.toLowerCase() === 'farmexit';

  if (!isLocalHost) {
    throw new Error(
      `Refusing dashboard demo seed: database host "${cfg.host}" is not local (localhost/127.0.0.1)`,
    );
  }
  if (!isFarmexitDb) {
    throw new Error(
      `Refusing dashboard demo seed: expected database name "farmexit", got "${cfg.database}"`,
    );
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseName: cfg.database,
    host: cfg.host,
    port: cfg.port,
    isLocalHost,
    isFarmexitDb,
    productionBlocked: true,
  };
}

export function redactedDatabaseTarget(databaseUrl: string): string {
  const cfg = toMariaDbPoolConfig(databaseUrl);
  return `mysql://${cfg.user}:***@${cfg.host}:${cfg.port}/${cfg.database}`;
}
