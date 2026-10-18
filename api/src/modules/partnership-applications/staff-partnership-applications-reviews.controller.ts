import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { StaffOnly } from '../authorization/staff.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { DecideListingReviewDto } from '../listing-requests/dto/staff-listing-review.dto';
import {
  PartnershipApplicationListResponseDto,
  PartnershipApplicationResponseDto,
} from './dto/partnership-application.dto';
import { StaffPartnershipApplicationsReviewsService } from './staff-partnership-applications-reviews.service';

@ApiTags('staff-partnership-applications')
@Controller('staff/partnership-applications')
@StaffOnly()
export class StaffPartnershipApplicationsReviewsController {
  constructor(private readonly reviews: StaffPartnershipApplicationsReviewsService) {}

  @Get()
  @ApiOkResponse({ type: PartnershipApplicationListResponseDto })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<PartnershipApplicationListResponseDto> {
    return this.reviews.list(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PartnershipApplicationResponseDto })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<PartnershipApplicationResponseDto> {
    return this.reviews.get(auth.userId, id);
  }

  @Post(':id/decide')
  @ApiOkResponse({ type: PartnershipApplicationResponseDto })
  decide(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideListingReviewDto,
  ): Promise<PartnershipApplicationResponseDto> {
    return this.reviews.decide(auth.userId, id, dto);
  }
}
