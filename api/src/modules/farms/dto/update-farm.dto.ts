import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { LocalizedContentDto } from '../../../common/dto/localized-content.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { FarmType } from '../../../generated/prisma/enums';
import {
  ENERGY_SOURCES,
  FARM_TYPES,
  IRRIGATION_METHODS,
  MAX_AREA_FEDDAN,
  trim,
  WATER_SOURCES,
} from './create-farm.dto';

/** `undefined` leaves a value alone; `null` clears optional fields. Required fields (name, type, area, governorate) can never be null. */
const present = (_: unknown, value: unknown): boolean => value !== undefined;

export class UpdateFarmDto {
  @IsOptional() @ValidateNested() @Type(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf(present)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ enum: FARM_TYPES })
  @ValidateIf(present)
  @IsIn(FARM_TYPES)
  farmType?: FarmType;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  mainActivity?: string | null;

  @ApiPropertyOptional({ example: 12.5 })
  @ValidateIf(present)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(MAX_AREA_FEDDAN)
  areaFeddan?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @ValidateIf(present)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  governorate?: string;

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
