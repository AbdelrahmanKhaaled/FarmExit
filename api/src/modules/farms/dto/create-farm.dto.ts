import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { FarmType } from '../../../generated/prisma/enums';

/** Confirmed vocabularies (web/src/lib/domain/enums.ts). */
export const WATER_SOURCES = ['well', 'canal'] as const;
export const IRRIGATION_METHODS = ['drip', 'sprinkler', 'gravity'] as const;
export const ENERGY_SOURCES = ['electricity', 'solar', 'diesel'] as const;
export const FARM_TYPES = Object.values(FarmType);
export const MAX_AREA_FEDDAN = 9_999_999_999.99; // DECIMAL(12,2)

export const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

/**
 * The ONLY fields a client may set when creating a farm. Owner, creator, relationship role/status, farm status,
 * precise location and public-map coordinates are never accepted (the global pipe rejects unknown fields).
 */
export class CreateFarmDto {
  @ApiProperty({ example: 'Wadi El Natrun Orchard', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({ enum: FARM_TYPES, example: 'fruit' })
  @IsIn(FARM_TYPES)
  farmType: FarmType;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  mainActivity?: string | null;

  @ApiProperty({ example: 12.5, description: 'Area in feddan, greater than 0, at most 2 decimals.' })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(MAX_AREA_FEDDAN)
  areaFeddan: number;

  @ApiProperty({ example: 'Beheira', maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  governorate: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  areaName?: string | null;

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
  @MaxLength(120)
  soilType?: string | null;
}
