import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffRole } from '../../generated/prisma/enums';
import { StaffDashboardOnly, StaffRoles } from '../authorization/staff.decorators';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminAssignableStaffService } from './admin-assignable-staff.service';
import { AdminFarmsService } from './admin-farms.service';
import {
  AdminAssignableStaffListResponseDto,
  AdminAssignableStaffQueryDto,
} from './dto/admin-assignable-staff.dto';
import { AdminUsersService } from './admin-users.service';
import {
  AdminAnalyticsDistributionsDto,
  AdminAnalyticsOverviewDto,
  AdminAnalyticsQueryDto,
  AdminAnalyticsResponseDto,
  AdminAnalyticsTimeseriesDto,
  AdminAnalyticsWorkflowsDto,
} from './dto/admin-analytics.dto';
import { AdminAuditLogListResponseDto, AdminAuditLogsQueryDto } from './dto/admin-audit.dto';
import { AdminDashboardOverviewDto, AdminWorkQueueDto } from './dto/admin-dashboard.dto';
import { AdminFarmDetailDto, AdminFarmListResponseDto, AdminListFarmsQueryDto } from './dto/admin-farms.dto';
import {
  AdminEvaluationListResponseDto,
  AdminEvaluationsQueryDto,
} from './dto/admin-evaluations.dto';
import { AdminUserDetailDto } from './dto/admin-user-detail.dto';
import { AdminEvaluationsService } from './admin-evaluations.service';
import { AdminUsersListResponseDto, AdminUsersQueryDto } from './dto/admin-users.dto';

@ApiTags('staff-admin')
@Controller('staff/admin')
@StaffDashboardOnly()
@StaffRoles(StaffRole.admin, StaffRole.superAdmin)
export class AdminDashboardController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly analytics: AdminAnalyticsService,
    private readonly assignableStaff: AdminAssignableStaffService,
    private readonly farms: AdminFarmsService,
    private readonly users: AdminUsersService,
    private readonly evaluationsInbox: AdminEvaluationsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Operational statistics for the admin dashboard',
    description:
      'Admin only. Aggregated counts from existing tables; no PII or private farm coordinates. ' +
      'Use GET /api/v1/staff/requests with filters for detailed queues.',
  })
  @ApiOkResponse({ type: AdminDashboardOverviewDto })
  overview(): Promise<AdminDashboardOverviewDto> {
    return this.dashboard.overview();
  }

  @Get('work-queue')
  @ApiOperation({
    summary: 'High-level work queue counters',
    description:
      'Admin only. For paginated lists, reuse GET /api/v1/staff/requests, staff listing reviews, ' +
      'staff/farm-details-requests, and staff/communication/cases.',
  })
  @ApiOkResponse({ type: AdminWorkQueueDto })
  workQueue(): Promise<AdminWorkQueueDto> {
    return this.dashboard.workQueue();
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Period KPI totals for analytics (database aggregates)' })
  @ApiOkResponse({ type: AdminAnalyticsOverviewDto })
  analyticsKpis(@Query() query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsOverviewDto> {
    return this.analytics.overview(query);
  }

  @Get('analytics/timeseries')
  @ApiOperation({ summary: 'Time-bucketed platform growth and workflow volume' })
  @ApiOkResponse({ type: AdminAnalyticsTimeseriesDto })
  analyticsTimeseries(@Query() query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsTimeseriesDto> {
    return this.analytics.timeseries(query);
  }

  @Get('analytics/distributions')
  @ApiOperation({ summary: 'Type/status/geography distributions for the selected period' })
  @ApiOkResponse({ type: AdminAnalyticsDistributionsDto })
  analyticsDistributions(@Query() query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsDistributionsDto> {
    return this.analytics.distributions(query);
  }

  @Get('analytics/workflows')
  @ApiOperation({ summary: 'Current review and communication workload snapshot' })
  @ApiOkResponse({ type: AdminAnalyticsWorkflowsDto })
  analyticsWorkflows(@Query() query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsWorkflowsDto> {
    return this.analytics.workflows(query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Full analytics report (KPIs, time series, distributions, workflows)' })
  @ApiOkResponse({ type: AdminAnalyticsResponseDto })
  analyticsReport(@Query() query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsResponseDto> {
    return this.analytics.analytics(query);
  }

  @Get('assignable-staff')
  @ApiOperation({
    summary: 'Active staff eligible for reviewer or case agent assignment slots',
    description:
      'Admin dashboard only. Returns users with an active membership for the requested role. ' +
      'Assignment endpoints still validate eligibility when saving.',
  })
  @ApiOkResponse({ type: AdminAssignableStaffListResponseDto })
  listAssignableStaff(@Query() query: AdminAssignableStaffQueryDto): Promise<AdminAssignableStaffListResponseDto> {
    return this.assignableStaff.list(query);
  }

  @Get('farms')
  @ApiOperation({ summary: 'Paginated farm directory for administrators (no private coordinates)' })
  @ApiOkResponse({ type: AdminFarmListResponseDto })
  listFarms(@Query() query: AdminListFarmsQueryDto): Promise<AdminFarmListResponseDto> {
    return this.farms.list(query);
  }

  @Get('farms/:id')
  @ApiOperation({ summary: 'Farm detail for administrators (no private coordinates)' })
  @ApiOkResponse({ type: AdminFarmDetailDto })
  getFarm(@Param('id', ParseBigIntIdPipe) id: bigint): Promise<AdminFarmDetailDto> {
    return this.farms.getById(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Paginated platform users or dashboard administrators' })
  @ApiOkResponse({ type: AdminUsersListResponseDto })
  listUsers(@Query() query: AdminUsersQueryDto): Promise<AdminUsersListResponseDto> {
    return this.users.list(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Platform user detail (no staff memberships, no secrets)' })
  @ApiOkResponse({ type: AdminUserDetailDto })
  getPlatformUser(@Param('id', ParseBigIntIdPipe) id: bigint): Promise<AdminUserDetailDto> {
    return this.users.getPlatformUser(id);
  }

  @Get('evaluations')
  @ApiOperation({ summary: 'Paginated FarmExit evaluations inbox (internal assessments only)' })
  @ApiOkResponse({ type: AdminEvaluationListResponseDto })
  listEvaluations(@Query() query: AdminEvaluationsQueryDto): Promise<AdminEvaluationListResponseDto> {
    return this.evaluationsInbox.list(query);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Read-only paginated audit log for administrators' })
  @ApiOkResponse({ type: AdminAuditLogListResponseDto })
  listAuditLogs(@Query() query: AdminAuditLogsQueryDto): Promise<AdminAuditLogListResponseDto> {
    return this.audit.list(query);
  }
}
