import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Partnership submission/review/forwarding vocabulary, not management applications or proposal states. */
export const LINKED_APPLICATION_STATUSES = [
  'submitted',
  'underFarmExitReview',
  'changesRequested',
  'approved',
  'rejected',
  'sentToOwner',
  'accepted',
  'declined',
  'withdrawn',
  'closed',
] as const;

export class LinkedApplicationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number = 1;

  @ApiPropertyOptional({ default: 6, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 6;

  @ApiPropertyOptional({ description: 'Applicant name or application reference' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ enum: LINKED_APPLICATION_STATUSES })
  @IsOptional()
  @IsIn(LINKED_APPLICATION_STATUSES)
  status?: (typeof LINKED_APPLICATION_STATUSES)[number];

  @ApiPropertyOptional({ enum: ['newest', 'oldest'], default: 'newest' })
  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sort?: 'newest' | 'oldest' = 'newest';
}

export class LinkedApplicationStaffDto {
  @ApiProperty() role!: string;
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
}

export class LinkedApplicationDto {
  @ApiProperty() id!: string;
  @ApiProperty() parentRequestId!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) applicantName!: string | null;
  @ApiProperty({ nullable: true, type: String }) applicantKind!: string | null;
  @ApiProperty({ nullable: true, type: String }) summary!: string | null;
  @ApiProperty({ nullable: true, type: String }) submittedAt!: string | null;
  @ApiProperty({ type: [LinkedApplicationStaffDto] }) assignedStaff!: LinkedApplicationStaffDto[];
}

export class LinkedApplicationsSummaryDto {
  @ApiProperty() total!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() approved!: number;
  @ApiProperty() rejected!: number;
  @ApiProperty({ description: 'Full submitted opportunity scope visible to this caller, independent of list filters' })
  byStatus!: Record<string, number>;
}

export class LinkedApplicationsResponseDto {
  @ApiProperty({ type: [LinkedApplicationDto] }) items!: LinkedApplicationDto[];
  @ApiProperty({ type: LinkedApplicationsSummaryDto }) summary!: LinkedApplicationsSummaryDto;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
