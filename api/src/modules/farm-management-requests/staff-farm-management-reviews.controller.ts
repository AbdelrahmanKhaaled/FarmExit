import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { StaffOnly } from '../authorization/staff.decorators';
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
  constructor(private readonly reviews: StaffFarmManagementReviewsService) {}

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
}
