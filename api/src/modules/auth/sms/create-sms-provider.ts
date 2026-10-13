import { NodeEnv, SmsProviderName } from '../../../config/env.validation';
import { DevelopmentSmsProvider } from './development-sms.provider';
import type { SmsProvider } from './sms-provider';

/**
 * Chooses the SMS adapter. The development adapter is refused in production so an OTP can never be read from a
 * log or skipped there; a real gateway adapter must be added before production use.
 */
export function createSmsProvider(name: SmsProviderName, nodeEnv: NodeEnv): SmsProvider {
  if (name === SmsProviderName.Development) {
    if (nodeEnv === NodeEnv.Production) {
      throw new Error('SMS_PROVIDER=development is not allowed in production: configure a real SMS provider');
    }
    return new DevelopmentSmsProvider(nodeEnv === NodeEnv.Development);
  }
  throw new Error(`Unsupported SMS_PROVIDER: ${String(name)}`);
}
