import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  CoPurchaseGroupStatus,
  ListingType,
  ProposalKind,
  RequestType,
  RequestVisibility,
  StaffRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { STAFF_STATUS_ACTIVE, StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { moneyOut } from '../listing-requests/listing-prices';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import type {
  AddCoPurchaseMemberDto,
  CoPurchaseGroupListResponseDto,
  CoPurchaseGroupResponseDto,
  CoPurchaseMemberResponseDto,
  CreateCoPurchaseGroupDto,
  UpdateCoPurchaseGroupDto,
  UpdateCoPurchaseMemberDto,
} from './dto/offers.dto';
import { poundsDecimal, shareDecimal } from './offer-values';

const MAX_ID = 9223372036854775807n;
const notFound = (): NotFoundException => new NotFoundException('Co-purchase group not found');
const NEXT_STATUS: Record<string, readonly string[]> = {
  collectingInterest: [CoPurchaseGroupStatus.underStaffFollowup, CoPurchaseGroupStatus.closed],
  underStaffFollowup: [CoPurchaseGroupStatus.closed],
  closed: [],
};

@Injectable()
export class CoPurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async create(actorId: bigint, dto: CreateCoPurchaseGroupDto): Promise<CoPurchaseGroupResponseDto> {
    if ((await this.kind(actorId)) !== 'admin') throw forbidden();
    const listingId = parseId(dto.listingId, 'listingId');
    const assignedStaffId = parseId(dto.assignedStaffId, 'assignedStaffId');
    const target = shareDecimal(dto.targetSharePercent ?? 100, 'targetSharePercent');
    const groupId = await this.prisma.$transaction(
      async (tx) => {
        const listing = await this.publishedSale(tx, listingId);
        const coordinator = await tx.staffMembership.findFirst({
          where: { userId: assignedStaffId, status: STAFF_STATUS_ACTIVE },
          select: { id: true },
        });
        if (!coordinator) throw forbidden();
        const group = await tx.coPurchaseGroup.create({
          data: {
            listingRequestId: listing.id,
            assignedStaffId,
            targetSharePercent: target,
            listingAskingPriceSnapshot: listing.askingPrice,
            notes: dto.notes ?? null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            entityType: 'co_purchase_group',
            entityId: group.id,
            action: 'group_opened',
            changes: { listingId: listing.id.toString(), targetSharePercent: target.toFixed(2) },
          },
        });
        return group.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.present(await this.load(groupId));
  }

  async list(actorId: bigint, query: ListFarmsQueryDto): Promise<CoPurchaseGroupListResponseDto> {
    const access = await this.kind(actorId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = access === 'admin' ? {} : { assignedStaffId: actorId };
    const [total, rows] = await Promise.all([
      this.prisma.coPurchaseGroup.count({ where }),
      this.prisma.coPurchaseGroup.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true },
      }),
    ]);
    const items: CoPurchaseGroupResponseDto[] = [];
    for (const row of rows) items.push(this.present(await this.load(row.id)));
    return { items, page, pageSize, total };
  }

  async get(actorId: bigint, groupId: bigint): Promise<CoPurchaseGroupResponseDto> {
    await this.editable(actorId, groupId);
    return this.present(await this.load(groupId));
  }

  async update(actorId: bigint, groupId: bigint, dto: UpdateCoPurchaseGroupDto): Promise<CoPurchaseGroupResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const group = await this.lock(tx, actorId, groupId);
      if (dto.assignedStaffId !== undefined) {
        if ((await this.kind(actorId)) !== 'admin') throw forbidden();
        const assignedStaffId = parseId(dto.assignedStaffId, 'assignedStaffId');
        const coordinator = await tx.staffMembership.findFirst({
          where: { userId: assignedStaffId, status: STAFF_STATUS_ACTIVE },
          select: { id: true },
        });
        if (!coordinator) throw forbidden();
        await tx.coPurchaseGroup.update({ where: { id: groupId }, data: { assignedStaffId } });
      }
      if (dto.groupStatus && dto.groupStatus !== group.groupStatus) {
        const allowed = NEXT_STATUS[group.groupStatus] ?? [];
        if (!allowed.includes(dto.groupStatus)) throw new ConflictException('This group cannot move to that status');
        await tx.coPurchaseGroup.update({
          where: { id: groupId },
          data: {
            groupStatus: dto.groupStatus,
            closedAt: dto.groupStatus === CoPurchaseGroupStatus.closed ? new Date() : group.closedAt,
          },
        });
      }
      if (dto.notes !== undefined) {
        await tx.coPurchaseGroup.update({ where: { id: groupId }, data: { notes: dto.notes } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'co_purchase_group',
          entityId: groupId,
          action: 'group_updated',
          changes: { groupStatus: dto.groupStatus ?? group.groupStatus },
        },
      });
    });
    return this.present(await this.load(groupId));
  }

  async addMember(actorId: bigint, groupId: bigint, dto: AddCoPurchaseMemberDto): Promise<CoPurchaseGroupResponseDto> {
    const proposalId = parseId(dto.proposalId, 'proposalId');
    await this.prisma.$transaction(
      async (tx) => {
        const group = await this.lock(tx, actorId, groupId);
        if (group.groupStatus === CoPurchaseGroupStatus.closed) {
          throw new ConflictException('This group is closed');
        }
        const proposal = await tx.farmPurchaseProposalDetail.findUnique({ where: { requestId: proposalId } });
        const request = await tx.request.findFirst({
          where: { id: proposalId, requestType: RequestType.farmPurchaseProposal },
          select: { parentRequestId: true },
        });
        if (!proposal || proposal.proposalKind !== ProposalKind.coPurchase || request?.parentRequestId !== group.listingRequestId) {
          throw new NotFoundException('Co-purchase proposal not found for this listing');
        }
        const share =
          dto.proposedSharePercent === undefined
            ? proposal.requestedSharePercent
            : shareDecimal(dto.proposedSharePercent, 'proposedSharePercent');
        if (!share) throw new BadRequestException('This proposal has no share percent');
        assertWithinTarget(share, group.targetSharePercent);
        try {
          const member = await tx.coPurchaseGroupMember.create({
            data: {
              groupId,
              buyerProposalRequestId: proposalId,
              proposedSharePercent: share,
              proposedContributionValue:
                dto.proposedContributionValue === undefined
                  ? null
                  : poundsDecimal(dto.proposedContributionValue, 'proposedContributionValue'),
            },
          });
          await tx.auditLog.create({
            data: {
              actorUserId: actorId,
              entityType: 'co_purchase_group_member',
              entityId: member.id,
              action: 'member_added',
              changes: { groupId: groupId.toString(), proposalId: proposalId.toString(), proposedSharePercent: share.toFixed(2) },
            },
          });
        } catch (error) {
          if (isUniqueConflict(error)) throw new ConflictException('This proposal is already in the group');
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.present(await this.load(groupId));
  }

  async updateMember(
    actorId: bigint,
    groupId: bigint,
    memberId: bigint,
    dto: UpdateCoPurchaseMemberDto,
  ): Promise<CoPurchaseGroupResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const group = await this.lock(tx, actorId, groupId);
      if (group.groupStatus === CoPurchaseGroupStatus.closed) throw new ConflictException('This group is closed');
      const member = await tx.coPurchaseGroupMember.findFirst({ where: { id: memberId, groupId } });
      if (!member) throw new NotFoundException('Co-purchase member not found');
      const share =
        dto.proposedSharePercent === undefined ? null : shareDecimal(dto.proposedSharePercent, 'proposedSharePercent');
      if (share) assertWithinTarget(share, group.targetSharePercent);
      await tx.coPurchaseGroupMember.update({
        where: { id: memberId },
        data: {
          ...(dto.memberStatus ? { memberStatus: dto.memberStatus } : {}),
          ...(share ? { proposedSharePercent: share } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'co_purchase_group_member',
          entityId: memberId,
          action: 'member_updated',
          changes: { groupId: groupId.toString(), memberStatus: dto.memberStatus ?? member.memberStatus },
        },
      });
    });
    return this.present(await this.load(groupId));
  }

  private async kind(userId: bigint): Promise<'admin' | 'staff'> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff) throw forbidden();
    if (staff.roles.includes(StaffRole.admin)) return 'admin';
    if (staff.roles.includes(StaffRole.caseAgent)) return 'staff';
    throw forbidden();
  }

  private async editable(actorId: bigint, groupId: bigint): Promise<void> {
    const access = await this.kind(actorId);
    const group = await this.prisma.coPurchaseGroup.findUnique({ where: { id: groupId }, select: { assignedStaffId: true } });
    if (!group) throw notFound();
    if (access !== 'admin' && group.assignedStaffId !== actorId) throw notFound();
  }

  private async lock(
    tx: Prisma.TransactionClient,
    actorId: bigint,
    groupId: bigint,
  ): Promise<{ listingRequestId: bigint; assignedStaffId: bigint; groupStatus: string; targetSharePercent: Prisma.Decimal; closedAt: Date | null; notes: string | null }> {
    const access = await this.kind(actorId);
    const current = await tx.coPurchaseGroup.findUnique({ where: { id: groupId } });
    if (!current) throw notFound();
    if (access !== 'admin' && current.assignedStaffId !== actorId) throw notFound();
    await tx.coPurchaseGroup.update({ where: { id: groupId }, data: { notes: current.notes } });
    const locked = await tx.coPurchaseGroup.findUnique({ where: { id: groupId } });
    if (!locked) throw notFound();
    return locked;
  }

  private async publishedSale(
    tx: Prisma.TransactionClient,
    listingId: bigint,
  ): Promise<{ id: bigint; askingPrice: Prisma.Decimal | null }> {
    const exists = await tx.request.findFirst({ where: { id: listingId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Listing not found');
    await tx.request.update({ where: { id: listingId }, data: { updatedAt: new Date() } });
    const request = await tx.request.findFirst({
      where: {
        id: listingId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: { id: true },
    });
    const detail = await tx.farmListingDetail.findUnique({
      where: { requestId: listingId },
      select: { listingType: true, askingPrice: true },
    });
    if (!request || !detail || detail.listingType !== ListingType.sale) throw new NotFoundException('Listing not found');
    const terms = await tx.farmSaleTerms.findUnique({ where: { listingRequestId: listingId }, select: { listingRequestId: true } });
    if (!terms) {
      throw new ConflictException('Sale terms must be stored on this listing before a co-purchase group can be coordinated');
    }
    return { id: listingId, askingPrice: detail.askingPrice };
  }

  private async load(groupId: bigint): Promise<LoadedGroup> {
    const group = await this.prisma.coPurchaseGroup.findUnique({ where: { id: groupId } });
    if (!group) throw notFound();
    const members = await this.prisma.coPurchaseGroupMember.findMany({ where: { groupId }, orderBy: { id: 'asc' } });
    return { group, members };
  }

  private present(row: LoadedGroup): CoPurchaseGroupResponseDto {
    return {
      id: row.group.id.toString(),
      listingId: row.group.listingRequestId.toString(),
      targetSharePercent: row.group.targetSharePercent.toFixed(2),
      listingAskingPriceSnapshot: moneyOut(row.group.listingAskingPriceSnapshot),
      groupStatus: row.group.groupStatus,
      notes: row.group.notes,
      assignedStaffId: row.group.assignedStaffId.toString(),
      members: row.members.map(
        (member): CoPurchaseMemberResponseDto => ({
          id: member.id.toString(),
          proposalId: member.buyerProposalRequestId.toString(),
          proposedSharePercent: member.proposedSharePercent.toFixed(2),
          proposedContributionValue: moneyOut(member.proposedContributionValue),
          memberStatus: member.memberStatus,
        }),
      ),
    };
  }
}

type LoadedGroup = {
  group: {
    id: bigint;
    listingRequestId: bigint;
    assignedStaffId: bigint;
    targetSharePercent: { toFixed(digits: number): string };
    listingAskingPriceSnapshot: { toFixed(digits: number): string } | null;
    groupStatus: string;
    notes: string | null;
  };
  members: Array<{
    id: bigint;
    buyerProposalRequestId: bigint;
    proposedSharePercent: { toFixed(digits: number): string };
    proposedContributionValue: { toFixed(digits: number): string } | null;
    memberStatus: string;
  }>;
};

function parseId(value: string, field: string): bigint {
  if (!/^[1-9]\d{0,18}$/.test(value)) throw new BadRequestException(`Invalid ${field}`);
  const id = BigInt(value);
  if (id > MAX_ID) throw new BadRequestException(`Invalid ${field}`);
  return id;
}

function assertWithinTarget(share: Prisma.Decimal, target: Prisma.Decimal | { toFixed(digits: number): string }): void {
  if (share.greaterThan(new Prisma.Decimal(target.toFixed(2)))) {
    throw new BadRequestException('The share is above this group target');
  }
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
