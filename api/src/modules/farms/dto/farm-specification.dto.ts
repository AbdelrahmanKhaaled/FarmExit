import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ENERGY_SOURCES, IRRIGATION_METHODS, trim, WATER_SOURCES } from './create-farm.dto';

/** Confirmed crop type taxonomy (web/src/lib/domain/enums.ts, 4n). */
export const CROP_TYPES = ['fruits', 'citrus', 'fieldCrops', 'palms', 'exportCrops'] as const;
export type CropTypeValue = (typeof CROP_TYPES)[number];
/** Owner-stated equipment/amenities shown in the approved Add Farm design; not service-facility types. */
export const FARM_AMENITIES = [
  'irrigationNetwork',
  'machineryEquipment',
  'packingStorage',
  'seedlingNursery',
  'powerConnection',
  'housing',
] as const;

/**
 * PROVISIONAL shape of `farms.production_details`: the approved ERD stores free JSON with no defined keys. Only
 * these owner-stated plain-text keys are accepted; anything else is rejected. `null` removes a key. Keys that are
 * not listed in a request are never touched. No figures, scores, verification or yield claims are modelled.
 */
export class ProductionDetailsPatchDto {
  @ApiPropertyOptional({
    nullable: true,
    maxLength: 1000,
    description: 'What the farm currently produces (owner-stated).',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  currentProduction?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 300, description: 'Harvest seasons (owner-stated).' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  harvestSeasons?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000, description: 'Other owner notes about production.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  notes?: string | null;
}

export const PRODUCTION_DETAIL_KEYS = ['currentProduction', 'harvestSeasons', 'notes'] as const;

export class ProductionDetailsDto {
  @ApiProperty({ nullable: true, type: String }) currentProduction: string | null;
  @ApiProperty({ nullable: true, type: String }) harvestSeasons: string | null;
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
}

/** Partial update: omitted properties are untouched. */
export class UpdateFarmSpecificationDto {
  @ApiPropertyOptional({
    enum: FARM_AMENITIES,
    isArray: true,
    description: 'Complete selected set; [] clears only this set.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(FARM_AMENITIES.length)
  @ArrayUnique()
  @IsIn(FARM_AMENITIES, { each: true })
  amenities?: string[];
  @ApiPropertyOptional({ enum: WATER_SOURCES, nullable: true })
  @IsOptional()
  @IsIn(WATER_SOURCES)
  waterSource?: (typeof WATER_SOURCES)[number] | null;

  @ApiPropertyOptional({ enum: IRRIGATION_METHODS, nullable: true })
  @IsOptional()
  @IsIn(IRRIGATION_METHODS)
  irrigationMethod?: (typeof IRRIGATION_METHODS)[number] | null;

  @ApiPropertyOptional({ enum: ENERGY_SOURCES, nullable: true })
  @IsOptional()
  @IsIn(ENERGY_SOURCES)
  energySource?: (typeof ENERGY_SOURCES)[number] | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  soilType?: string | null;

  @ApiPropertyOptional({
    enum: CROP_TYPES,
    isArray: true,
    description: 'The COMPLETE set of crop types stated by the owner (replaces the previous set). [] clears it.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CROP_TYPES.length)
  @ArrayUnique()
  @IsIn(CROP_TYPES, { each: true })
  cropTypes?: CropTypeValue[];

  @ApiPropertyOptional({ type: ProductionDetailsPatchDto, description: 'Merged key by key into the stored details.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductionDetailsPatchDto)
  productionDetails?: ProductionDetailsPatchDto;
}

export class FarmSpecificationResponseDto {
  @ApiProperty({ enum: FARM_AMENITIES, isArray: true }) amenities: string[];
  @ApiProperty({ example: '12' }) farmId: string;
  @ApiProperty({ enum: WATER_SOURCES, nullable: true, type: String }) waterSource: string | null;
  @ApiProperty({ enum: IRRIGATION_METHODS, nullable: true, type: String }) irrigationMethod: string | null;
  @ApiProperty({ enum: ENERGY_SOURCES, nullable: true, type: String }) energySource: string | null;
  @ApiProperty({ nullable: true, type: String }) soilType: string | null;
  @ApiProperty({ enum: CROP_TYPES, isArray: true }) cropTypes: string[];
  @ApiProperty({ type: ProductionDetailsDto }) productionDetails: ProductionDetailsDto;
  @ApiProperty({ description: 'Whether the caller (active owner or manager) may edit.' }) canEdit: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) updatedAt: string | null;
}
