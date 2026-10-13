import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';
import { PublicListingDto, PublicListingListDto, SavedListingListDto } from './dto/public-listing.dto';
import { SaveListingRequestDto } from './dto/save-listing.dto';
import { MarketplaceService } from './marketplace.service';
import { SavedListingsService } from './saved-listings.service';

/** Public reads have no guard. Saved listings require a completed profile and stay on this controller. */
@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly saved: SavedListingsService,
  ) {}

  @Get('farms')
  @ApiOperation({
    summary: 'Published farm listings',
    description:
      'No authentication. Only published public listings on farms that have not been deleted. ' +
      'Location is the governorate and general area. Images, contacts, coordinates, documents and scores are omitted.',
  })
  @ApiOkResponse({ type: PublicListingListDto })
  @ApiBadRequestResponse({ description: 'Invalid filter, sort, or page' })
  list(@Query() query: MarketplaceQueryDto): Promise<PublicListingListDto> {
    return this.marketplace.list(query);
  }

  @Get('saved')
  @RequireCompletedProfile()
  @ApiOperation({
    summary: 'Listings saved by the signed-in user',
    description:
      'Only bookmarks that are still published, public, and on a farm that has not been deleted. ' +
      'An unpublished listing is left out. Same fields as a marketplace card. No images or contacts.',
  })
  @ApiOkResponse({ type: SavedListingListDto })
  savedList(@CurrentAuth() auth: AuthContext): Promise<SavedListingListDto> {
    return this.saved.list(auth.userId);
  }

  @Post('saved/:listingId')
  @HttpCode(HttpStatus.OK)
  @RequireCompletedProfile()
  @ApiOperation({
    summary: 'Save a published listing',
    description:
      'One row per user and listing. Saving again returns the same public listing. ' +
      'A sale and a rent on one farm are saved separately. Drafts and private listings are not found.',
  })
  @ApiOkResponse({ type: PublicListingDto })
  @ApiBadRequestResponse({ description: 'Invalid listing id or unknown fields' })
  @ApiNotFoundResponse({ description: 'No published public listing with this id' })
  save(
    @CurrentAuth() auth: AuthContext,
    @Param('listingId', ParseBigIntIdPipe) listingId: bigint,
    @Body() dto: SaveListingRequestDto,
  ): Promise<PublicListingDto> {
    void dto;
    return this.saved.save(auth.userId, listingId);
  }

  @Delete('saved/:listingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireCompletedProfile()
  @ApiOperation({
    summary: 'Remove one of the signed-in user\'s saved listings',
    description: 'Another user\'s bookmark is not found. The listing itself is not changed.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Invalid listing id' })
  @ApiNotFoundResponse({ description: 'This user has not saved this listing' })
  remove(@CurrentAuth() auth: AuthContext, @Param('listingId', ParseBigIntIdPipe) listingId: bigint): Promise<void> {
    return this.saved.remove(auth.userId, listingId);
  }

  @Get('farms/:slug')
  @ApiOperation({
    summary: 'One published farm listing',
    description: '404 for an unknown, unpublished, private, or deleted-farm slug. Same fields as a marketplace card.',
  })
  @ApiOkResponse({ type: PublicListingDto })
  @ApiBadRequestResponse({ description: 'Invalid slug' })
  @ApiNotFoundResponse({ description: 'No public listing for this slug' })
  get(@Param('slug') slug: string): Promise<PublicListingDto> {
    return this.marketplace.getBySlug(slug);
  }
}
