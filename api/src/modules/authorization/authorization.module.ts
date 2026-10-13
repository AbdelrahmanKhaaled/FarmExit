import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FarmAccessService } from './farm-access.service';
import { StaffAuthorizationService } from './staff-authorization.service';
import { StaffController } from './staff.controller';
import { StaffGuard } from './staff.guard';

/**
 * Authorization (what an authenticated user may do), kept separate from authentication (who they are):
 * FarmExit staff roles/permissions and resource-level farm access. Feature modules import this module and use
 * `@StaffOnly()`, `@StaffRoles()`, `@StaffPermissions()` and `FarmAccessService`.
 */
@Module({
  imports: [AuthModule],
  controllers: [StaffController],
  providers: [StaffAuthorizationService, FarmAccessService, StaffGuard],
  exports: [StaffAuthorizationService, FarmAccessService, StaffGuard, AuthModule],
})
export class AuthorizationModule {}
