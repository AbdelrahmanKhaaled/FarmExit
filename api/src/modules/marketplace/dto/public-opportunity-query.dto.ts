import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { FarmType, ProfessionalNeed } from '../../../generated/prisma/enums';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../farms/dto/list-farms-query.dto';
import { PUBLIC_OPPORTUNITY_SORTS } from '../public-opportunity-query';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class PublicOpportunityQueryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  governorate?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  area?: string;

  @ApiPropertyOptional({ enum: FarmType })
  @IsOptional()
  @IsIn([FarmType.vegetable, FarmType.fruit, FarmType.livestock, FarmType.mixed])
  farmType?: FarmType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9999999999.99)
  minArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9999999999.99)
  maxArea?: number;

  @ApiPropertyOptional({ enum: ProfessionalNeed })
  @IsOptional()
  @IsIn([ProfessionalNeed.farmManager, ProfessionalNeed.agriculturalEngineer, ProfessionalNeed.both])
  professionalNeed?: ProfessionalNeed;

  @ApiPropertyOptional({ description: 'Matches a value stored in management_types JSON.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  managementType?: string;

  @ApiPropertyOptional({ description: 'entryLevel | experienced | expert' })
  @IsOptional()
  @IsIn(['entryLevel', 'experienced', 'expert'])
  experienceLevel?: string;

  @ApiPropertyOptional({ description: 'Exact member of partnership objective JSON.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  objective?: string;

  @ApiPropertyOptional({ description: 'Exact member of accepted_partner_types JSON.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  partnerType?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: PUBLIC_OPPORTUNITY_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(PUBLIC_OPPORTUNITY_SORTS)
  sort?: (typeof PUBLIC_OPPORTUNITY_SORTS)[number];

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
