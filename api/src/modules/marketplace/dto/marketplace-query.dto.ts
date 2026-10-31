import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
} from 'class-validator';
import { ListingType } from '../../../generated/prisma/enums';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../farms/dto/list-farms-query.dto';
import { MAX_LISTING_POUNDS } from '../../listing-requests/listing-prices';
import { MARKETPLACE_SORTS } from '../marketplace-query';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

function IsAreaFeddan(): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isAreaFeddan',
      target: target.constructor,
      propertyName: String(propertyName),
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined) return true;
          if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 9_999_999_999.99)
            return false;
          return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
        },
        defaultMessage: () => 'Area must be a number of feddans with at most two decimal places',
      },
    });
  };
}

export class MarketplaceQueryDto {
  @IsOptional() @IsIn(['true', 'false']) quickSale?: 'true' | 'false';
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(['vegetable', 'fruit', 'livestock', 'mixed'], { each: true })
  farmTypes?: string[];
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['well', 'canal'], { each: true })
  waterSources?: string[];
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(['drip', 'sprinkler', 'gravity'], { each: true })
  irrigationMethods?: string[];
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(['electricity', 'solar', 'diesel'], { each: true })
  energySources?: string[];
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsIn(['fruits', 'citrus', 'fieldCrops', 'palms', 'exportCrops'], { each: true })
  cropTypes?: string[];

  @ApiPropertyOptional({ description: 'Comma-separated installment,exchange. OR within group; AND with asset group.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['installment', 'exchange'], { each: true })
  saleMethods?: ('installment' | 'exchange')[];

  @ApiPropertyOptional({
    description: 'Comma-separated factory,villa,apartment,car. Requires explicit exchange eligibility.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(['factory', 'villa', 'apartment', 'car'], { each: true })
  exchangeAssetTypes?: ('factory' | 'villa' | 'apartment' | 'car')[];

  @ApiPropertyOptional({
    maxLength: 100,
    description:
      'Matches farm name, governorate, general area, or listing description. No default price band is applied.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: [ListingType.sale, ListingType.rent] })
  @IsOptional()
  @IsIn([ListingType.sale, ListingType.rent])
  listingType?: 'sale' | 'rent';

  @ApiPropertyOptional({ maxLength: 120, description: 'Exact governorate, as stored on the farm.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  governorate?: string;

  @ApiPropertyOptional({ maxLength: 120, description: 'Exact general area name. Not a coordinate.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  area?: string;

  @ApiPropertyOptional({ description: 'Minimum area in feddan. Up to two decimal places.' })
  @IsOptional()
  @Type(() => Number)
  @IsAreaFeddan()
  minArea?: number;

  @ApiPropertyOptional({ description: 'Maximum area in feddan. Up to two decimal places.' })
  @IsOptional()
  @Type(() => Number)
  @IsAreaFeddan()
  maxArea?: number;

  @ApiPropertyOptional({
    description: 'Minimum whole Egyptian pounds. Sale filters askingPrice; rent filters annualRentPerFeddan.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_LISTING_POUNDS)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum whole Egyptian pounds. Sale filters askingPrice; rent filters annualRentPerFeddan.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_LISTING_POUNDS)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: MARKETPLACE_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(MARKETPLACE_SORTS)
  sort?: (typeof MARKETPLACE_SORTS)[number];

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
