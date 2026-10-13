import { Logger } from '@nestjs/common';
import type { SmsProvider } from './sms-provider';

/**
 * Development/test-only adapter: nothing is sent. Outside production the code is written to the server log so a
 * developer can sign in, and the latest code per number is kept in memory for tests.
 * It is never constructed in production (see `createSmsProvider`) and codes are never returned by the API.
 */
export class DevelopmentSmsProvider implements SmsProvider {
  private readonly logger = new Logger('DevelopmentSmsProvider');
  private readonly latest = new Map<string, string>();

  constructor(private readonly logCodes: boolean) {}

  sendOtp(mobileE164: string, code: string): Promise<void> {
    this.latest.set(mobileE164, code);
    if (this.logCodes) this.logger.warn(`DEV ONLY: OTP for ${mobileE164} is ${code}`);
    return Promise.resolve();
  }

  /** Test helper: the last code "sent" to a number. */
  lastCodeFor(mobileE164: string): string | undefined {
    return this.latest.get(mobileE164);
  }
}
