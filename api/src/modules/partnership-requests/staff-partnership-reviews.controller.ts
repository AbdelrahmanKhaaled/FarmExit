import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { StaffOnly } from '../authorization/staff.decorators';
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
  constructor(private readonly reviews: StaffPartnershipReviewsService) {}

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
