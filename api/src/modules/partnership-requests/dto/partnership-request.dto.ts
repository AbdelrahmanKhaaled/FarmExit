import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../farms/dto/create-farm.dto';

export class CreatePartnershipRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objective?: string[];
}

export class UpdatePartnershipRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objective?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPartnerTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  contributionDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  operations?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  salesChannel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  extraInformation?: string;
}

export class PartnershipReviewFeedbackDto {
  @ApiProperty() decision!: string;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
}

export class PartnershipRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty() farmId!: string;
  @ApiProperty() farmName!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ type: [String], nullable: true }) objective!: string[] | null;
  @ApiProperty({ type: [PartnershipReviewFeedbackDto] }) reviews!: PartnershipReviewFeedbackDto[];
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedAt!: string | null;
}

export class PartnershipRequestListResponseDto {
  @ApiProperty({ type: [PartnershipRequestResponseDto] }) items!: PartnershipRequestResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
