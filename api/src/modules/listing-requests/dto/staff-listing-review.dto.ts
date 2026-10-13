import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { trim } from '../../farms/dto/create-farm.dto';

/** JSON uses the same staff-role spelling as the rest of the API. `case_agent` is accepted and stored as case_agent. */
const ASSIGNMENT_TYPES = ['reviewer', 'caseAgent'] as const;

const normalizeAssignmentType = ({ value }: { value: unknown }): unknown => (value === 'case_agent' ? 'caseAgent' : value);

export class AssignListingStaffDto {
  @ApiProperty({
    enum: ASSIGNMENT_TYPES,
    example: 'reviewer',
    description: 'Which slot to set. reviewer and caseAgent are independent. case_agent is accepted as caseAgent.',
  })
  @Transform(normalizeAssignmentType)
  @IsIn(ASSIGNMENT_TYPES)
  assignmentType: (typeof ASSIGNMENT_TYPES)[number];

  @ApiProperty({ example: '15', description: 'User id of an active staff member who already holds this role.' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  assignedStaffId: string;
}

const DECISIONS = ['approved', 'changesRequested', 'rejected'] as const;

/** A review of a submitted listing. Approval does not publish it. */
export class DecideListingReviewDto {
  @ApiProperty({ enum: DECISIONS, example: 'changesRequested' })
  @IsIn(DECISIONS)
  decision: (typeof DECISIONS)[number];

  @ApiPropertyOptional({
    maxLength: 8000,
    description: 'Required when requesting changes or rejecting. Shown to the owner. Optional on approval.',
  })
  @Transform(trim)
  @ValidateIf((dto: DecideListingReviewDto) => dto.decision !== 'approved' || dto.comment != null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  comment?: string;
}

export class StaffListingReviewDto {
  @ApiProperty({ enum: DECISIONS }) decision: (typeof DECISIONS)[number];
  @ApiProperty({ example: '15', description: 'Staff user id. No mobile number or email.' }) reviewerId: string;
  @ApiProperty({ nullable: true, type: String }) comment: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
}

export class StaffAssignmentDto {
  @ApiProperty({ enum: ASSIGNMENT_TYPES }) assignmentType: (typeof ASSIGNMENT_TYPES)[number];
  @ApiProperty({ example: '15' }) assignedStaffId: string;
  @ApiProperty({ example: '3' }) assignedByUserId: string;
  @ApiProperty({ type: String, format: 'date-time' }) assignedAt: string;
}

/**
 * A submitted sale/rent listing as staff may see it. Owner contact, the private farm pin, and media are omitted.
 * Assignment does not publish the listing or change its status.
 */
export class StaffListingRequestResponseDto {
  @ApiProperty({ example: '4' }) id: string;
  @ApiProperty({ example: 'FL1A2B3C4D5E6F' }) requestNumber: string;
  @ApiProperty({ example: '12' }) farmId: string;
  @ApiProperty() farmName: string;
  @ApiProperty({ example: 12.5 }) areaFeddan: number;
  @ApiProperty({ enum: ['sale', 'rent'] }) listingType: string;
  @ApiProperty({ example: 'underFarmExitReview' }) status: string;
  @ApiProperty({ example: 'private' }) visibility: string;
  @ApiProperty({ nullable: true, type: Number }) askingPrice: number | null;
  @ApiProperty({ nullable: true, type: Number }) annualRentPerFeddan: number | null;
  @ApiProperty({ nullable: true, type: Number }) statedSalePricePerFeddan: number | null;
  @ApiProperty({ example: 'EGP' }) currency: string;
  @ApiProperty({ nullable: true, type: String }) availability: string | null;
  @ApiProperty({ nullable: true, type: String }) listingDescription: string | null;
  @ApiProperty({ type: [String] }) highlights: string[];
  @ApiProperty({ description: 'Server-generated. There is no public page for this slug.' }) slug: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) submittedAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) updatedAt: string | null;
  @ApiProperty({
    type: [StaffAssignmentDto],
    description: 'Admin sees both slots. A reviewer or case agent sees only their own slot.',
  })
  assignments: StaffAssignmentDto[];
  @ApiProperty({
    type: [StaffListingReviewDto],
    description: 'Every review recorded for this request, oldest first. Decisions do not publish the listing.',
  })
  reviews: StaffListingReviewDto[];
}

export class StaffListingRequestListResponseDto {
  @ApiProperty({ type: [StaffListingRequestResponseDto] }) items: StaffListingRequestResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}
