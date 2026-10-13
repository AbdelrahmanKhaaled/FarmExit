import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { trim } from './create-farm.dto';

/** Draft facility taxonomy from the approved ERD note (still pending business validation). */
export const FACILITY_TYPES = [
  'cold_storage_freezing',
  'produce_storage',
  'agricultural_processing_packing',
  'agricultural_service_facility',
] as const;
export type FacilityTypeValue = (typeof FACILITY_TYPES)[number];

/**
 * Client-settable facility fields. Never accepted: farm id (comes from the route), owner, status (always `draft`),
 * coordinates, capacity/services JSON (shapes not approved), media.
 */
export class CreateFacilityDto {
  @ApiProperty({ enum: FACILITY_TYPES })
  @IsIn(FACILITY_TYPES)
  facilityType: FacilityTypeValue;

  @ApiProperty({ maxLength: 200 })
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

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  governorate?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  areaName?: string | null;
}

const present = (_: unknown, value: unknown): boolean => value !== undefined;

export class UpdateFacilityDto {
  @ApiPropertyOptional({ enum: FACILITY_TYPES })
  @ValidateIf(present)
  @IsIn(FACILITY_TYPES)
  facilityType?: FacilityTypeValue;

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

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  governorate?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  areaName?: string | null;
}

export class FacilityResponseDto {
  @ApiProperty({ example: '5' }) id: string;
  @ApiProperty({ example: '12' }) farmId: string;
  @ApiProperty({ enum: FACILITY_TYPES, type: String }) facilityType: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ nullable: true, type: String }) governorate: string | null;
  @ApiProperty({ nullable: true, type: String }) areaName: string | null;
  @ApiProperty({ example: 'draft', description: 'Record state. Facilities are never published through this API.' })
  status: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) updatedAt: string | null;
}

export class FacilityListResponseDto {
  @ApiProperty({ type: [FacilityResponseDto] }) items: FacilityResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}
