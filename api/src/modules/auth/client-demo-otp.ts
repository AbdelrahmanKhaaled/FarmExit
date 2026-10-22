import { NodeEnv, type Env } from '../../config/env.validation';
import { normalizeDevFixedAllowlist, type DevFixedOtpConfig } from './dev-fixed-otp';

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Client-demo OTP is only allowed against the local loopback `farmexit` database. */
export function isClientDemoDatabaseUrl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    return url.protocol === 'mysql:' && LOCAL_DB_HOSTS.has(url.hostname) && url.pathname === '/farmexit';
  } catch {
    return false;
  }
}

export function buildClientDemoOtpConfig(
  env: Pick<
    Env,
    | 'CLIENT_DEMO_OTP_ENABLED'
    | 'CLIENT_DEMO_OTP_CODE'
    | 'CLIENT_DEMO_OTP_ALLOWED_MOBILES'
    | 'NODE_ENV'
    | 'DATABASE_URL'
  >,
): DevFixedOtpConfig | null {
  if (!env.CLIENT_DEMO_OTP_ENABLED) return null;
  if (env.NODE_ENV === NodeEnv.Production) return null;
  if (!isClientDemoDatabaseUrl(env.DATABASE_URL)) return null;
  const allowlist = normalizeDevFixedAllowlist(env.CLIENT_DEMO_OTP_ALLOWED_MOBILES);
  if (!env.CLIENT_DEMO_OTP_CODE || allowlist.length === 0) return null;
  return { code: env.CLIENT_DEMO_OTP_CODE, allowlist: new Set(allowlist) };
}

type ClientDemoEnv = Pick<
  Env,
  | 'CLIENT_DEMO_OTP_ENABLED'
  | 'CLIENT_DEMO_OTP_CODE'
  | 'CLIENT_DEMO_OTP_ALLOWED_MOBILES'
  | 'NODE_ENV'
  | 'DATABASE_URL'
>;

export function assertClientDemoOtpEnvironment(env: ClientDemoEnv): void {
  if (!env.CLIENT_DEMO_OTP_ENABLED) return;
  if (env.NODE_ENV === NodeEnv.Production) {
    throw new Error(
      'Invalid environment configuration:\n  - CLIENT_DEMO_OTP_ENABLED: not allowed when NODE_ENV=production',
    );
  }
  if (!isClientDemoDatabaseUrl(env.DATABASE_URL)) {
    throw new Error(
      'Invalid environment configuration:\n  - CLIENT_DEMO_OTP_ENABLED: only allowed with loopback MySQL database farmexit',
    );
  }
  if (!/^\d{6}$/.test(env.CLIENT_DEMO_OTP_CODE ?? '')) {
    throw new Error(
      'Invalid environment configuration:\n  - CLIENT_DEMO_OTP_CODE: must be exactly 6 digits when CLIENT_DEMO_OTP_ENABLED=true',
    );
  }
  const allowed = normalizeDevFixedAllowlist(env.CLIENT_DEMO_OTP_ALLOWED_MOBILES ?? []);
  if (allowed.length === 0) {
    throw new Error(
      'Invalid environment configuration:\n  - CLIENT_DEMO_OTP_ALLOWED_MOBILES: must include at least one valid mobile when CLIENT_DEMO_OTP_ENABLED=true',
    );
  }
}
