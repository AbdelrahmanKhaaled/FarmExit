import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffOnly, StaffPermissions, StaffRoles } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { StaffRole } from '../../generated/prisma/enums';
import { AssignRequestStaffDto } from './dto/assign-request-staff.dto';
import { DecideRequestReviewDto } from './dto/decide-request-review.dto';
import { ForwardRequestDto } from './dto/forward-request.dto';
import { ForwardingDecisionDto } from './dto/forwarding-decision.dto';
import {
  RequestListResponseDto,
  RequestResponseDto,
} from './dto/request-response.dto';
import { ReviewRequestDocumentDto } from './dto/review-request-document.dto';
import { StaffListRequestsQueryDto } from './dto/staff-list-requests-query.dto';
import { TransitionRequestStatusDto } from './dto/transition-request-status.dto';
import { RequestsService } from './requests.service';

const STAFF_SCOPE =
  'Internal FarmExit staff only. FarmExit mediates communication between parties; direct buyer-to-owner contact is prohibited. ' +
  'Unassigned staff cannot access restricted requests.';

@ApiTags('staff requests')
@Controller('staff/requests')
@StaffOnly()
@StaffPermissions(StaffPermission.RequestsRead)
export class StaffRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Staff inbox of unified requests',
    description:
      `${STAFF_SCOPE} Admins see all requests. Reviewers and case agents see requests assigned to them or unassigned requests needing review. ` +
      'Supports filtering by requestType, status, assigned staff, and date ranges.',
  })
  @ApiOkResponse({ type: RequestListResponseDto })
  listStaff(
    @CurrentAuth() auth: AuthContext,
    @Query() query: StaffListRequestsQueryDto,
  ): Promise<RequestListResponseDto> {
    return this.requests.listStaff(auth.userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Staff request details with full history and assignments',
    description: `${STAFF_SCOPE} Rejects unassigned staff with 403 when a request is restricted to other assigned personnel.`,
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiForbiddenResponse({ description: 'Staff member is not authorized to access this restricted request' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  getStaff(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<RequestResponseDto> {
    return this.requests.getStaff(auth.userId, id);
  }

  @Put(':id/assignments')
  @HttpCode(HttpStatus.OK)
  @StaffRoles(StaffRole.admin)
  @ApiOperation({
    summary: 'Assign or reassign reviewer or case agent slot',
    description:
      'Active admin only. Validates that the target staff member has an active membership matching the designated role. ' +
      'Reassignment updates the slot atomically and logs changes in audit_logs.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBadRequestResponse({ description: 'Assignee is missing, inactive, or lacks required staff role' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  assignStaff(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: AssignRequestStaffDto,
  ): Promise<RequestResponseDto> {
    return this.requests.assignStaff(auth.userId, id, dto);
  }

  @Post(':id/reviews')
  @HttpCode(HttpStatus.OK)
  @StaffPermissions(StaffPermission.RequestsReview)
  @ApiOperation({
    summary: 'Record a staff review decision on a request',
    description:
      'Requires requests.review permission. May be executed by an admin or the assigned reviewer. ' +
      'Requires comment when requesting changes or rejecting. Records decision in request_reviews and audit_logs.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBadRequestResponse({ description: 'Comment missing when changes requested or rejected' })
  @ApiConflictResponse({ description: 'Draft requests cannot be reviewed' })
  @ApiForbiddenResponse({ description: 'Caller is not the assigned reviewer or an administrator' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  recordReview(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideRequestReviewDto,
  ): Promise<RequestResponseDto> {
    return this.requests.recordReview(auth.userId, id, dto);
  }

  @Post(':id/forwardings')
  @HttpCode(HttpStatus.OK)
  @StaffPermissions(StaffPermission.RequestsForward)
  @ApiOperation({
    summary: 'Forward request to recipient party (e.g. farm owner)',
    description:
      'Requires requests.forward permission. Mediates communication without disclosing private contact details. ' +
      'Creates a request_forwardings record and updates request status.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid recipient or self-forwarding attempted' })
  @ApiConflictResponse({ description: 'Drafts or closed requests cannot be forwarded' })
  @ApiForbiddenResponse({ description: 'Caller is not the assigned case agent or an administrator' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  forwardRequest(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: ForwardRequestDto,
  ): Promise<RequestResponseDto> {
    return this.requests.forwardRequest(auth.userId, id, dto);
  }

  @Post(':id/forwardings/:forwardingId/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record owner decision on a forwarded request via staff mediation',
    description: 'Allows authorized staff to record an owner decision received via mediated contact.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiParam({ name: 'forwardingId', example: '1', description: 'Forwarding record ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid decision payload' })
  @ApiNotFoundResponse({ description: 'Request or forwarding record not found' })
  recordForwardingDecision(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('forwardingId', ParseBigIntIdPipe) forwardingId: bigint,
    @Body() dto: ForwardingDecisionDto,
  ): Promise<RequestResponseDto> {
    return this.requests.recordForwardingDecision(auth.userId, id, forwardingId, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @StaffPermissions(StaffPermission.RequestsReview)
  @ApiOperation({
    summary: 'Controlled request status transition',
    description: 'Transitions request status according to approved workflow rules. Records status history and audit logs.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiConflictResponse({ description: 'Invalid or conflicting status transition' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  transitionStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: TransitionRequestStatusDto,
  ): Promise<RequestResponseDto> {
    return this.requests.transitionStatus(auth.userId, id, dto);
  }

  @Patch(':id/documents/:documentId')
  @HttpCode(HttpStatus.OK)
  @StaffPermissions(StaffPermission.RequestsReview)
  @ApiOperation({
    summary: 'Review an attached request document',
    description: 'Enforces request-level document isolation to prevent cross-request leakage. Records staff review note and status.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiParam({ name: 'documentId', example: '1', description: 'Document ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiNotFoundResponse({ description: 'Request or document not found, or document belongs to a different request' })
  reviewDocument(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('documentId', ParseBigIntIdPipe) documentId: bigint,
    @Body() dto: ReviewRequestDocumentDto,
  ): Promise<RequestResponseDto> {
    return this.requests.reviewDocument(auth.userId, id, documentId, dto);
  }
}
