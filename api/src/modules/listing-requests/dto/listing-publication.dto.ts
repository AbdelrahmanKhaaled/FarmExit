import { ApiProperty } from '@nestjs/swagger';

/** An approved listing an admin may publish. Location is governorate and general area only. */
export class PublicationListingDto {
  @ApiProperty({ example: '4' }) id: string;
  @ApiProperty() requestNumber: string;
  @ApiProperty() farmId: string;
  @ApiProperty() farmName: string;
  @ApiProperty({ description: 'Public governorate. Exact coordinates are not included.' }) governorate: string;
  @ApiProperty({ nullable: true, type: String, description: 'General area name. Not a map pin.' })
  areaName: string | null;
  @ApiProperty({ example: 12.5 }) areaFeddan: number;
  @ApiProperty({ enum: ['sale', 'rent'] }) listingType: string;
  @ApiProperty({ example: 'approved' }) status: string;
  @ApiProperty({ example: 'private' }) visibility: string;
  @ApiProperty({ nullable: true, type: Number }) askingPrice: number | null;
  @ApiProperty({ nullable: true, type: Number }) annualRentPerFeddan: number | null;
  @ApiProperty({ nullable: true, type: Number }) statedSalePricePerFeddan: number | null;
  @ApiProperty({ example: 'EGP' }) currency: string;
  @ApiProperty({ nullable: true, type: String }) availability: string | null;
  @ApiProperty({ nullable: true, type: String }) listingDescription: string | null;
  @ApiProperty({ type: [String] }) highlights: string[];
  @ApiProperty() slug: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) publishedAt: string | null;
}

export class PublicationQueueResponseDto {
  @ApiProperty({ type: [PublicationListingDto] }) items: PublicationListingDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}

/** Empty on purpose. Status, visibility and publishedAt are set by the server. */
export class PublishListingRequestDto {}
