import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { ApplicantKind } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';

export class CreatePartnershipApplicationDto {
  @ApiProperty({ example: '42', description: 'Approved or published partnership request id' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  parentPartnershipRequestId!: string;

  @ApiProperty({ enum: ApplicantKind })
  @IsEnum(ApplicantKind)
  applicantKind!: ApplicantKind;
}

export class UpdatePartnershipApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  applicationMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  whyGoodFit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  relevantExperience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  approach?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf((dto: UpdatePartnershipApplicationDto) => dto.companyName != null)
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  companyRegistrationNumber?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  companyContactName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  companyContactRole?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  companySector?: string;
}

export class PartnershipApplicationReviewFeedbackDto {
  @ApiProperty() decision!: string;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
}

export class PartnershipApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty() parentPartnershipRequestId!: string;
  @ApiProperty({ enum: ApplicantKind, nullable: true }) applicantKind!: ApplicantKind | null;
  @ApiProperty({ nullable: true, type: String }) applicationMessage!: string | null;
  @ApiProperty({ nullable: true, type: String }) whyGoodFit!: string | null;
  @ApiProperty({ nullable: true, type: String }) companyName!: string | null;
  @ApiProperty({ type: [PartnershipApplicationReviewFeedbackDto] }) reviews!: PartnershipApplicationReviewFeedbackDto[];
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedAt!: string | null;
}

export class PartnershipApplicationListResponseDto {
  @ApiProperty({ type: [PartnershipApplicationResponseDto] }) items!: PartnershipApplicationResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
