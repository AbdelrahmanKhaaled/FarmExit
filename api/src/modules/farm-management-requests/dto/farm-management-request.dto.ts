import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProfessionalNeed } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';

export class CreateFarmManagementRequestDto {
  @ApiProperty({ enum: ProfessionalNeed })
  @IsEnum(ProfessionalNeed)
  professionalNeed!: ProfessionalNeed;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managementTypes?: string[];

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  term?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  currentSituation?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challenges?: string[];

  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  outcomes?: string;

  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  additionalInformation?: string;
}

export class UpdateFarmManagementRequestDto {
  @ApiPropertyOptional({ enum: ProfessionalNeed })
  @IsOptional()
  @IsEnum(ProfessionalNeed)
  professionalNeed?: ProfessionalNeed;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managementTypes?: string[];

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  term?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  currentSituation?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challenges?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  outcomes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  additionalInformation?: string;
}

export class FarmManagementReviewFeedbackDto {
  @ApiProperty() decision!: string;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
}

export class FarmManagementRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty() farmId!: string;
  @ApiProperty() farmName!: string;
  @ApiProperty({ enum: ProfessionalNeed }) professionalNeed!: ProfessionalNeed;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [String], nullable: true }) managementTypes!: string[] | null;
  @ApiProperty({ nullable: true, type: String }) term!: string | null;
  @ApiProperty({ nullable: true, type: String }) currentSituation!: string | null;
  @ApiProperty({ type: [String], nullable: true }) goals!: string[] | null;
  @ApiProperty({ type: [String], nullable: true }) challenges!: string[] | null;
  @ApiProperty({ nullable: true, type: String }) outcomes!: string | null;
  @ApiProperty({ nullable: true, type: String }) additionalInformation!: string | null;
  @ApiProperty({ type: [FarmManagementReviewFeedbackDto] }) reviews!: FarmManagementReviewFeedbackDto[];
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedAt!: string | null;
}

export class FarmManagementRequestListResponseDto {
  @ApiProperty({ type: [FarmManagementRequestResponseDto] }) items!: FarmManagementRequestResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
