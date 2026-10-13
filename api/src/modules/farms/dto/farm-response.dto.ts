import { ApiProperty } from '@nestjs/swagger';
import { FarmRelationshipRole, FarmType } from '../../../generated/prisma/enums';
import { ENERGY_SOURCES, FARM_TYPES, IRRIGATION_METHODS, WATER_SOURCES } from './create-farm.dto';

/**
 * Explicit, owner-safe view of a farm. Deliberately absent: creator/owner ids and contact details, private pin and
 * map coordinates, JSON detail blobs. `farmStatus` is an internal record state, not a listing, verification or
 * FarmExit Score claim.
 */
export class FarmResponseDto {
  @ApiProperty({ example: '12', description: 'Farm id (decimal string).' })
  id: string;

  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ enum: FARM_TYPES }) farmType: FarmType;
  @ApiProperty({ nullable: true, type: String }) mainActivity: string | null;
  @ApiProperty({ example: 12.5 }) areaFeddan: number;
  @ApiProperty() governorate: string;
  @ApiProperty({ nullable: true, type: String }) areaName: string | null;
  @ApiProperty({ enum: WATER_SOURCES, nullable: true, type: String }) waterSource: string | null;
  @ApiProperty({ enum: IRRIGATION_METHODS, nullable: true, type: String }) irrigationMethod: string | null;
  @ApiProperty({ enum: ENERGY_SOURCES, nullable: true, type: String }) energySource: string | null;
  @ApiProperty({ nullable: true, type: String }) soilType: string | null;
  @ApiProperty({ example: 'active', description: 'Record state only. Not a public listing.' }) farmStatus: string;

  @ApiProperty({
    enum: FarmRelationshipRole,
    isArray: true,
    description: "The caller's own active roles on THIS farm (empty for FarmExit staff without a farm role).",
  })
  myRoles: FarmRelationshipRole[];

  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) updatedAt: string | null;
}

export class FarmListResponseDto {
  @ApiProperty({ type: [FarmResponseDto] }) items: FarmResponseDto[];
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) pageSize: number;
  @ApiProperty({ example: 1 }) total: number;
}
