import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d', '12m', 'all'] })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '12m', 'all'])
  range?: '7d' | '30d' | '90d' | '12m' | 'all';

  @ApiPropertyOptional({ description: 'Custom range start (UTC calendar day). Overrides preset when paired with to.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end (UTC calendar day, inclusive).' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminTimeSeriesPointDto {
  @ApiProperty({ example: '2026-10-01' })
  date!: string;

  @ApiProperty({ example: 3 })
  count!: number;
}

export class AdminAnalyticsTimeseriesDto {
  @ApiProperty() granularity!: 'day' | 'week' | 'month';
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) usersRegistered!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) farmsCreated!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) requestsCreated!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) listingsPublished!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) listingsPublishedSale!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) listingsPublishedRent!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) proposalsCreated!: AdminTimeSeriesPointDto[];
  @ApiProperty({ type: [AdminTimeSeriesPointDto] }) communicationCasesCreated!: AdminTimeSeriesPointDto[];
}

export class AdminGovernorateCountDto {
  @ApiProperty() governorate!: string;
  @ApiProperty() count!: number;
}

export class AdminAnalyticsDistributionsDto {
  @ApiProperty({ description: 'Requests created in range by request_type' })
  requestsByType!: Record<string, number>;
  @ApiProperty({ description: 'Current status snapshot (all requests, not limited to range)' })
  requestsByStatusSnapshot!: Record<string, number>;
  @ApiProperty({ description: 'Requests created in range by status at creation time (same as status for new rows)' })
  requestsByStatusInRange!: Record<string, number>;
  @ApiProperty() listingsSaleVsRent!: { sale: number; rent: number };
  @ApiProperty({ type: [AdminGovernorateCountDto] }) listingsByGovernorate!: AdminGovernorateCountDto[];
  @ApiProperty() proposalsByKind!: Record<string, number>;
  @ApiProperty() proposalsByStatus!: Record<string, number>;
  @ApiProperty() partnershipRequestsCreated!: number;
  @ApiProperty() partnershipApplicationsCreated!: number;
  @ApiProperty() professionalVerificationByStatus!: Record<string, number>;
  @ApiProperty() farmManagementByStatus!: Record<string, number>;
  @ApiProperty() communicationByStatus!: Record<string, number>;
}

export class AdminAnalyticsWorkflowsDto {
  @ApiProperty() awaitingReview!: number;
  @ApiProperty() unassignedReviewer!: number;
  @ApiProperty() changesRequested!: number;
  @ApiProperty() openCommunicationCases!: number;
  @ApiProperty() communicationCasesCreatedInRange!: number;
  @ApiProperty() documentsPendingReview!: number;
}

export class AdminAnalyticsOverviewDto {
  @ApiProperty() newUsers!: number;
  @ApiProperty() newFarms!: number;
  @ApiProperty() publishedListings!: number;
  @ApiProperty() requestsCreated!: number;
  @ApiProperty() purchaseProposals!: number;
  @ApiProperty() saleListingsPublished!: number;
  @ApiProperty() rentListingsPublished!: number;
}

export class AdminAnalyticsResponseDto {
  @ApiProperty()
  from!: string;

  @ApiProperty({ description: 'Inclusive end of selected range (UTC)' })
  to!: string;

  @ApiProperty({ enum: ['day', 'week', 'month'] })
  granularity!: 'day' | 'week' | 'month';

  @ApiProperty({ example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty()
  newFarms!: number;

  @ApiProperty()
  publishedListings!: number;

  @ApiProperty()
  requestsCreated!: number;

  @ApiProperty()
  purchaseProposals!: number;

  @ApiProperty({ type: [AdminTimeSeriesPointDto] })
  farmsOverTime!: AdminTimeSeriesPointDto[];

  @ApiProperty({ type: [AdminTimeSeriesPointDto] })
  listingsPublishedOverTime!: AdminTimeSeriesPointDto[];

  @ApiProperty({ type: [AdminTimeSeriesPointDto] })
  requestsOverTime!: AdminTimeSeriesPointDto[];

  @ApiProperty({ type: [AdminTimeSeriesPointDto] })
  usersRegisteredOverTime!: AdminTimeSeriesPointDto[];

  @ApiProperty()
  requestsByType!: Record<string, number>;

  @ApiProperty()
  requestsByStatus!: Record<string, number>;

  @ApiProperty()
  saleListingsPublished!: number;

  @ApiProperty()
  rentListingsPublished!: number;

  @ApiProperty()
  openCommunicationCases!: number;

  @ApiProperty({ type: AdminAnalyticsTimeseriesDto })
  timeseries!: AdminAnalyticsTimeseriesDto;

  @ApiProperty({ type: AdminAnalyticsDistributionsDto })
  distributions!: AdminAnalyticsDistributionsDto;

  @ApiProperty({ type: AdminAnalyticsWorkflowsDto })
  workflows!: AdminAnalyticsWorkflowsDto;

  @ApiProperty({ type: AdminAnalyticsOverviewDto })
  overview!: AdminAnalyticsOverviewDto;
}
