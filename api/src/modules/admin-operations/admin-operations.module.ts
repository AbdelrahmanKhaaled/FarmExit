import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminAssignableStaffService } from './admin-assignable-staff.service';
import { AdminEvaluationsService } from './admin-evaluations.service';
import { AdminFarmsService } from './admin-farms.service';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthorizationModule, AdminAuthModule],
  controllers: [AdminDashboardController],
  providers: [
    AdminDashboardService,
    AdminAnalyticsService,
    AdminAssignableStaffService,
    AdminEvaluationsService,
    AdminFarmsService,
    AdminUsersService,
    AdminAuditService,
  ],
})
export class AdminOperationsModule {}
