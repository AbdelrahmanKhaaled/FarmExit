const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function assertLocalDevelopment(env, args = []) {
  if (env.NODE_ENV !== 'development') throw new Error('Refusing: NODE_ENV must explicitly be development.');
  if (!env.DATABASE_URL) throw new Error('Refusing: DATABASE_URL is unidentified.');
  const url = new URL(env.DATABASE_URL);
  if (url.protocol !== 'mysql:' || !LOCAL_HOSTS.has(url.hostname) || url.pathname !== '/farmexit') {
    throw new Error('Refusing: only loopback MySQL database farmexit is authorized.');
  }
  if (args.includes('--apply') && !args.includes('--confirm-local-development')) {
    throw new Error('Refusing: --apply requires --confirm-local-development.');
  }
  if (args.includes('--publish') && !args.includes('--confirm-local-development')) {
    throw new Error('Refusing: --publish requires --confirm-local-development and staff Publish in dashboard.');
  }
  return { host: url.hostname, port: url.port || '3306', database: 'farmexit', nodeEnv: env.NODE_ENV };
}

module.exports = { assertLocalDevelopment };
