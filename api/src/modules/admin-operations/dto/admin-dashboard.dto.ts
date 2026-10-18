import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardOverviewDto {
  @ApiProperty({ description: 'Users with account_status = active' })
  registeredUsers!: number;

  @ApiProperty({ description: 'Farms where deleted_at IS NULL' })
  farms!: number;

  @ApiProperty({ description: 'Published public sale listings (farm_listing + listing_type sale)' })
  publishedSaleListings!: number;

  @ApiProperty({ description: 'Published public rent listings' })
  publishedRentListings!: number;

  @ApiProperty({ description: 'Listing requests in submitted or underFarmExitReview' })
  pendingListingRequests!: number;

  @ApiProperty({ description: 'Farm management requests in submitted or underFarmExitReview' })
  farmManagementRequests!: number;

  @ApiProperty({ description: 'Partnership requests in submitted or underFarmExitReview' })
  partnershipRequests!: number;

  @ApiProperty({ description: 'Partnership applications in submitted or underFarmExitReview' })
  partnershipApplications!: number;

  @ApiProperty({ description: 'Professional verification requests in active review statuses' })
  professionalVerificationRequests!: number;

  @ApiProperty({ description: 'Farm details inquiries in active non-terminal statuses' })
  farmDetailsInquiries!: number;

  @ApiProperty({ description: 'Purchase proposals in submitted status' })
  purchaseProposals!: number;

  @ApiProperty({ description: 'Communication cases not closed' })
  activeCommunicationCases!: number;

  @ApiProperty({ description: 'Requests under review without a reviewer assignment' })
  requestsAwaitingStaffAssignment!: number;

  @ApiProperty({ description: 'Requests in underFarmExitReview' })
  requestsAwaitingReview!: number;
}

export class AdminWorkQueueDto {
  @ApiProperty({ example: 12 })
  unassignedUnderReview!: number;

  @ApiProperty({ example: 8 })
  changesRequested!: number;

  @ApiProperty({ example: 5 })
  pendingDocumentReviews!: number;

  @ApiProperty({ example: 3 })
  activeCommunicationCases!: number;

  @ApiProperty({ example: 20 })
  recentlyUpdatedRequests!: number;
}
