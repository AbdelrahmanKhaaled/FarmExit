import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const LISTING_PUBLICATION_FILTERS = ['sale', 'rent', 'none', 'saleAndRent'] as const;
export type ListingPublicationFilter = (typeof LISTING_PUBLICATION_FILTERS)[number];

export class AdminListFarmsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Search farm name or governorate' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by farm_status' })
  @IsOptional()
  @IsString()
  farmStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by governorate (exact match)' })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiPropertyOptional({ enum: LISTING_PUBLICATION_FILTERS, description: 'Authorized published listing state; applied before pagination' })
  @IsOptional()
  @IsIn(LISTING_PUBLICATION_FILTERS)
  listingPublication?: ListingPublicationFilter;
}

export class AdminPublishedListingDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['sale', 'rent'] }) listingType!: string;
}

export class AdminFarmRowDto {
  @ApiProperty({ type: [AdminPublishedListingDto] })
  publishedListings!: { id: string; listingType: string }[];
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  governorate!: string;

  @ApiPropertyOptional()
  areaName?: string | null;

  @ApiProperty()
  areaFeddan!: string;

  @ApiProperty()
  farmStatus!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminFarmRelationshipDto {
  @ApiProperty()
  relationshipRole!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  fullName?: string | null;
}

export class AdminFarmRequestSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requestType!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminFarmDetailDto {
  @ApiProperty({ type: [AdminPublishedListingDto] })
  publishedListings!: { id: string; listingType: string }[];
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  governorate!: string;

  @ApiPropertyOptional()
  areaName?: string | null;

  @ApiProperty()
  areaFeddan!: string;

  @ApiProperty()
  farmStatus!: string;

  @ApiProperty()
  farmType!: string;

  @ApiPropertyOptional()
  mainActivity?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  updatedAt?: string | null;

  @ApiProperty({ type: [AdminFarmRelationshipDto] })
  relationships!: AdminFarmRelationshipDto[];

  @ApiProperty()
  facilityCount!: number;

  @ApiProperty({ type: [AdminFarmRequestSummaryDto] })
  recentRequests!: AdminFarmRequestSummaryDto[];
}

export class AdminFarmListResponseDto {
  @ApiProperty({ type: [AdminFarmRowDto] })
  items!: AdminFarmRowDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
