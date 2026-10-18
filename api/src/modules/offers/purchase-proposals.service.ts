import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import {
  ListingType,
  ProposalKind,
  RequestStaffAssignmentType,
  RequestType,
  RequestVisibility,
  StaffRole,
} from '../../generated/prisma/enums';
import { staffHasAdminScope } from '../authorization/staff-permissions';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { STAFF_STATUS_ACTIVE, StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { moneyOut } from '../listing-requests/listing-prices';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import type {
  AssignProposalCaseAgentDto,
  CreateProposalDto,
  ProposalListResponseDto,
  ProposalResponseDto,
  UpdateProposalDto,
} from './dto/offers.dto';
import { assertProposalShape, poundsDecimal, shareDecimal } from './offer-values';
import { isActiveOwner, SaleTermsService } from './sale-terms.service';

export const PROPOSAL_SUBMITTED = 'submitted';
const notFound = (): NotFoundException => new NotFoundException('Purchase proposal not found');

@Injectable()
export class PurchaseProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly terms: SaleTermsService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async create(userId: bigint, slug: string, dto: CreateProposalDto): Promise<ProposalResponseDto> {
    const listing = await this.publishedSale(slug);
    if (listing.createdBy === userId || (await isActiveOwner(this.prisma, userId, listing.farmId))) {
      throw new ConflictException('An owner of this farm cannot propose on its listing');
    }
    const share = dto.requestedSharePercent === undefined ? null : shareDecimal(dto.requestedSharePercent, 'requestedSharePercent');
    const total = dto.proposedTotalValue === undefined ? null : poundsDecimal(dto.proposedTotalValue, 'proposedTotalValue');
    const effective = await this.terms.effective(listing.id);
    assertProposalShape(dto.proposalKind, effective, dto.components, share, total);
    const submittedAt = new Date();
    let requestId: bigint | null = null;
    for (let attempt = 0; attempt < 3 && requestId === null; attempt += 1) {
      try {
        requestId = await this.prisma.$transaction(
          async (tx) => {
            await tx.request.update({ where: { id: listing.id }, data: { updatedAt: new Date() } });
            const existing = await tx.request.findFirst({
              where: { createdBy: userId, parentRequestId: listing.id, requestType: RequestType.farmPurchaseProposal },
              select: { id: true },
            });
            if (existing) throw new ConflictException('You already have a proposal for this listing');
            const request = await tx.request.create({
              data: {
                requestNumber: `PP${randomBytes(12).toString('hex')}`.toUpperCase(),
                requestType: RequestType.farmPurchaseProposal,
                createdBy: userId,
                farmId: listing.farmId,
                parentRequestId: listing.id,
                status: PROPOSAL_SUBMITTED,
                visibility: RequestVisibility.private,
                submittedAt,
              },
            });
            await tx.farmPurchaseProposalDetail.create({
              data: {
                requestId: request.id,
                proposalKind: dto.proposalKind,
                proposedTotalValue: total,
                requestedSharePercent: share,
                proposalNotes: dto.proposalNotes ?? null,
                submittedAt,
              },
            });
            await this.writeComponents(tx, request.id, dto);
            await tx.requestStatusHistory.create({
              data: { requestId: request.id, fromStatus: null, toStatus: PROPOSAL_SUBMITTED, changedBy: userId },
            });
            await tx.auditLog.create({
              data: {
                actorUserId: userId,
                entityType: 'request',
                entityId: request.id,
                action: 'proposal_submitted',
                changes: { listingId: listing.id.toString(), proposalKind: dto.proposalKind },
              },
            });
            return request.id;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        );
      } catch (error) {
        if (isUniqueConflict(error) && attempt < 2) continue;
        throw error;
      }
    }
    if (requestId === null) throw new ConflictException('You already have a proposal for this listing');
    return this.present(await this.load(requestId));
  }

  async update(userId: bigint, proposalId: bigint, dto: UpdateProposalDto): Promise<ProposalResponseDto> {
    const current = await this.load(proposalId);
    if (current.request.createdBy !== userId) throw notFound();
    if (current.request.status !== PROPOSAL_SUBMITTED) throw new ConflictException('This proposal can no longer be changed');
    const grouped = await this.prisma.coPurchaseGroupMember.findFirst({
      where: { buyerProposalRequestId: proposalId },
      select: { id: true },
    });
    if (grouped) throw new ConflictException('This proposal is in a staff coordination group and can no longer be changed');
    const listing = current.request.parentRequestId;
    if (!listing) throw notFound();
    const share = dto.requestedSharePercent === undefined ? null : shareDecimal(dto.requestedSharePercent, 'requestedSharePercent');
    const total = dto.proposedTotalValue === undefined ? null : poundsDecimal(dto.proposedTotalValue, 'proposedTotalValue');
    assertProposalShape(dto.proposalKind, await this.terms.effective(listing), dto.components, share, total);
    await this.prisma.$transaction(async (tx) => {
      const parent = await tx.request.findFirst({
        where: {
          id: listing,
          requestType: RequestType.farmListing,
          status: LISTING_PUBLISHED,
          visibility: RequestVisibility.public,
        },
        select: { id: true },
      });
      if (!parent) throw new ConflictException('This listing is no longer published');
      await tx.farmPurchaseProposalDetail.update({
        where: { requestId: proposalId },
        data: {
          proposalKind: dto.proposalKind,
          proposedTotalValue: total,
          requestedSharePercent: share,
          proposalNotes: dto.proposalNotes ?? null,
        },
      });
      await tx.farmPurchaseProposalComponent.deleteMany({ where: { proposalRequestId: proposalId } });
      await this.writeComponents(tx, proposalId, dto);
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'request',
          entityId: proposalId,
          action: 'proposal_updated',
          changes: { proposalKind: dto.proposalKind },
        },
      });
    });
    return this.present(await this.load(proposalId));
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<ProposalListResponseDto> {
    return this.list({ createdBy: userId, requestType: RequestType.farmPurchaseProposal }, query);
  }

  async getMine(userId: bigint, proposalId: bigint): Promise<ProposalResponseDto> {
    const row = await this.load(proposalId);
    if (row.request.createdBy !== userId) throw notFound();
    return this.present(row);
  }

  async listStaff(userId: bigint, query: ListFarmsQueryDto): Promise<ProposalListResponseDto> {
    const access = await this.staffAccess(userId);
    if (access === 'admin') {
      return this.list({ requestType: RequestType.farmPurchaseProposal, status: PROPOSAL_SUBMITTED }, query);
    }
    const assigned = await this.prisma.requestStaffAssignment.findMany({
      where: { assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.caseAgent },
      select: { requestId: true },
    });
    const ids = assigned.map((row) => row.requestId);
    if (ids.length === 0) return { items: [], page: query.page ?? 1, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE, total: 0 };
    return this.list(
      { id: { in: ids }, requestType: RequestType.farmPurchaseProposal, status: PROPOSAL_SUBMITTED },
      query,
    );
  }

  async getStaff(userId: bigint, proposalId: bigint): Promise<ProposalResponseDto> {
    const access = await this.staffAccess(userId);
    const row = await this.load(proposalId);
    if (row.request.requestType !== RequestType.farmPurchaseProposal) throw notFound();
    if (access !== 'admin') {
      const slot = await this.prisma.requestStaffAssignment.findFirst({
        where: { requestId: proposalId, assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.caseAgent },
        select: { id: true },
      });
      if (!slot) throw notFound();
    }
    return this.present(row);
  }

  async assignCaseAgent(actorId: bigint, proposalId: bigint, dto: AssignProposalCaseAgentDto): Promise<ProposalResponseDto> {
    const assignedStaffId = BigInt(dto.assignedStaffId);
    await this.prisma.$transaction(async (tx) => {
      const admin = await tx.staffMembership.findFirst({
        where: { userId: actorId, staffRole: StaffRole.admin, status: STAFF_STATUS_ACTIVE },
        select: { id: true },
      });
      if (!admin) throw forbidden();
      const proposal = await tx.request.findFirst({
        where: { id: proposalId, requestType: RequestType.farmPurchaseProposal, status: PROPOSAL_SUBMITTED },
        select: { id: true },
      });
      if (!proposal) throw notFound();
      const agent = await tx.staffMembership.findFirst({
        where: { userId: assignedStaffId, staffRole: StaffRole.caseAgent, status: STAFF_STATUS_ACTIVE },
        select: { id: true },
      });
      if (!agent) throw forbidden();
      const existing = await tx.requestStaffAssignment.findFirst({
        where: { requestId: proposalId, assignmentType: RequestStaffAssignmentType.caseAgent },
      });
      const saved = existing
        ? await tx.requestStaffAssignment.update({
            where: { id: existing.id },
            data: { assignedStaffId, assignedByUserId: actorId },
          })
        : await tx.requestStaffAssignment.create({
            data: {
              requestId: proposalId,
              assignmentType: RequestStaffAssignmentType.caseAgent,
              assignedStaffId,
              assignedByUserId: actorId,
            },
          });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'request_staff_assignment',
          entityId: saved.id,
          action: existing ? 'reassigned' : 'assigned',
          changes: { requestId: proposalId.toString(), assignmentType: RequestStaffAssignmentType.caseAgent },
        },
      });
    });
    return this.getStaff(actorId, proposalId);
  }

  private async staffAccess(userId: bigint): Promise<'admin' | 'agent'> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return 'admin';
    if (staff.roles.includes(StaffRole.caseAgent)) return 'agent';
    throw forbidden();
  }

  private async list(where: Prisma.RequestWhereInput, query: ListFarmsQueryDto): Promise<ProposalListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true },
      }),
    ]);
    const items: ProposalResponseDto[] = [];
    for (const row of rows) items.push(this.present(await this.load(row.id)));
    return { items, page, pageSize, total };
  }

  private async publishedSale(slug: string): Promise<{ id: bigint; farmId: bigint; createdBy: bigint }> {
    const detail = await this.prisma.farmListingDetail.findUnique({
      where: { slug },
      select: { requestId: true, listingType: true },
    });
    if (!detail || detail.listingType !== ListingType.sale) throw new NotFoundException('Listing not found');
    const request = await this.prisma.request.findFirst({
      where: {
        id: detail.requestId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: { id: true, farmId: true, createdBy: true },
    });
    if (!request?.farmId) throw new NotFoundException('Listing not found');
    return { id: request.id, farmId: request.farmId, createdBy: request.createdBy };
  }

  private async writeComponents(tx: Prisma.TransactionClient, proposalId: bigint, dto: CreateProposalDto): Promise<void> {
    for (const component of dto.components) {
      await tx.farmPurchaseProposalComponent.create({
        data: {
          proposalRequestId: proposalId,
          componentType: component.componentType,
          proposedValue: poundsDecimal(component.proposedValue, 'proposedValue'),
          assetType: component.assetType ?? null,
          assetDescription: component.assetDescription ?? null,
          installmentCount: component.installmentCount ?? null,
          installmentInterval: component.installmentInterval ?? null,
          componentNotes: component.componentNotes ?? null,
        },
      });
    }
  }

  private async load(proposalId: bigint): Promise<LoadedProposal> {
    const request = await this.prisma.request.findFirst({ where: { id: proposalId } });
    const detail = request
      ? await this.prisma.farmPurchaseProposalDetail.findUnique({ where: { requestId: proposalId } })
      : null;
    if (!request?.parentRequestId || !detail) throw notFound();
    const components = await this.prisma.farmPurchaseProposalComponent.findMany({
      where: { proposalRequestId: proposalId },
      orderBy: { id: 'asc' },
    });
    return { request, detail, components };
  }

  private present(row: LoadedProposal): ProposalResponseDto {
    return {
      id: row.request.id.toString(),
      requestNumber: row.request.requestNumber,
      listingId: row.request.parentRequestId!.toString(),
      proposalKind: row.detail.proposalKind,
      proposedTotalValue: moneyOut(row.detail.proposedTotalValue),
      currency: row.detail.currency,
      requestedSharePercent: row.detail.requestedSharePercent ? row.detail.requestedSharePercent.toFixed(2) : null,
      proposalNotes: row.detail.proposalNotes,
      status: row.request.status,
      submittedAt: row.detail.submittedAt?.toISOString() ?? null,
      components: row.components.map((component) => ({
        id: component.id.toString(),
        componentType: component.componentType,
        proposedValue: moneyOut(component.proposedValue),
        currency: component.currency,
        assetType: component.assetType,
        assetDescription: component.assetDescription,
        installmentCount: component.installmentCount,
        installmentInterval: component.installmentInterval,
        componentNotes: component.componentNotes,
      })),
    };
  }
}

type LoadedProposal = {
  request: { id: bigint; requestNumber: string; createdBy: bigint; parentRequestId: bigint | null; status: string; requestType: string };
  detail: {
    proposalKind: ProposalKind;
    proposedTotalValue: { toFixed(digits: number): string } | null;
    currency: string;
    requestedSharePercent: { toFixed(digits: number): string } | null;
    proposalNotes: string | null;
    submittedAt: Date | null;
  };
  components: Array<{
    id: bigint;
    componentType: string;
    proposedValue: { toFixed(digits: number): string } | null;
    currency: string;
    assetType: string | null;
    assetDescription: string | null;
    installmentCount: number | null;
    installmentInterval: string | null;
    componentNotes: string | null;
  }>;
};

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
