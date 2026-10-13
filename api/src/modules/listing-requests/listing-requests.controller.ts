import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  CreateListingRequestDto,
  ListingRequestListResponseDto,
  ListingRequestResponseDto,
  SubmitListingRequestDto,
  UpdateListingRequestDto,
} from './dto/listing-request.dto';
import { ListingRequestsService } from './listing-requests.service';

const PRIVATE =
  'Private to the owner who created it. Not a public listing: nothing is published, and FarmExit staff mediate any later negotiation.';

/** HTTP only. Owner checks and draft rules live in the service. */
@ApiTags('listing-requests')
@Controller('farms/:id/listing-requests')
@RequireCompletedProfile()
export class FarmListingRequestsController {
  constructor(private readonly listings: ListingRequestsService) {}

  @Post()
  @ApiParam({ name: 'id', example: '12', description: 'Farm id' })
  @ApiOperation({
    summary: 'Create a private sale or rent listing request',
    description:
      'Only an active owner of this farm. The request is created as a draft with private visibility. ' +
      'It does not publish the farm, verify legal ownership, or start a payment.',
  })
  @ApiCreatedResponse({ type: ListingRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid prices, listing type, area or unknown fields' })
  @ApiForbiddenResponse({ description: 'Caller has a farm role other than owner' })
  @ApiNotFoundResponse({ description: 'No such farm, or the caller has no role on it' })
  create(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: CreateListingRequestDto,
  ): Promise<ListingRequestResponseDto> {
    return this.listings.create(auth.userId, id, dto);
  }
}

@ApiTags('listing-requests')
@Controller('listing-requests')
@RequireCompletedProfile()
export class ListingRequestsController {
  constructor(private readonly listings: ListingRequestsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'The current owner’s listing requests', description: PRIVATE })
  @ApiOkResponse({ type: ListingRequestListResponseDto })
  listMine(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<ListingRequestListResponseDto> {
    return this.listings.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '4', description: 'Listing request id' })
  @ApiOperation({ summary: 'One private listing request', description: PRIVATE })
  @ApiOkResponse({ type: ListingRequestResponseDto })
  @ApiNotFoundResponse({ description: 'No such request for this caller' })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<ListingRequestResponseDto> {
    return this.listings.get(auth.userId, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', example: '4' })
  @ApiOperation({
    summary: 'Update a draft or a listing with requested changes',
    description:
      `${PRIVATE} A draft or a changesRequested listing can be changed. A listing under review, approved, ` +
      'rejected or published cannot. Status, visibility and publication are not accepted.',
  })
  @ApiOkResponse({ type: ListingRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid fields, or nothing to update' })
  @ApiConflictResponse({ description: 'The request is under review, approved, rejected or published' })
  @ApiNotFoundResponse({ description: 'No such request for this caller' })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateListingRequestDto,
  ): Promise<ListingRequestResponseDto> {
    return this.listings.update(auth.userId, id, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', example: '4' })
  @ApiOperation({
    summary: 'Submit or resubmit a listing request for FarmExit review',
    description:
      'Only the active owner who created it. Moves draft or changesRequested to underFarmExitReview, sets submittedAt, ' +
      'and appends status history. Earlier reviews are kept. Visibility stays private and publishedAt stays empty. ' +
      'Submitting again from review, or after approval or rejection, returns 409. This does not publish the listing.',
  })
  @ApiOkResponse({ type: ListingRequestResponseDto })
  @ApiBadRequestResponse({ description: 'The stored sale/rent data or the farm area no longer meets the draft rules' })
  @ApiConflictResponse({ description: 'The request is not a draft and does not have requested changes' })
  @ApiForbiddenResponse({ description: 'The creator no longer has the owner role' })
  @ApiNotFoundResponse({ description: 'No such request for this caller' })
  submit(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: SubmitListingRequestDto,
  ): Promise<ListingRequestResponseDto> {
    void dto;
    return this.listings.submit(auth.userId, id);
  }
}
