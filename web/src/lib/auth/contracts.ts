/**
 * Authentication contracts. CONFIRMED model: mobile number + OTP, no email/password, and
 * new vs existing user decided after the OTP. No provider is chosen and no UI exists yet.
 */
import type { User } from '@/lib/domain/types';

export interface MobileNumber {
  /** ISO 3166 country code. Egypt (+20) is the default presentation, not a business rule. */
  country: string;
  nationalNumber: string;
}

export interface OtpChallenge {
  challengeId: string;
  /** Seconds until resend is allowed. Configurable; 60 s is the Figma default. */
  resendAfterSeconds: number;
}

export type VerifyOtpResult =
  | { kind: 'existingUser'; user: User }
  | { kind: 'newUser'; profileToken: string }
  | { kind: 'invalidCode' }
  | { kind: 'expired' };

export interface BasicProfileInput {
  fullName: string;
}

export interface Session {
  user: User;
  expiresAt: string;
}

export interface AuthService {
  requestOtp(mobile: MobileNumber): Promise<OtpChallenge>;
  resendOtp(challengeId: string): Promise<OtpChallenge>;
  verifyOtp(challengeId: string, code: string): Promise<VerifyOtpResult>;
  completeProfile(profileToken: string, input: BasicProfileInput): Promise<Session>;
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
}
