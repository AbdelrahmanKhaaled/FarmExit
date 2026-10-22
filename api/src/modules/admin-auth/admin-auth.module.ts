import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { DashboardAudienceGuard } from './dashboard-audience.guard';
import { WebsiteAudienceGuard } from './website-audience.guard';
import { PasswordService } from './password.service';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, PasswordService, DashboardAudienceGuard, WebsiteAudienceGuard],
  exports: [PasswordService, DashboardAudienceGuard, WebsiteAudienceGuard],
})
export class AdminAuthModule {}
