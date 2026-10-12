export type MariaDbPoolConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

/**
 * Prisma (CLI, migrations) reads DATABASE_URL as `mysql://user:password@host:port/database`; the MariaDB driver
 * adapter used at runtime only accepts `mariadb://` strings, so the one URL is converted to pool options here.
 */
export function toMariaDbPoolConfig(databaseUrl: string): MariaDbPoolConfig {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql:// scheme');
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL must include a database name');
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}
