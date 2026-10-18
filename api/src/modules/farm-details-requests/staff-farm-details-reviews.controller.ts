import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffOnly, StaffPermissions } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { DecideListingReviewDto } from '../listing-requests/dto/staff-listing-review.dto';
import {
  FarmDetailsRequestListResponseDto,
  FarmDetailsRequestResponseDto,
} from './dto/farm-details-request.dto';
import { StaffFarmDetailsReviewsService } from './staff-farm-details-reviews.service';

@ApiTags('staff-farm-details-requests')
@Controller('staff/farm-details-requests')
@StaffOnly()
@StaffPermissions(StaffPermission.RequestsRead)
export class StaffFarmDetailsReviewsController {
  constructor(private readonly reviews: StaffFarmDetailsReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Case agent inbox of farm details inquiries under review' })
  @ApiOkResponse({ type: FarmDetailsRequestListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<FarmDetailsRequestListResponseDto> {
    return this.reviews.list(auth.userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: FarmDetailsRequestResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmDetailsRequestResponseDto> {
    return this.reviews.get(auth.userId, id);
  }

  @Post(':id/reviews')
  @HttpCode(HttpStatus.OK)
  @StaffPermissions(StaffPermission.RequestsRead)
  @ApiOkResponse({ type: FarmDetailsRequestResponseDto })
  decide(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideListingReviewDto,
  ): Promise<FarmDetailsRequestResponseDto> {
    return this.reviews.decide(auth.userId, id, dto);
  }
}
