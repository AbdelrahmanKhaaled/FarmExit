import { Injectable } from '@nestjs/common';
import {
  CommunicationCaseStatus,
  ListingType,
  RequestStaffAssignmentType,
  RequestType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import {
  REQUEST_STATUS_CHANGES_REQUESTED,
  REQUEST_STATUS_UNDER_REVIEW,
} from '../requests/request-workflow.policy';
import {
  bucketKeys,
  dayKey,
  fillSeries,
  monthKey,
  resolveAnalyticsRange,
  type AnalyticsGranularity,
  type ResolvedAnalyticsRange,
} from './admin-analytics-range';
import type {
  AdminAnalyticsDistributionsDto,
  AdminAnalyticsOverviewDto,
  AdminAnalyticsQueryDto,
  AdminAnalyticsResponseDto,
  AdminAnalyticsTimeseriesDto,
  AdminAnalyticsWorkflowsDto,
  AdminTimeSeriesPointDto,
} from './dto/admin-analytics.dto';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async analytics(query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsResponseDto> {
    const ctx = resolveAnalyticsRange(query);
    const [overview, timeseries, distributions, workflows] = await Promise.all([
      this.loadOverview(ctx),
      this.loadTimeseries(ctx),
      this.loadDistributions(ctx),
      this.loadWorkflows(ctx),
    ]);

    return {
      from: ctx.from.toISOString(),
      to: ctx.toInclusive.toISOString(),
      granularity: ctx.granularity,
      timezone: 'UTC',
      newFarms: overview.newFarms,
      publishedListings: overview.publishedListings,
      requestsCreated: overview.requestsCreated,
      purchaseProposals: overview.purchaseProposals,
      farmsOverTime: timeseries.farmsCreated,
      listingsPublishedOverTime: timeseries.listingsPublished,
      requestsOverTime: timeseries.requestsCreated,
      usersRegisteredOverTime: timeseries.usersRegistered,
      requestsByType: distributions.requestsByType,
      requestsByStatus: distributions.requestsByStatusSnapshot,
      saleListingsPublished: overview.saleListingsPublished,
      rentListingsPublished: overview.rentListingsPublished,
      openCommunicationCases: workflows.openCommunicationCases,
      timeseries,
      distributions,
      workflows,
      overview,
    };
  }

  async overview(query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsOverviewDto> {
    return this.loadOverview(resolveAnalyticsRange(query));
  }

  async timeseries(query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsTimeseriesDto> {
    return this.loadTimeseries(resolveAnalyticsRange(query));
  }

  async distributions(query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsDistributionsDto> {
    return this.loadDistributions(resolveAnalyticsRange(query));
  }

  async workflows(query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsWorkflowsDto> {
    return this.loadWorkflows(resolveAnalyticsRange(query));
  }

  private publishedListingRangeWhere(ctx: ResolvedAnalyticsRange) {
    return {
      requestType: RequestType.farmListing,
      status: LISTING_PUBLISHED,
      visibility: 'public' as const,
      farm: { deletedAt: null },
      publishedAt: { gte: ctx.from, lt: ctx.toExclusive },
    };
  }

  private async loadOverview(ctx: ResolvedAnalyticsRange): Promise<AdminAnalyticsOverviewDto> {
    const pubWhere = this.publishedListingRangeWhere(ctx);
    const [newUsers, newFarms, publishedListings, requestsCreated, purchaseProposals, saleListingsPublished, rentListingsPublished] =
      await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: ctx.from, lt: ctx.toExclusive } } }),
        this.prisma.farm.count({ where: { deletedAt: null, createdAt: { gte: ctx.from, lt: ctx.toExclusive } } }),
        this.prisma.request.count({ where: pubWhere }),
        this.prisma.request.count({ where: { createdAt: { gte: ctx.from, lt: ctx.toExclusive } } }),
        this.prisma.request.count({
          where: { requestType: RequestType.farmPurchaseProposal, createdAt: { gte: ctx.from, lt: ctx.toExclusive } },
        }),
        this.prisma.request.count({
          where: { ...pubWhere, listingDetail: { is: { listingType: ListingType.sale } } },
        }),
        this.prisma.request.count({
          where: { ...pubWhere, listingDetail: { is: { listingType: ListingType.rent } } },
        }),
      ]);
    return {
      newUsers,
      newFarms,
      publishedListings,
      requestsCreated,
      purchaseProposals,
      saleListingsPublished,
      rentListingsPublished,
    };
  }

  private async loadTimeseries(ctx: ResolvedAnalyticsRange): Promise<AdminAnalyticsTimeseriesDto> {
    const keys = bucketKeys(ctx.from, ctx.toExclusive, ctx.granularity);
    const [
      usersRegistered,
      farmsCreated,
      requestsCreated,
      listingsPublished,
      listingsPublishedSale,
      listingsPublishedRent,
      proposalsCreated,
      communicationCasesCreated,
    ] = await Promise.all([
      this.seriesFromTable(ctx, 'users', 'created_at', ''),
      this.seriesFromTable(ctx, 'farms', 'created_at', 'AND f.deleted_at IS NULL'),
      this.seriesFromTable(ctx, 'requests', 'created_at', ''),
      this.seriesListingsPublished(ctx, null),
      this.seriesListingsPublished(ctx, ListingType.sale),
      this.seriesListingsPublished(ctx, ListingType.rent),
      this.seriesFromTable(ctx, 'requests', 'created_at', `AND r.request_type = '${RequestType.farmPurchaseProposal}'`),
      this.seriesFromTable(ctx, 'communication_cases', 'created_at', ''),
    ]);

    return {
      granularity: ctx.granularity,
      usersRegistered: fillSeries(keys, usersRegistered),
      farmsCreated: fillSeries(keys, farmsCreated),
      requestsCreated: fillSeries(keys, requestsCreated),
      listingsPublished: fillSeries(keys, listingsPublished),
      listingsPublishedSale: fillSeries(keys, listingsPublishedSale),
      listingsPublishedRent: fillSeries(keys, listingsPublishedRent),
      proposalsCreated: fillSeries(keys, proposalsCreated),
      communicationCasesCreated: fillSeries(keys, communicationCasesCreated),
    };
  }

  private async loadDistributions(ctx: ResolvedAnalyticsRange): Promise<AdminAnalyticsDistributionsDto> {
    const rangeWhere = { createdAt: { gte: ctx.from, lt: ctx.toExclusive } };
    const pubWhere = this.publishedListingRangeWhere(ctx);

    const [
      requestsByTypeRows,
      requestsByStatusSnapshotRows,
      requestsByStatusInRangeRows,
      saleCount,
      rentCount,
      govRows,
      proposalKindRows,
      proposalStatusRows,
      partnershipRequestsCreated,
      partnershipApplicationsCreated,
      verificationRows,
      managementRows,
      commRows,
    ] = await Promise.all([
      this.prisma.request.groupBy({
        by: ['requestType'],
        where: rangeWhere,
        _count: { _all: true },
      }),
      this.prisma.request.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.request.groupBy({ by: ['status'], where: rangeWhere, _count: { _all: true } }),
      this.prisma.request.count({ where: { ...pubWhere, listingDetail: { is: { listingType: ListingType.sale } } } }),
      this.prisma.request.count({ where: { ...pubWhere, listingDetail: { is: { listingType: ListingType.rent } } } }),
      this.prisma.$queryRawUnsafe<{ governorate: string; count: bigint }[]>(
        `SELECT f.governorate AS governorate, COUNT(*) AS count
        FROM requests r
        INNER JOIN farms f ON f.id = r.farm_id AND f.deleted_at IS NULL
        INNER JOIN farm_listing_details ld ON ld.request_id = r.id
        WHERE r.request_type = 'farm_listing'
          AND r.status = ?
          AND r.visibility = 'public'
          AND r.published_at IS NOT NULL
          AND r.published_at >= ? AND r.published_at < ?
        GROUP BY f.governorate
        ORDER BY count DESC
        LIMIT 20`,
        LISTING_PUBLISHED,
        ctx.from,
        ctx.toExclusive,
      ),
      this.prisma.$queryRawUnsafe<{ kind: string; count: bigint }[]>(
        `SELECT d.proposal_kind AS kind, COUNT(*) AS count
        FROM requests r
        INNER JOIN farm_purchase_proposal_details d ON d.request_id = r.id
        WHERE r.request_type = 'farm_purchase_proposal'
          AND r.created_at >= ? AND r.created_at < ?
        GROUP BY d.proposal_kind`,
        ctx.from,
        ctx.toExclusive,
      ),
      this.prisma.request.groupBy({
        by: ['status'],
        where: { requestType: RequestType.farmPurchaseProposal, ...rangeWhere },
        _count: { _all: true },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.partnership, ...rangeWhere },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.partnershipApplication, ...rangeWhere },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        where: { requestType: RequestType.professionalVerification },
        _count: { _all: true },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        where: { requestType: RequestType.farmManagement },
        _count: { _all: true },
      }),
      this.prisma.communicationCase.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      requestsByType: toCountMap(requestsByTypeRows, 'requestType'),
      requestsByStatusSnapshot: toCountMap(requestsByStatusSnapshotRows, 'status'),
      requestsByStatusInRange: toCountMap(requestsByStatusInRangeRows, 'status'),
      listingsSaleVsRent: { sale: saleCount, rent: rentCount },
      listingsByGovernorate: govRows.map((r) => ({ governorate: r.governorate, count: Number(r.count) })),
      proposalsByKind: proposalKindRows.reduce<Record<string, number>>((acc, r) => {
        acc[r.kind] = Number(r.count);
        return acc;
      }, {}),
      proposalsByStatus: toCountMap(proposalStatusRows, 'status'),
      partnershipRequestsCreated,
      partnershipApplicationsCreated,
      professionalVerificationByStatus: toCountMap(verificationRows, 'status'),
      farmManagementByStatus: toCountMap(managementRows, 'status'),
      communicationByStatus: toCountMap(commRows, 'status'),
    };
  }

  private async loadWorkflows(ctx: ResolvedAnalyticsRange): Promise<AdminAnalyticsWorkflowsDto> {
    const [awaitingReview, unassignedReviewer, changesRequested, openCommunicationCases, communicationCasesCreatedInRange, documentsPendingReview] =
      await Promise.all([
        this.prisma.request.count({ where: { status: REQUEST_STATUS_UNDER_REVIEW } }),
        this.countUnassignedUnderReview(),
        this.prisma.request.count({ where: { status: REQUEST_STATUS_CHANGES_REQUESTED } }),
        this.prisma.communicationCase.count({ where: { status: { not: CommunicationCaseStatus.closed } } }),
        this.prisma.communicationCase.count({
          where: { createdAt: { gte: ctx.from, lt: ctx.toExclusive } },
        }),
        this.prisma.requestDocument.count({ where: { reviewStatus: 'uploaded' } }),
      ]);
    return {
      awaitingReview,
      unassignedReviewer,
      changesRequested,
      openCommunicationCases,
      communicationCasesCreatedInRange,
      documentsPendingReview,
    };
  }

  private async countUnassignedUnderReview(): Promise<number> {
    const underReview = await this.prisma.request.findMany({
      where: { status: REQUEST_STATUS_UNDER_REVIEW },
      select: { id: true },
    });
    if (underReview.length === 0) return 0;
    const ids = underReview.map((r) => r.id);
    const assigned = await this.prisma.requestStaffAssignment.findMany({
      where: { requestId: { in: ids }, assignmentType: RequestStaffAssignmentType.reviewer },
      select: { requestId: true },
    });
    const assignedIds = new Set(assigned.map((a) => a.requestId));
    return ids.filter((id) => !assignedIds.has(id)).length;
  }

  private async seriesFromTable(
    ctx: ResolvedAnalyticsRange,
    table: 'users' | 'farms' | 'requests' | 'communication_cases',
    column: string,
    extraSql: string,
  ): Promise<AdminTimeSeriesPointDto[]> {
    const colRef =
      table === 'users'
        ? `u.${column}`
        : table === 'farms'
          ? `f.${column}`
          : table === 'communication_cases'
            ? `c.${column}`
            : `r.${column}`;
    const fromTable =
      table === 'users'
        ? 'users u'
        : table === 'farms'
          ? 'farms f'
          : table === 'communication_cases'
            ? 'communication_cases c'
            : 'requests r';
    const rows = await this.queryBuckets(ctx, colRef, fromTable, extraSql);
    return rows.map((r) => ({ date: this.normalizeBucket(r.bucket, ctx.granularity), count: Number(r.count) }));
  }

  private async seriesListingsPublished(
    ctx: ResolvedAnalyticsRange,
    listingType: ListingType | null,
  ): Promise<AdminTimeSeriesPointDto[]> {
    const typeClause =
      listingType === null ? '' : listingType === ListingType.sale ? `AND ld.listing_type = 'sale'` : `AND ld.listing_type = 'rent'`;
    const rows = await this.queryBuckets(
      ctx,
      'r.published_at',
      `requests r
       INNER JOIN farm_listing_details ld ON ld.request_id = r.id
       INNER JOIN farms f ON f.id = r.farm_id AND f.deleted_at IS NULL`,
      `AND r.request_type = 'farm_listing'
       AND r.status = '${LISTING_PUBLISHED}'
       AND r.visibility = 'public'
       AND r.published_at IS NOT NULL
       ${typeClause}`,
    );
    return rows.map((r) => ({ date: this.normalizeBucket(r.bucket, ctx.granularity), count: Number(r.count) }));
  }

  private async queryBuckets(
    ctx: ResolvedAnalyticsRange,
    colRef: string,
    fromClause: string,
    extraSql: string,
  ): Promise<{ bucket: Date | string; count: bigint }[]> {
    const expr = this.bucketSql(ctx.granularity, colRef);
    return this.prisma.$queryRawUnsafe<{ bucket: Date | string; count: bigint }[]>(
      `SELECT ${expr} AS bucket, COUNT(*) AS count
       FROM ${fromClause}
       WHERE ${colRef} >= ? AND ${colRef} < ?
       ${extraSql}
       GROUP BY bucket
       ORDER BY bucket ASC`,
      ctx.from,
      ctx.toExclusive,
    );
  }

  private bucketSql(granularity: AnalyticsGranularity, colRef: string): string {
    if (granularity === 'month') return `DATE_FORMAT(${colRef}, '%Y-%m')`;
    if (granularity === 'week') return `DATE(DATE_SUB(${colRef}, INTERVAL WEEKDAY(${colRef}) DAY))`;
    return `DATE(${colRef})`;
  }

  private normalizeBucket(bucket: Date | string, granularity: AnalyticsGranularity): string {
    if (typeof bucket === 'string') {
      if (granularity === 'month') return bucket.length === 7 ? bucket : bucket.slice(0, 7);
      return bucket.slice(0, 10);
    }
    if (granularity === 'month') return monthKey(bucket);
    return dayKey(bucket);
  }
}

function toCountMap<T extends string>(rows: { _count: { _all: number }; [k: string]: unknown }[], key: T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = String(row[key]);
    out[k] = row._count._all;
  }
  return out;
}
