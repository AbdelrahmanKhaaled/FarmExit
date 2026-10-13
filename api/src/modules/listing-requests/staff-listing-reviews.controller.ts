import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole } from '../../generated/prisma/enums';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffOnly, StaffPermissions, StaffRoles } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  AssignListingStaffDto,
  DecideListingReviewDto,
  StaffListingRequestListResponseDto,
  StaffListingRequestResponseDto,
} from './dto/staff-listing-review.dto';
import { StaffListingReviewsService } from './staff-listing-reviews.service';
import { ListingPublicationService } from './listing-publication.service';
import {
  PublicationQueueResponseDto,
  PublishListingRequestDto,
  PublicationListingDto,
} from './dto/listing-publication.dto';

const SCOPE =
  'Submitted sale and rent listing requests only. Drafts stay with the owner. ' +
  'This does not approve, reject, publish, or open a conversation.';

/** HTTP only. Membership, role and assignment checks live in the service. */
@ApiTags('staff-listing-reviews')
@Controller('staff/listing-requests')
@StaffOnly()
@StaffPermissions(StaffPermission.RequestsRead)
export class StaffListingReviewsController {
  constructor(
    private readonly reviews: StaffListingReviewsService,
    private readonly publication: ListingPublicationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Staff inbox of submitted listing requests',
    description:
      `${SCOPE} Admin sees every submitted listing. A reviewer or case agent sees only requests assigned to them ` +
      'for that role. Owner contact details and private media are not included.',
  })
  @ApiOkResponse({ type: StaffListingRequestListResponseDto })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<StaffListingRequestListResponseDto> {
    return this.reviews.list(auth.userId, query);
  }

  @Get('publication-queue')
  @StaffRoles(StaffRole.admin)
  @ApiOperation({
    summary: 'Approved listings waiting for publication',
    description:
      'Active admin only. Approved sale and rent listings that are not yet published. ' +
      'Governorate and general area only. No owner contact, map pin, document or media.',
  })
  @ApiOkResponse({ type: PublicationQueueResponseDto })
  queue(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<PublicationQueueResponseDto> {
    return this.publication.queue(auth.userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '4', description: 'Listing request id' })
  @ApiOperation({
    summary: 'One submitted listing request for assigned staff',
    description: `${SCOPE} Unassigned staff and other requests are not found.`,
  })
  @ApiOkResponse({ type: StaffListingRequestResponseDto })
  @ApiNotFoundResponse({ description: 'No submitted listing request for this caller' })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<StaffListingRequestResponseDto> {
    return this.reviews.get(auth.userId, id);
  }

  @Put(':id/assignments')
  @HttpCode(HttpStatus.OK)
  @StaffRoles(StaffRole.admin)
  @ApiParam({ name: 'id', example: '4' })
  @ApiOperation({
    summary: 'Assign or reassign the reviewer or case agent',
    description:
      'Active admin only. The assignee must already have an active membership of that role. ' +
      'The other slot is left unchanged. The listing status is not changed, and no communication case is opened.',
  })
  @ApiOkResponse({ type: StaffListingRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Assignee is missing, inactive, or does not hold that staff role' })
  @ApiConflictResponse({ description: 'The slot changed concurrently and could not be saved' })
  @ApiNotFoundResponse({ description: 'No submitted listing request' })
  assign(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: AssignListingStaffDto,
  ): Promise<StaffListingRequestResponseDto> {
    return this.reviews.assign(auth.userId, id, dto);
  }

  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @StaffPermissions(StaffPermission.RequestsReview)
  @ApiParam({ name: 'id', example: '4' })
  @ApiOperation({
    summary: 'Record a listing review decision',
    description:
      'Active admin, or the active reviewer assigned to this request. A case agent cannot decide. ' +
      'Moves underFarmExitReview to approved, changesRequested or rejected, and stores the review plus status history. ' +
      'Approval keeps the listing private and unpublished. A comment is required for rejection and requested changes.',
  })
  @ApiOkResponse({ type: StaffListingRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Missing comment, or a field the decision does not accept' })
  @ApiConflictResponse({ description: 'The listing is no longer under review' })
  @ApiNotFoundResponse({ description: 'No submitted listing for this caller' })
  decide(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideListingReviewDto,
  ): Promise<StaffListingRequestResponseDto> {
    return this.reviews.decide(auth.userId, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @StaffRoles(StaffRole.admin)
  @ApiParam({ name: 'id', example: '4' })
  @ApiOperation({
    summary: 'Publish an approved listing',
    description:
      'Active admin only. Moves approved to published, sets visibility to public and publishedAt. ' +
      'A sale needs a positive asking price and a rent needs a positive annual rent. ' +
      'Only one published listing of each type is allowed per farm. This does not approve image licences, ' +
      'verify legal ownership, or open a buyer conversation. Reviewers and case agents cannot publish.',
  })
  @ApiOkResponse({ type: PublicationListingDto })
  @ApiBadRequestResponse({ description: 'Missing price, unavailable farm, or the creator is no longer an active owner' })
  @ApiConflictResponse({ description: 'Not approved, already published, or this farm already has that published type' })
  @ApiNotFoundResponse({ description: 'No listing request' })
  publish(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: PublishListingRequestDto,
  ): Promise<PublicationListingDto> {
    void dto;
    return this.publication.publish(auth.userId, id);
  }
}
