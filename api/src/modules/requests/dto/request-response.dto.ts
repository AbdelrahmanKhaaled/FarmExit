import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestFarmDto {
  @ApiProperty({ example: '10' })
  id!: string;

  @ApiProperty({ example: 'Golden Valley Orchard' })
  name!: string;

  @ApiPropertyOptional({ example: 'Beheira', nullable: true })
  governorate!: string | null;
}

export class RequestCreatorDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiPropertyOptional({ example: 'Ahmed Khaled', nullable: true })
  fullName!: string | null;
}

export class RequestStaffAssignmentDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'reviewer' })
  assignmentType!: string;

  @ApiProperty({ example: '2' })
  assignedStaffId!: string;

  @ApiPropertyOptional({ example: 'Sarah Staff', nullable: true })
  staffName!: string | null;

  @ApiProperty({ example: '2026-10-14T10:00:00.000Z' })
  assignedAt!: string;
}

export class RequestStatusHistoryDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiPropertyOptional({ example: 'draft', nullable: true })
  fromStatus!: string | null;

  @ApiProperty({ example: 'underFarmExitReview' })
  toStatus!: string;

  @ApiProperty({ example: '1' })
  changedBy!: string;

  @ApiPropertyOptional({ example: 'Ahmed Khaled', nullable: true })
  changerName!: string | null;

  @ApiPropertyOptional({ example: 'Submitted by user', nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ example: '2026-10-14T10:00:00.000Z', nullable: true })
  createdAt!: string | null;
}

export class RequestReviewDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '2' })
  reviewerId!: string;

  @ApiPropertyOptional({ example: 'Sarah Reviewer', nullable: true })
  reviewerName!: string | null;

  @ApiProperty({ example: 'approved' })
  decision!: string;

  @ApiPropertyOptional({ example: 'Clear ownership documents verified.', nullable: true })
  comment!: string | null;

  @ApiPropertyOptional({ example: '2026-10-14T10:00:00.000Z', nullable: true })
  createdAt!: string | null;
}

export class RequestForwardingDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '5' })
  recipientUserId!: string;

  @ApiProperty({ example: 'sent' })
  status!: string;

  @ApiPropertyOptional({ example: 'accepted', nullable: true })
  ownerDecision!: string | null;

  @ApiPropertyOptional({ example: 'Acceptable commercial terms', nullable: true })
  decisionReason!: string | null;

  @ApiPropertyOptional({ example: '2026-10-14T10:00:00.000Z', nullable: true })
  createdAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-14T12:00:00.000Z', nullable: true })
  decidedAt!: string | null;
}

export class RequestDocumentDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'title_deed' })
  slotKey!: string;

  @ApiPropertyOptional({ example: 'deed', nullable: true })
  documentType!: string | null;

  @ApiPropertyOptional({ example: 'ownership_deed.pdf', nullable: true })
  originalName!: string | null;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: '1048576', nullable: true })
  fileSizeBytes!: string | null;

  @ApiProperty({ example: 'uploaded' })
  reviewStatus!: string;

  @ApiPropertyOptional({ example: 'Verified with notary seal', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-10-14T10:00:00.000Z', nullable: true })
  createdAt!: string | null;
}

export class RequestResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'REQ-2026-0001' })
  requestNumber!: string;

  @ApiProperty({ example: 'farmListing' })
  requestType!: string;

  @ApiProperty({ example: 'underFarmExitReview' })
  status!: string;

  @ApiProperty({ example: 'private' })
  visibility!: string;

  @ApiProperty({ example: 1 })
  currentStep!: number;

  @ApiPropertyOptional({ example: '2026-10-14T10:00:00.000Z', nullable: true })
  submittedAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-14T14:00:00.000Z', nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  closedAt!: string | null;

  @ApiProperty({ example: '2026-10-14T09:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-14T10:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: RequestFarmDto, nullable: true })
  farm!: RequestFarmDto | null;

  @ApiProperty({ type: RequestCreatorDto })
  creator!: RequestCreatorDto;

  @ApiPropertyOptional({ example: null, nullable: true })
  parentRequestId!: string | null;

  @ApiProperty({ type: [RequestStaffAssignmentDto] })
  assignments!: RequestStaffAssignmentDto[];

  @ApiProperty({ type: [RequestStatusHistoryDto] })
  statusHistory!: RequestStatusHistoryDto[];

  @ApiProperty({ type: [RequestReviewDto] })
  reviews!: RequestReviewDto[];

  @ApiProperty({ type: [RequestForwardingDto] })
  forwardings!: RequestForwardingDto[];

  @ApiProperty({ type: [RequestDocumentDto] })
  documents!: RequestDocumentDto[];
}

export class RequestListResponseDto {
  @ApiProperty({ type: [RequestResponseDto] })
  items!: RequestResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  total!: number;
}
