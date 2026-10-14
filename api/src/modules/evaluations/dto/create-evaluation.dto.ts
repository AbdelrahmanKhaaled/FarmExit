import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EvaluationStatus } from '../../../generated/prisma/enums';
import { CreateEvaluationCheckInputDto } from './record-evaluation-check.dto';

export class CreateEvaluationDto {
  @ApiPropertyOptional({ example: '15', description: 'Associated farm_listing request ID (must belong to this farm)' })
  @IsOptional()
  @Matches(/^[1-9]\d{0,18}$/, { message: 'listingRequestId must be a positive integer ID string' })
  listingRequestId?: string;

  @ApiPropertyOptional({ example: 85.5, description: 'Evaluation score value (0 <= scoreValue <= scoreMax)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'scoreValue must be a valid number with at most 2 decimal places' })
  @Min(0, { message: 'scoreValue cannot be negative' })
  @Max(99999.99, { message: 'scoreValue exceeds maximum allowed value' })
  scoreValue?: number | null;

  @ApiPropertyOptional({ example: 100, description: 'Evaluation scale maximum (must be > 0, required if scoreValue is provided)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'scoreMax must be a valid number with at most 2 decimal places' })
  @Min(0.01, { message: 'scoreMax must be greater than zero' })
  @Max(99999.99, { message: 'scoreMax exceeds maximum allowed value' })
  scoreMax?: number | null;

  @ApiPropertyOptional({ example: 'Soil & Irrigation Standard', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  methodologyName?: string | null;

  @ApiPropertyOptional({ example: 'v1.0', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  methodologyVersion?: string | null;

  @ApiPropertyOptional({ description: 'Factual review scope in English describing checks completed' })
  @IsOptional()
  @IsString()
  reviewScopeEn?: string | null;

  @ApiPropertyOptional({ description: 'Factual review scope in Arabic describing checks completed' })
  @IsOptional()
  @IsString()
  reviewScopeAr?: string | null;

  @ApiPropertyOptional({ description: 'Factual summary in English' })
  @IsOptional()
  @IsString()
  publicSummaryEn?: string | null;

  @ApiPropertyOptional({ description: 'Factual summary in Arabic' })
  @IsOptional()
  @IsString()
  publicSummaryAr?: string | null;

  @ApiPropertyOptional({ description: 'Internal staff notes (never exposed publicly)' })
  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @ApiPropertyOptional({
    enum: [EvaluationStatus.draft, EvaluationStatus.inReview],
    default: EvaluationStatus.draft,
    description: 'Initial evaluation status (draft or in_review only on creation)',
  })
  @IsOptional()
  @IsEnum(EvaluationStatus)
  status?: EvaluationStatus;

  @ApiPropertyOptional({ type: () => [CreateEvaluationCheckInputDto], description: 'Optional initial evaluation checks' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationCheckInputDto)
  checks?: CreateEvaluationCheckInputDto[];
}
