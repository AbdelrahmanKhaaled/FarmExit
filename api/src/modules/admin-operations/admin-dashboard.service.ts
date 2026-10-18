import { Injectable } from '@nestjs/common';
import { CommunicationCaseStatus, ListingType, RequestStaffAssignmentType, RequestType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import {
  ACTIVE_FARM_DETAILS_REQUEST_STATUSES,
  ACTIVE_PARTNERSHIP_APPLICATION_STATUSES,
  ACTIVE_VERIFICATION_REQUEST_STATUSES,
  REQUEST_STATUS_CHANGES_REQUESTED,
  REQUEST_STATUS_SUBMITTED,
  REQUEST_STATUS_UNDER_REVIEW,
} from '../requests/request-workflow.policy';
import type { AdminDashboardOverviewDto, AdminWorkQueueDto } from './dto/admin-dashboard.dto';

const PENDING_LISTING = [REQUEST_STATUS_SUBMITTED, REQUEST_STATUS_UNDER_REVIEW] as string[];
const PENDING_GENERIC = PENDING_LISTING;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminDashboardOverviewDto> {
    const publishedBase = {
      requestType: RequestType.farmListing,
      status: LISTING_PUBLISHED,
      visibility: 'public' as const,
      farm: { deletedAt: null },
    };

    const [
      registeredUsers,
      farms,
      publishedSaleListings,
      publishedRentListings,
      pendingListingRequests,
      farmManagementRequests,
      partnershipRequests,
      partnershipApplications,
      professionalVerificationRequests,
      farmDetailsInquiries,
      purchaseProposals,
      activeCommunicationCases,
      requestsAwaitingReview,
      requestsAwaitingStaffAssignment,
    ] = await Promise.all([
      this.prisma.user.count({ where: { accountStatus: 'active' } }),
      this.prisma.farm.count({ where: { deletedAt: null } }),
      this.prisma.request.count({
        where: { ...publishedBase, listingDetail: { is: { listingType: ListingType.sale } } },
      }),
      this.prisma.request.count({
        where: { ...publishedBase, listingDetail: { is: { listingType: ListingType.rent } } },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.farmListing, status: { in: PENDING_LISTING } },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.farmManagement, status: { in: PENDING_GENERIC } },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.partnership, status: { in: PENDING_GENERIC } },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.partnershipApplication, status: { in: [...ACTIVE_PARTNERSHIP_APPLICATION_STATUSES].filter((s) => s !== 'draft') } },
      }),
      this.prisma.request.count({
        where: {
          requestType: RequestType.professionalVerification,
          status: { in: [...ACTIVE_VERIFICATION_REQUEST_STATUSES].filter((s) => s !== 'draft') },
        },
      }),
      this.prisma.request.count({
        where: {
          requestType: RequestType.farmDetails,
          status: { in: [...ACTIVE_FARM_DETAILS_REQUEST_STATUSES] },
        },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.farmPurchaseProposal, status: 'submitted' },
      }),
      this.prisma.communicationCase.count({ where: { status: { not: CommunicationCaseStatus.closed } } }),
      this.prisma.request.count({ where: { status: REQUEST_STATUS_UNDER_REVIEW } }),
      this.countUnassignedUnderReview(),
    ]);

    return {
      registeredUsers,
      farms,
      publishedSaleListings,
      publishedRentListings,
      pendingListingRequests,
      farmManagementRequests,
      partnershipRequests,
      partnershipApplications,
      professionalVerificationRequests,
      farmDetailsInquiries,
      purchaseProposals,
      activeCommunicationCases,
      requestsAwaitingStaffAssignment,
      requestsAwaitingReview,
    };
  }

  async workQueue(): Promise<AdminWorkQueueDto> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [unassignedUnderReview, changesRequested, pendingDocumentReviews, activeCommunicationCases, recentlyUpdatedRequests] =
      await Promise.all([
        this.countUnassignedUnderReview(),
        this.prisma.request.count({ where: { status: REQUEST_STATUS_CHANGES_REQUESTED } }),
        this.prisma.requestDocument.count({ where: { reviewStatus: 'uploaded' } }),
        this.prisma.communicationCase.count({ where: { status: { not: CommunicationCaseStatus.closed } } }),
        this.prisma.request.count({ where: { updatedAt: { gte: since } } }),
      ]);
    return {
      unassignedUnderReview,
      changesRequested,
      pendingDocumentReviews,
      activeCommunicationCases,
      recentlyUpdatedRequests,
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
      where: {
        requestId: { in: ids },
        assignmentType: RequestStaffAssignmentType.reviewer,
      },
      select: { requestId: true },
    });
    const assignedIds = new Set(assigned.map((a) => a.requestId));
    return ids.filter((id) => !assignedIds.has(id)).length;
  }
}
