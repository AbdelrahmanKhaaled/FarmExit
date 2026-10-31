import { ApiProperty } from '@nestjs/swagger';

/** A published listing a visitor may see. Same fields for a card and a detail page. */
export class PublicSaleEligibilityDto {
  @ApiProperty() saleMode: string;
  @ApiProperty() acceptsCashProposals: boolean;
  @ApiProperty() acceptsInstallmentProposals: boolean;
  @ApiProperty() acceptsExchangeProposals: boolean;
  @ApiProperty() exchangePreferenceScope: string;
  @ApiProperty({ type: [String] }) exchangeAssetTypes: string[];
}
export class PublicListingDto {
  @ApiProperty({ nullable: true }) localizedContent?: unknown;
  @ApiProperty({ nullable: true }) listingLocalizedContent?: unknown;
  @ApiProperty({ nullable: true }) farmType?: string | null;
  @ApiProperty({ nullable: true }) mainActivity?: string | null;
  @ApiProperty({ nullable: true }) waterSource?: string | null;
  @ApiProperty({ nullable: true }) irrigationMethod?: string | null;
  @ApiProperty({ nullable: true }) energySource?: string | null;
  @ApiProperty({ type: [String] }) cropTypes?: string[];
  @ApiProperty({ type: PublicSaleEligibilityDto, nullable: true }) saleEligibility: PublicSaleEligibilityDto | null;
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
  @ApiProperty({
    nullable: true,
    type: Number,
    description:
      'FarmExit Score on a 0–5 scale from the latest published FarmExit evaluation for this farm. ' +
      'Null when no score is authorized for public release.',
  })
  farmExitScore: number | null;
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
