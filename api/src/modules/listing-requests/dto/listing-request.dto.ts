import { Type as ContentType } from 'class-transformer';
import { ValidateNested as ContentNested } from 'class-validator';
import { LocalizedContentDto } from '../../../common/dto/localized-content.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListingType } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';
import { MAX_LISTING_POUNDS } from '../listing-prices';

const LISTING_TYPES = [ListingType.sale, ListingType.rent] as const;
const MAX_HIGHLIGHTS = 3;
const present = (value: unknown): boolean => value !== null && value !== undefined;

const trimList = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) return value;
  return value.map((item: unknown) => (typeof item === 'string' ? item.trim() : item));
};

/** JSON numbers stay numbers. Numeric strings are accepted. null stays null so a price can be cleared. */
const toPounds = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

/**
 * Fields the owner may state on a private draft. Never accepted: status, visibility, slug, request number, currency,
 * farm id, sale terms, exchange, installments, or anything that would publish the listing.
 */
export class CreateListingRequestDto {
  @IsOptional() @ContentNested() @ContentType(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
  @ApiProperty({ enum: LISTING_TYPES, example: 'sale' })
  @IsIn(LISTING_TYPES)
  listingType: (typeof LISTING_TYPES)[number];

  @ApiPropertyOptional({
    nullable: true,
    example: 12000000,
    description: 'Sale only. Whole Egyptian pounds. Omit or null when not stated.',
  })
  @IsOptional()
  @Transform(toPounds)
  @ValidateIf((_, value) => present(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  askingPrice?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 18000,
    description: 'Rent only. Whole Egyptian pounds per feddan per year.',
  })
  @IsOptional()
  @Transform(toPounds)
  @ValidateIf((_, value) => present(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  annualRentPerFeddan?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Sale only. Owner-stated price per feddan. Never calculated by the server.',
  })
  @IsOptional()
  @Transform(toPounds)
  @ValidateIf((_, value) => present(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  statedSalePricePerFeddan?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 60 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  availability?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  listingDescription?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: MAX_HIGHLIGHTS, description: 'Up to 3 short phrases, as written.' })
  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(MAX_HIGHLIGHTS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  highlights?: string[];
}

/** Submit takes no fields. Any body property is rejected so the client cannot set status or visibility. */
export class SubmitListingRequestDto {}

export class UpdateListingRequestDto {
  @IsOptional() @ContentNested() @ContentType(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
  @ApiPropertyOptional({ enum: LISTING_TYPES })
  @IsOptional()
  @IsIn(LISTING_TYPES)
  listingType?: (typeof LISTING_TYPES)[number];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(toPounds)
  @ValidateIf((_, value) => present(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  askingPrice?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(toPounds)
  @ValidateIf((_, value) => present(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  annualRentPerFeddan?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(toPounds)
  @ValidateIf((_, value) => present(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  statedSalePricePerFeddan?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 60 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  availability?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  listingDescription?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: MAX_HIGHLIGHTS })
  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(MAX_HIGHLIGHTS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  highlights?: string[];
}

/** Owner-facing review feedback. The reviewer id, name and contact details are not included. */
export class ListingReviewFeedbackDto {
  @ApiProperty({ enum: ['approved', 'changesRequested', 'rejected'] }) decision: string;
  @ApiProperty({ nullable: true, type: String }) comment: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
}

export class ListingRequestResponseDto {
  @ApiProperty({ nullable: true }) localizedContent?: unknown;
  @ApiProperty({ example: '4' }) id: string;
  @ApiProperty({ example: 'FL1A2B3C4D5E6F' }) requestNumber: string;
  @ApiProperty({ example: '12' }) farmId: string;
  @ApiProperty() farmName: string;
  @ApiProperty({ example: 12.5, description: 'The farm record area. Not supplied on the listing.' })
  areaFeddan: number;
  @ApiProperty({ enum: LISTING_TYPES }) listingType: string;
  @ApiProperty({ example: 'draft', description: 'A listing request starts as draft. This API does not publish it.' })
  status: string;
  @ApiProperty({ example: 'private' }) visibility: string;
  @ApiProperty({ nullable: true, type: Number }) askingPrice: number | null;
  @ApiProperty({ nullable: true, type: Number }) annualRentPerFeddan: number | null;
  @ApiProperty({ nullable: true, type: Number }) statedSalePricePerFeddan: number | null;
  @ApiProperty({ example: 'EGP' }) currency: string;
  @ApiProperty({ nullable: true, type: String }) availability: string | null;
  @ApiProperty({ nullable: true, type: String }) listingDescription: string | null;
  @ApiProperty({ type: [String] }) highlights: string[];
  @ApiProperty({
    description: 'Server-generated. There is no public page for this slug.',
  })
  slug: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) updatedAt: string | null;
  @ApiProperty({
    type: () => [ListingReviewFeedbackDto],
    description:
      'FarmExit review comments for the owner. Empty until a reviewer records a decision. No staff contact details.',
  })
  reviews: ListingReviewFeedbackDto[];
}

export class ListingRequestListResponseDto {
  @ApiProperty({ type: [ListingRequestResponseDto] }) items: ListingRequestResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}
