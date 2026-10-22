import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffRole } from '../../generated/prisma/enums';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { StaffOnly, StaffRoles } from '../authorization/staff.decorators';
import { OpportunityPublicationService } from '../requests/opportunity-publication.service';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { DecideListingReviewDto } from '../listing-requests/dto/staff-listing-review.dto';
import { PartnershipRequestListResponseDto, PartnershipRequestResponseDto } from './dto/partnership-request.dto';
import { StaffPartnershipReviewsService } from './staff-partnership-reviews.service';

@ApiTags('staff-partnership-requests')
@Controller('staff/partnership-requests')
@StaffOnly()
export class StaffPartnershipReviewsController {
  constructor(
    private readonly reviews: StaffPartnershipReviewsService,
    private readonly publication: OpportunityPublicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Staff inbox for partnership requests under review' })
  @ApiOkResponse({ type: PartnershipRequestListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<PartnershipRequestListResponseDto> {
    return this.reviews.list(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PartnershipRequestResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<PartnershipRequestResponseDto> {
    return this.reviews.get(auth.userId, id);
  }

  @Post(':id/decide')
  @ApiOkResponse({ type: PartnershipRequestResponseDto })
  decide(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideListingReviewDto,
  ): Promise<PartnershipRequestResponseDto> {
    return this.reviews.decide(auth.userId, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @StaffRoles(StaffRole.admin)
  @ApiOperation({
    summary: 'Publish an approved partnership opportunity',
    description:
      'Active admin only. Sets visibility to public and publishedAt. Does not approve the request or expose private contact data.',
  })
  @ApiOkResponse({ type: PartnershipRequestResponseDto })
  @ApiConflictResponse({ description: 'Not approved, already published, or not eligible' })
  async publish(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<PartnershipRequestResponseDto> {
    await this.publication.publishPartnership(auth.userId, id);
    return this.reviews.get(auth.userId, id);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'List partnership applications linked to this request (staff coordination)' })
  listApplications(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query() query: ListFarmsQueryDto,
  ) {
    return this.reviews.listLinkedApplications(auth.userId, id, query);
  }
}
