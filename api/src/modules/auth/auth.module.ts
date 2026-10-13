import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CompletedProfileGuard } from './completed-profile.guard';
import { OtpService } from './otp.service';
import { RateLimitGuard, RateLimiter } from './rate-limit';
import { createSmsProvider } from './sms/create-sms-provider';
import { SMS_PROVIDER } from './sms/sms-provider';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    RateLimiter,
    RateLimitGuard,
    AccessTokenGuard,
    CompletedProfileGuard,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createSmsProvider(config.get('SMS_PROVIDER', { infer: true }), config.get('NODE_ENV', { infer: true })),
    },
  ],
  // Other feature modules protect their routes with AccessTokenGuard (it only needs TokenService and PrismaService).
  exports: [AccessTokenGuard, CompletedProfileGuard, TokenService],
})
export class AuthModule {}
