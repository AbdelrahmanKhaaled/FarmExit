import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { StaffOnly } from '../authorization/staff.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { DecideListingReviewDto } from '../listing-requests/dto/staff-listing-review.dto';
import {
  ProfessionalVerificationRequestListResponseDto,
  ProfessionalVerificationRequestResponseDto,
} from './dto/professional-verification-request.dto';
import { StaffProfessionalVerificationReviewsService } from './staff-professional-verification-reviews.service';

@ApiTags('staff-professional-verification-requests')
@Controller('staff/professional-verification-requests')
@StaffOnly()
export class StaffProfessionalVerificationReviewsController {
  constructor(private readonly reviews: StaffProfessionalVerificationReviewsService) {}

  @Get()
  @ApiOkResponse({ type: ProfessionalVerificationRequestListResponseDto })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<ProfessionalVerificationRequestListResponseDto> {
    return this.reviews.list(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProfessionalVerificationRequestResponseDto })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    return this.reviews.get(auth.userId, id);
  }

  @Post(':id/decide')
  @ApiOkResponse({ type: ProfessionalVerificationRequestResponseDto })
  decide(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: DecideListingReviewDto,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    return this.reviews.decide(auth.userId, id, dto);
  }
}
