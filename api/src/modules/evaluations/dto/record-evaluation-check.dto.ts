import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { EvaluationCheckStatus } from '../../../generated/prisma/enums';

export class RecordEvaluationCheckDto {
  @ApiProperty({ example: 'water_source_inspection', maxLength: 120, description: 'Approved evaluation criterion key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  checkKey: string;

  @ApiPropertyOptional({ enum: EvaluationCheckStatus, default: EvaluationCheckStatus.notReviewed })
  @IsOptional()
  @IsEnum(EvaluationCheckStatus)
  checkStatus?: EvaluationCheckStatus;

  @ApiPropertyOptional({ example: '101', description: 'Request document ID serving as reviewed evidence (must belong to this farm)' })
  @IsOptional()
  @Matches(/^[1-9]\d{0,18}$/, { message: 'evidenceDocumentId must be a positive integer ID string' })
  evidenceDocumentId?: string | null;

  @ApiPropertyOptional({ description: 'Factual reviewer observations or notes' })
  @IsOptional()
  @IsString()
  reviewerNotes?: string | null;
}

export class CreateEvaluationCheckInputDto {
  @ApiProperty({ example: 'water_source_inspection', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  checkKey: string;

  @ApiPropertyOptional({ enum: EvaluationCheckStatus, default: EvaluationCheckStatus.notReviewed })
  @IsOptional()
  @IsEnum(EvaluationCheckStatus)
  checkStatus?: EvaluationCheckStatus;

  @ApiPropertyOptional({ example: '101' })
  @IsOptional()
  @Matches(/^[1-9]\d{0,18}$/, { message: 'evidenceDocumentId must be a positive integer ID string' })
  evidenceDocumentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewerNotes?: string | null;
}
