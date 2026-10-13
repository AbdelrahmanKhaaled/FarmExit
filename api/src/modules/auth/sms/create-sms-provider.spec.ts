import { NodeEnv, SmsProviderName } from '../../../config/env.validation';
import { createSmsProvider } from './create-sms-provider';
import { DevelopmentSmsProvider } from './development-sms.provider';

describe('createSmsProvider', () => {
  it('refuses the development adapter in production', () => {
    expect(() => createSmsProvider(SmsProviderName.Development, NodeEnv.Production)).toThrow(/production/);
  });

  it('provides the development adapter in development and test', () => {
    expect(createSmsProvider(SmsProviderName.Development, NodeEnv.Development)).toBeInstanceOf(DevelopmentSmsProvider);
    expect(createSmsProvider(SmsProviderName.Development, NodeEnv.Test)).toBeInstanceOf(DevelopmentSmsProvider);
  });
});

describe('DevelopmentSmsProvider', () => {
  it('keeps the last code in memory for tests and does not log when logging is off', async () => {
    const provider = new DevelopmentSmsProvider(false);
    const warn = jest.spyOn(provider['logger'], 'warn');
    await provider.sendOtp('+201012345678', '123456');
    expect(provider.lastCodeFor('+201012345678')).toBe('123456');
    expect(warn).not.toHaveBeenCalled();
  });
});
