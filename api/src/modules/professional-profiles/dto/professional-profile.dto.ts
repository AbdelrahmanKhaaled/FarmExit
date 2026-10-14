import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProfessionalType, VerificationStatus } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';

export class UpdateProfessionalProfileDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  headline?: string;

  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  bio?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  baseGovernorate?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  experienceSummary?: string;
}

export class CreateProfessionalCapabilityDto {
  @ApiProperty({ enum: [ProfessionalType.farmManager, ProfessionalType.agriculturalEngineer] })
  @IsIn([ProfessionalType.farmManager, ProfessionalType.agriculturalEngineer])
  professionalType!: ProfessionalType;
}

export class ExpertiseItemDto {
  @ApiProperty({ maxLength: 80 }) @Transform(trim) @IsString() @MaxLength(80) expertiseType!: string;
  @ApiProperty({ maxLength: 150 }) @Transform(trim) @IsString() @MaxLength(150) expertiseValue!: string;
}

export class UpdateProfessionalCapabilityDto {
  @ApiPropertyOptional({ type: [ExpertiseItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ExpertiseItemDto)
  expertise?: ExpertiseItemDto[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  serviceAreas?: string[];
}

export class ProfessionalCapabilityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ProfessionalType }) professionalType!: ProfessionalType;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus!: VerificationStatus;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) verifiedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) notApprovedReason!: string | null;
  @ApiProperty({ type: [ExpertiseItemDto] }) expertise!: ExpertiseItemDto[];
  @ApiProperty({ type: [String] }) serviceAreas!: string[];
}

export class ProfessionalProfileResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) headline!: string | null;
  @ApiProperty({ nullable: true, type: String }) bio!: string | null;
  @ApiProperty({ nullable: true, type: String }) baseGovernorate!: string | null;
  @ApiProperty({ nullable: true, type: Number }) yearsExperience!: number | null;
  @ApiProperty({ nullable: true, type: String }) experienceSummary!: string | null;
  @ApiProperty({ type: [ProfessionalCapabilityResponseDto] }) capabilities!: ProfessionalCapabilityResponseDto[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) updatedAt!: string | null;
}
