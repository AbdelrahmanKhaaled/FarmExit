import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewDecision } from '../../../generated/prisma/enums';

export class DecideRequestReviewDto {
  @ApiProperty({
    enum: ReviewDecision,
    example: ReviewDecision.approved,
    description: 'Review decision: approved, changesRequested, or rejected',
  })
  @IsNotEmpty()
  @IsEnum(ReviewDecision)
  decision!: ReviewDecision;

  @ApiPropertyOptional({
    example: 'All required documents verified and farm details confirmed.',
    description: 'Mandatory when changes are requested or rejected; optional on approval.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({
    example: 'approved',
    description: 'Optional custom target status if overriding default workflow outcome.',
  })
  @IsOptional()
  @IsString()
  targetStatus?: string;
}
