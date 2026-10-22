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
import {
  FarmManagementRequestListResponseDto,
  FarmManagementRequestResponseDto,
} from './dto/farm-management-request.dto';
import { StaffFarmManagementReviewsService } from './staff-farm-management-reviews.service';

@ApiTags('staff-farm-management-requests')
@Controller('staff/farm-management-requests')
@StaffOnly()
export class StaffFarmManagementReviewsController {
  constructor(
    private readonly reviews: StaffFarmManagementReviewsService,
    private readonly publication: OpportunityPublicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Staff inbox for farm management requests under review' })
  @ApiOkResponse({ type: FarmManagementRequestListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<FarmManagementRequestListResponseDto> {
    return this.reviews.list(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: FarmManagementRequestResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmManagementRequestResponseDto> {
    return this.reviews.get(auth.userId, id);
  }

  @Post(':id/decide')
  @ApiOkResponse({ type: FarmManagementRequestResponseDto })
  decide(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideListingReviewDto,
  ): Promise<FarmManagementRequestResponseDto> {
    return this.reviews.decide(auth.userId, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @StaffRoles(StaffRole.admin)
  @ApiOperation({
    summary: 'Publish an approved management opportunity',
    description:
      'Active admin only. Sets visibility to public and publishedAt. Does not approve the request or expose private farm data.',
  })
  @ApiOkResponse({ type: FarmManagementRequestResponseDto })
  @ApiConflictResponse({ description: 'Not approved, already published, or not eligible' })
  async publish(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<FarmManagementRequestResponseDto> {
    await this.publication.publishManagement(auth.userId, id);
    return this.reviews.get(auth.userId, id);
  }
}
