import { ApiProperty } from '@nestjs/swagger';
import { EvaluationCheckStatus, EvaluationStatus } from '../../../generated/prisma/enums';

export class EvaluationCheckResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'water_source_inspection' })
  checkKey: string;

  @ApiProperty({ enum: EvaluationCheckStatus })
  checkStatus: EvaluationCheckStatus;

  @ApiProperty({ nullable: true, example: '101' })
  evidenceDocumentId: string | null;

  @ApiProperty({ nullable: true })
  reviewerNotes: string | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  reviewedAt: string | null;
}

export class EvaluationStaffSummaryDto {
  @ApiProperty({ example: '42' })
  id: string;

  @ApiProperty({ nullable: true, example: 'Staff Reviewer' })
  fullName: string | null;
}

export class EvaluationResponseDto {
  @ApiProperty({ example: '1', description: 'Evaluation ID (decimal string)' })
  id: string;

  @ApiProperty({ example: '10', description: 'Farm ID (decimal string)' })
  farmId: string;

  @ApiProperty({ nullable: true, example: '25', description: 'Associated listing request ID if scoped' })
  listingRequestId: string | null;

  @ApiProperty({ type: EvaluationStaffSummaryDto })
  reviewer: EvaluationStaffSummaryDto;

  @ApiProperty({ type: EvaluationStaffSummaryDto, nullable: true })
  approver: EvaluationStaffSummaryDto | null;

  @ApiProperty({ nullable: true, example: 85.5, description: 'Score value (never customer ratings)' })
  scoreValue: number | null;

  @ApiProperty({ nullable: true, example: 100, description: 'Scale maximum' })
  scoreMax: number | null;

  @ApiProperty({ nullable: true, example: 'Soil & Irrigation Standard' })
  methodologyName: string | null;

  @ApiProperty({ nullable: true, example: 'v1.0' })
  methodologyVersion: string | null;

  @ApiProperty({ nullable: true })
  reviewScopeEn: string | null;

  @ApiProperty({ nullable: true })
  reviewScopeAr: string | null;

  @ApiProperty({ nullable: true })
  publicSummaryEn: string | null;

  @ApiProperty({ nullable: true })
  publicSummaryAr: string | null;

  @ApiProperty({ nullable: true, description: 'Internal staff notes (private to staff)' })
  internalNotes: string | null;

  @ApiProperty({ enum: EvaluationStatus })
  status: EvaluationStatus;

  @ApiProperty({ nullable: true, format: 'date-time' })
  reviewedAt: string | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  approvedAt: string | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  publishedAt: string | null;

  @ApiProperty({ type: [EvaluationCheckResponseDto] })
  checks: EvaluationCheckResponseDto[];

  @ApiProperty({ nullable: true, format: 'date-time' })
  createdAt: string | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  updatedAt: string | null;
}

export class EvaluationListResponseDto {
  @ApiProperty({ type: [EvaluationResponseDto] })
  items: EvaluationResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 1 })
  total: number;
}
