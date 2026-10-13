/** Delivers a one-time code to a mobile number. Real SMS gateways implement this interface. */
export interface SmsProvider {
  sendOtp(mobileE164: string, code: string): Promise<void>;
}

/** Nest injection token for the active {@link SmsProvider}. */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
