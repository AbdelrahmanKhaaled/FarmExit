import { ApiProperty } from '@nestjs/swagger';

/** A published listing a visitor may see. Same fields for a card and a detail page. */
export class PublicListingDto {
  @ApiProperty({ example: '4' }) id: string;
  @ApiProperty() slug: string;
  @ApiProperty() farmName: string;
  @ApiProperty({ description: 'Governorate only. Exact coordinates are not included.' }) governorate: string;
  @ApiProperty({ nullable: true, type: String, description: 'General area name. Not a map pin.' })
  areaName: string | null;
  @ApiProperty({ example: 12.5 }) areaFeddan: number;
  @ApiProperty({ enum: ['sale', 'rent'] }) listingType: string;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole Egyptian pounds. Null when not stated.' })
  askingPrice: number | null;
  @ApiProperty({ nullable: true, type: Number }) annualRentPerFeddan: number | null;
  @ApiProperty({ nullable: true, type: Number }) statedSalePricePerFeddan: number | null;
  @ApiProperty({ example: 'EGP' }) currency: string;
  @ApiProperty({ nullable: true, type: String }) availability: string | null;
  @ApiProperty({ nullable: true, type: String }) listingDescription: string | null;
  @ApiProperty({ type: [String] }) highlights: string[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) publishedAt: string | null;
}

export class PublicListingListDto {
  @ApiProperty({ type: [PublicListingDto] }) items: PublicListingDto[];
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) pageSize: number;
  @ApiProperty({ example: 1 }) total: number;
}

export class SavedListingListDto {
  @ApiProperty({ type: [PublicListingDto] }) items: PublicListingDto[];
}
