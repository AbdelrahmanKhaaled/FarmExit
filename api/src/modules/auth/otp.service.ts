import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../config/env.validation';
import { AccountStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { invalidCode, tooManyRequests } from './auth.errors';
import { SMS_PROVIDER, type SmsProvider } from './sms/sms-provider';

const HOUR_MS = 60 * 60 * 1000;

export type OtpIssued = { expiresInSeconds: number; resendAfterSeconds: number };

/**
 * One-time codes: 6 digits from a CSPRNG, stored only as HMAC-SHA256(pepper, mobile:code), single use, short expiry,
 * resend cooldown, hourly cap per number and a per-code attempt limit. The code itself is only ever handed to the
 * SMS provider.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly pepper: string;
  private readonly ttlMs: number;
  private readonly cooldownMs: number;
  private readonly maxAttempts: number;
  private readonly maxPerHour: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {
    this.pepper = config.get('OTP_HASH_SECRET', { infer: true });
    this.ttlMs = config.get('OTP_TTL_SECONDS', { infer: true }) * 1000;
    this.cooldownMs = config.get('OTP_RESEND_COOLDOWN_SECONDS', { infer: true }) * 1000;
    this.maxAttempts = config.get('OTP_MAX_ATTEMPTS', { infer: true });
    this.maxPerHour = config.get('OTP_MAX_REQUESTS_PER_HOUR', { infer: true });
  }

  /**
   * Issues and sends a new code; earlier unused codes for the number are invalidated.
   *
   * The resend cooldown and hourly cap are enforced by ONE atomic `INSERT ... SELECT ... WHERE NOT EXISTS` statement,
   * so simultaneous requests for the same number cannot both pass: InnoDB lets exactly one insert win, and a
   * concurrent loser is rejected (it either sees the winner's row or is chosen as the deadlock victim).
   */
  async issue(mobileE164: string): Promise<OtpIssued> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { mobileE164 },
      select: { id: true, accountStatus: true },
    });
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = this.hash(mobileE164, code);

    const claimed = await this.claim({
      userId: user?.id ?? null,
      mobileE164,
      // Registration vs sign-in is stored here; the response is identical either way.
      purpose: user ? 'sign_in' : 'registration',
      codeHash,
      expiresAt: new Date(now.getTime() + this.ttlMs),
      createdAt: now,
      cooldownCutoff: new Date(now.getTime() - this.cooldownMs),
      hourCutoff: new Date(now.getTime() - HOUR_MS),
    });
    if (!claimed) throw await this.rejection(mobileE164, now);

    const record = await this.prisma.otpVerification.findFirst({
      where: { mobileE164, codeHash },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!record) throw new ServiceUnavailableException('Could not send the verification code. Try again later');
    await this.prisma.otpVerification.updateMany({
      where: { mobileE164, consumedAt: null, id: { not: record.id } },
      data: { consumedAt: now },
    });

    // Suspended/blocked accounts get the identical response (and cooldown/cap) but no SMS is sent, so the response never reveals the status.
    const smsAllowed = !user || user.accountStatus === AccountStatus.active;
    if (!smsAllowed) return this.issued();

    try {
      await this.sms.sendOtp(mobileE164, code);
    } catch (error) {
      await this.prisma.otpVerification.updateMany({
        where: { id: record.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      this.logger.error(`SMS delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException('Could not send the verification code. Try again later');
    }

    return this.issued();
  }

  private issued(): OtpIssued {
    return { expiresInSeconds: this.ttlMs / 1000, resendAfterSeconds: this.cooldownMs / 1000 };
  }

  /** Atomic cooldown + hourly-cap check and insert. Returns false when the request must be rejected. */
  private async claim(c: {
    userId: bigint | null;
    mobileE164: string;
    purpose: 'sign_in' | 'registration';
    codeHash: string;
    expiresAt: Date;
    createdAt: Date;
    cooldownCutoff: Date;
    hourCutoff: Date;
  }): Promise<boolean> {
    try {
      const inserted = await this.prisma.$executeRaw`
        INSERT INTO otp_verifications (user_id, mobile_e164, purpose, code_hash, attempts, expires_at, created_at)
        SELECT ${c.userId}, ${c.mobileE164}, ${c.purpose}, ${c.codeHash}, 0, ${c.expiresAt}, ${c.createdAt}
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM otp_verifications WHERE mobile_e164 = ${c.mobileE164} AND created_at > ${c.cooldownCutoff}
        )
        AND (
          SELECT COUNT(*) FROM otp_verifications WHERE mobile_e164 = ${c.mobileE164} AND created_at >= ${c.hourCutoff}
        ) < ${this.maxPerHour}`;
      return inserted === 1;
    } catch (error) {
      if (isDeadlock(error)) return false; // lost the race against a concurrent request for the same number
      throw error;
    }
  }

  private async rejection(mobileE164: string, now: Date): Promise<Error> {
    const latest = await this.prisma.otpVerification.findFirst({
      where: { mobileE164 },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const waitMs = latest?.createdAt ? latest.createdAt.getTime() + this.cooldownMs - now.getTime() : 0;
    if (waitMs > 0) return tooManyRequests('Please wait before requesting another code', Math.ceil(waitMs / 1000));
    if (latest) return tooManyRequests('Too many verification codes requested. Try again later', 60 * 60);
    return tooManyRequests('Please wait before requesting another code', Math.ceil(this.cooldownMs / 1000));
  }

  /**
   * Checks a submitted code against the newest unused code for the number and counts the attempt. Does not consume
   * the code: call {@link consume} once the rest of the sign-in checks have passed.
   */
  async check(mobileE164: string, code: string): Promise<{ otpId: bigint }> {
    const now = new Date();
    const otp = await this.prisma.otpVerification.findFirst({
      where: { mobileE164, consumedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!otp || otp.expiresAt.getTime() <= now.getTime()) throw invalidCode();

    const counted = await this.prisma.otpVerification.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: this.maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw tooManyRequests('Too many incorrect attempts. Request a new code', Math.ceil(this.cooldownMs / 1000));
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hash(mobileE164, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw invalidCode();
    return { otpId: otp.id };
  }

  /** Marks the code used. Returns false if another request consumed it first (single use). */
  async consume(otpId: bigint): Promise<boolean> {
    const result = await this.prisma.otpVerification.updateMany({
      where: { id: otpId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count === 1;
  }

  private hash(mobileE164: string, code: string): string {
    return createHmac('sha256', this.pepper).update(`${mobileE164}:${code}`).digest('hex');
  }
}

/** MySQL deadlock (1213) / lock-wait timeout (1205), as surfaced by Prisma (P2034) or the driver. */
function isDeadlock(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === 'P2034' || /deadlock|lock wait timeout/i.test(e?.message ?? '');
}
