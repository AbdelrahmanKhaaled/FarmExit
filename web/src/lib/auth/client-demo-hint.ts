import { normalizeMobile } from '@/lib/auth/phone';

/** Public mirror of server allowlist for UX only; never enables demo OTP on the client. */
export function isClientDemoHintMobile(mobileE164: string | null | undefined): boolean {
  const raw = process.env.NEXT_PUBLIC_CLIENT_DEMO_OTP_HINT_MOBILES;
  if (!raw?.trim() || !mobileE164) return false;
  const normalized = normalizeMobile(mobileE164);
  if (!normalized) return false;
  return raw
    .split(',')
    .map((entry) => normalizeMobile(entry.trim()))
    .filter(Boolean)
    .includes(normalized);
}
