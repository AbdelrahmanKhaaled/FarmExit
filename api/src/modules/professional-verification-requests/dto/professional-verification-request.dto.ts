import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { LocalizedContentDto } from '../../../common/dto/localized-content.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ProfessionalType } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';

export class CreateProfessionalVerificationRequestDto {
  @ApiProperty({ example: '42', description: 'Professional capability id on the caller profile' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  professionalCapabilityId!: string;
}

export class UpdateProfessionalVerificationRequestDto {
  @IsOptional() @ValidateNested() @Type(() => LocalizedContentDto) localizedContent?: LocalizedContentDto;
  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  verificationSummary?: string;
}

export class ProfessionalVerificationReviewFeedbackDto {
  @ApiProperty() decision!: string;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
}

export class ProfessionalVerificationRequestResponseDto {
  localizedContent?: unknown;
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty() professionalCapabilityId!: string;
  @ApiProperty({ enum: ProfessionalType }) professionalType!: ProfessionalType;
  @ApiProperty({ nullable: true, type: String }) verificationSummary!: string | null;
  @ApiProperty({ type: [ProfessionalVerificationReviewFeedbackDto] })
  reviews!: ProfessionalVerificationReviewFeedbackDto[];
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedAt!: string | null;
}

export class ProfessionalVerificationRequestListResponseDto {
  @ApiProperty({ type: [ProfessionalVerificationRequestResponseDto] })
  items!: ProfessionalVerificationRequestResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
