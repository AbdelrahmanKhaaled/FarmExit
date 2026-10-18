import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { FarmManagementReviewFeedbackDto } from '../../farm-management-requests/dto/farm-management-request.dto';

export class CreateFarmDetailsRequestDto {
  @ApiProperty({ example: 'golden-valley-sale', description: 'Published marketplace listing slug' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  listingSlug!: string;
}

export class FarmDetailsListingContextDto {
  @ApiProperty({ example: '42' })
  listingRequestId!: string;

  @ApiProperty({ example: 'golden-valley-sale' })
  listingSlug!: string;

  @ApiProperty({ example: 'sale', enum: ['sale', 'rent'] })
  listingType!: string;
}

export class FarmDetailsRequestResponseDto {
  @ApiProperty({ example: '100' })
  id!: string;

  @ApiProperty({ example: 'FD-2026-0001' })
  requestNumber!: string;

  @ApiProperty({ example: 'underFarmExitReview' })
  status!: string;

  @ApiProperty({ type: FarmDetailsListingContextDto })
  listing!: FarmDetailsListingContextDto;

  @ApiProperty({ example: '10' })
  farmId!: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'No persisted inquiry message in the current schema; use mediated communication after approval.',
  })
  message!: string | null;

  @ApiProperty({ type: [FarmManagementReviewFeedbackDto] })
  reviews!: FarmManagementReviewFeedbackDto[];

  @ApiPropertyOptional({ example: '2026-10-15T10:00:00.000Z', nullable: true })
  submittedAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-15T09:00:00.000Z', nullable: true })
  createdAt!: string | null;
}

export class FarmDetailsRequestListResponseDto {
  @ApiProperty({ type: [FarmDetailsRequestResponseDto] })
  items!: FarmDetailsRequestResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
