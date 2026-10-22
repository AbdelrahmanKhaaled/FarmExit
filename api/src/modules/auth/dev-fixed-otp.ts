import { NodeEnv, type Env } from '../../config/env.validation';
import { normalizeMobile } from './phone-number';

export type DevFixedOtpConfig = {
  code: string;
  allowlist: ReadonlySet<string>;
};

/** Normalises allowlist entries to E.164; invalid entries are dropped. */
export function normalizeDevFixedAllowlist(entries: readonly string[]): string[] {
  const out = new Set<string>();
  for (const entry of entries) {
    const mobile = normalizeMobile(entry);
    if (mobile) out.add(mobile);
  }
  return [...out];
}

export function buildDevFixedOtpConfig(
  env: Pick<Env, 'NODE_ENV' | 'DEV_FIXED_OTP_ENABLED' | 'DEV_FIXED_OTP_CODE' | 'DEV_FIXED_OTP_ALLOWED_MOBILES'>,
): DevFixedOtpConfig | null {
  if (!env.DEV_FIXED_OTP_ENABLED) return null;
  if (env.NODE_ENV !== NodeEnv.Development) return null;
  const allowlist = normalizeDevFixedAllowlist(env.DEV_FIXED_OTP_ALLOWED_MOBILES);
  if (!env.DEV_FIXED_OTP_CODE || allowlist.length === 0) return null;
  return { code: env.DEV_FIXED_OTP_CODE, allowlist: new Set(allowlist) };
}

export function isDevFixedOtpMobile(mobileE164: string, config: DevFixedOtpConfig | null): boolean {
  return config !== null && config.allowlist.has(mobileE164);
}

export function pickOtpCode(
  mobileE164: string,
  config: DevFixedOtpConfig | null,
  randomCode: () => string,
): string {
  if (isDevFixedOtpMobile(mobileE164, config)) return config!.code;
  return randomCode();
}

/** @deprecated Prefer pickOtpCodeWithFixedConfigs from client-demo-otp for multiple configs. */
export function pickOtpCodeFromConfigs(
  mobileE164: string,
  configs: readonly (DevFixedOtpConfig | null)[],
  randomCode: () => string,
): string {
  for (const config of configs) {
    if (isDevFixedOtpMobile(mobileE164, config)) return config!.code;
  }
  return randomCode();
}

export function assertDevFixedOtpEnvironment(env: EnvironmentVariablesForFixedOtp): void {
  if (!env.DEV_FIXED_OTP_ENABLED) return;
  if (env.NODE_ENV === NodeEnv.Production) {
    throw new Error('Invalid environment configuration:\n  - DEV_FIXED_OTP_ENABLED: not allowed when NODE_ENV=production');
  }
  if (env.NODE_ENV !== NodeEnv.Development) {
    throw new Error(
      'Invalid environment configuration:\n  - DEV_FIXED_OTP_ENABLED: only allowed when NODE_ENV=development',
    );
  }
  if (!/^\d{6}$/.test(env.DEV_FIXED_OTP_CODE ?? '')) {
    throw new Error(
      'Invalid environment configuration:\n  - DEV_FIXED_OTP_CODE: must be exactly 6 digits when DEV_FIXED_OTP_ENABLED=true',
    );
  }
  const allowed = normalizeDevFixedAllowlist(env.DEV_FIXED_OTP_ALLOWED_MOBILES ?? []);
  if (allowed.length === 0) {
    throw new Error(
      'Invalid environment configuration:\n  - DEV_FIXED_OTP_ALLOWED_MOBILES: must include at least one valid mobile when DEV_FIXED_OTP_ENABLED=true',
    );
  }
}

type EnvironmentVariablesForFixedOtp = Pick<
  Env,
  'NODE_ENV' | 'DEV_FIXED_OTP_ENABLED' | 'DEV_FIXED_OTP_CODE' | 'DEV_FIXED_OTP_ALLOWED_MOBILES'
>;
