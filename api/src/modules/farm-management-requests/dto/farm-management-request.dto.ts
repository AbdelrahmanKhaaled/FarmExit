import { Type as ContentType } from 'class-transformer';
import { ValidateNested as ContentNested } from 'class-validator';
import { LocalizedContentDto } from '../../../common/dto/localized-content.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsArray,
  IsBoolean,
  Equals,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProfessionalNeed } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';

export const MANAGEMENT_RESPONSIBILITIES = ['operations', 'irrigation', 'harvest', 'reporting'] as const;
export const MANAGEMENT_FACILITY_TYPES = [
  'cold_storage_freezing',
  'produce_storage',
  'agricultural_processing_packing',
  'agricultural_service_facility',
] as const;
export class ManagementTeamDto {
  @IsOptional() @ContentNested() @ContentType(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
  @IsString() @MaxLength(100) role!: string;
  @IsInt() @Min(1) @Max(10000) count!: number;
}
export class ManagementFacilityDto {
  @IsOptional() @ContentNested() @ContentType(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
  @IsIn(MANAGEMENT_FACILITY_TYPES) facilityType!: string;
  @IsString() @MaxLength(1000) details!: string;
}
export class ManagementPublicationConsentDto {
  @Equals(true) consent!: boolean;
}
export class ManagementRequirementsDto {
  @IsOptional() @IsBoolean() publicationConsent?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(MANAGEMENT_RESPONSIBILITIES, { each: true })
  responsibilities?: string[];
  @IsOptional() @IsString() @MaxLength(30) experienceLevel?: string;
  @IsOptional() @IsString() @MaxLength(100) onSitePresence?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @ContentType(() => ManagementTeamDto)
  currentTeam?: ManagementTeamDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @ContentType(() => ManagementFacilityDto)
  resourcesAndFacilities?: ManagementFacilityDto[];
}
export class CreateFarmManagementRequestDto extends ManagementRequirementsDto {
  @IsOptional() @ContentNested() @ContentType(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
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

export class UpdateFarmManagementRequestDto extends ManagementRequirementsDto {
  @IsOptional() @ContentNested() @ContentType(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
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
  @ApiPropertyOptional({ nullable: true, type: String }) publicationConsentAt?: string | null;
  responsibilities?: string[] | null;
  experienceLevel?: string | null;
  onSitePresence?: string | null;
  currentTeam?: unknown;
  resourcesAndFacilities?: unknown;
  @ApiProperty({ nullable: true }) localizedContent?: unknown;
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty() farmId!: string;
  @ApiProperty() farmName!: string;
  @ApiProperty({ enum: ProfessionalNeed }) professionalNeed!: ProfessionalNeed;
  @ApiProperty() status!: string;
  @ApiProperty() visibility!: string;
  @ApiProperty({ nullable: true, type: String }) publishedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) submittedAt!: string | null;
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
