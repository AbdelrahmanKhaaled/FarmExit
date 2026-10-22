import type { PublicOpportunityListDto } from '../marketplace/dto/public-opportunity.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Farm, type PartnershipDetail, type Request } from '../../generated/prisma/client';
import { FarmRelationshipRole, RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { FarmAccessService } from '../authorization/farm-access.service';
import type { PublicOpportunityQueryDto } from '../marketplace/dto/public-opportunity-query.dto';
import { toPublicOpportunityDto } from '../marketplace/public-opportunity-map';
import {
  assertPublicOpportunityRanges,
  buildPublicOpportunityWhere,
  publicOpportunityListSelect,
  publicOpportunityOrderBy,
} from '../marketplace/public-opportunity-query';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { newRequestNumber } from '../requests/request-number';
import {
  ACTIVE_PARTNERSHIP_REQUEST_STATUSES,
  OWNER_EDITABLE_STATUSES,
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_UNDER_REVIEW,
} from '../requests/request-workflow.policy';
import type {
  CreatePartnershipRequestDto,
  PartnershipRequestListResponseDto,
  PartnershipRequestResponseDto,
  PartnershipReviewFeedbackDto,
  UpdatePartnershipRequestDto,
} from './dto/partnership-request.dto';

const notFound = (): NotFoundException => new NotFoundException('Partnership request not found');

@Injectable()
export class PartnershipRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  /** Read-only projection. Approval never grants public visibility or a publication timestamp. */
  async listPublic(query: PublicOpportunityQueryDto): Promise<PublicOpportunityListDto> {
    assertPublicOpportunityRanges(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = buildPublicOpportunityWhere(RequestType.partnership, query);
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: publicOpportunityOrderBy(query.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: publicOpportunityListSelect,
      }),
    ]);
    return { items: rows.map(toPublicOpportunityDto), page, pageSize, total };
  }

  async getPublic(id: bigint) {
    const row = await this.prisma.request.findFirst({
      where: { AND: [buildPublicOpportunityWhere(RequestType.partnership, {}), { id }] },
      select: publicOpportunityListSelect,
    });
    if (!row) throw notFound();
    return toPublicOpportunityDto(row);
  }

  async create(
    userId: bigint,
    farmId: bigint,
    dto: CreatePartnershipRequestDto,
  ): Promise<PartnershipRequestResponseDto> {
    const farm = await this.ownedFarm(userId, farmId);
    await this.assertNoConflictingActive(userId, farmId);
    const created = await this.insert(userId, farm, dto);
    return toResponse(created.request, created.detail, farm, []);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<PartnershipRequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const farmIds = await this.ownedFarmIds(userId);
    if (farmIds.length === 0) return { items: [], page, pageSize, total: 0 };

    const where: Prisma.RequestWhereInput = {
      createdBy: userId,
      requestType: RequestType.partnership,
      farmId: { in: farmIds },
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const details = await this.prisma.partnershipDetail.findMany({
      where: { requestId: { in: rows.map((r) => r.id) } },
    });
    const farms = await this.prisma.farm.findMany({
      where: { id: { in: rows.map((r) => r.farmId!).filter(Boolean) }, deletedAt: null },
    });
    const detailBy = new Map(details.map((d) => [d.requestId, d]));
    const farmBy = new Map(farms.map((f) => [f.id, f]));
    const reviews = await this.ownerReviews(rows.map((r) => r.id));
    const items = rows.flatMap((row) => {
      const detail = detailBy.get(row.id);
      const farm = row.farmId ? farmBy.get(row.farmId) : undefined;
      return detail && farm ? [toResponse(row, detail, farm, reviews.get(row.id) ?? [])] : [];
    });
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<PartnershipRequestResponseDto> {
    const { request, detail, farm } = await this.owned(userId, requestId);
    const reviews = await this.ownerReviews([request.id]);
    return toResponse(request, detail, farm, reviews.get(request.id) ?? []);
  }

  async getById(requestId: bigint): Promise<PartnershipRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.partnership },
    });
    if (!request?.farmId) throw notFound();
    const farm = await this.prisma.farm.findFirst({ where: { id: request.farmId, deletedAt: null } });
    const detail = await this.prisma.partnershipDetail.findUnique({ where: { requestId } });
    if (!farm || !detail) throw notFound();
    const reviews = await this.ownerReviews([requestId]);
    return toResponse(request, detail, farm, reviews.get(requestId) ?? []);
  }

  async update(
    userId: bigint,
    requestId: bigint,
    dto: UpdatePartnershipRequestDto,
  ): Promise<PartnershipRequestResponseDto> {
    const { request, farm } = await this.owned(userId, requestId);
    if (!OWNER_EDITABLE_STATUSES.has(request.status)) {
      throw new ConflictException('Only a draft or a request with requested changes can be updated');
    }
    const updatedDetail = await this.prisma.partnershipDetail.update({
      where: { requestId: request.id },
      data: {
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.objective !== undefined ? { objective: dto.objective } : {}),
        ...(dto.acceptedPartnerTypes !== undefined ? { acceptedPartnerTypes: dto.acceptedPartnerTypes } : {}),
        ...(dto.contributionDetails !== undefined ? { contributionDetails: dto.contributionDetails ?? null } : {}),
        ...(dto.operations !== undefined ? { operations: dto.operations ?? null } : {}),
        ...(dto.salesChannel !== undefined ? { salesChannel: dto.salesChannel ?? null } : {}),
        ...(dto.extraInformation !== undefined ? { extraInformation: dto.extraInformation ?? null } : {}),
      },
    });
    const refreshed = await this.prisma.request.findUniqueOrThrow({ where: { id: request.id } });
    const reviews = await this.ownerReviews([request.id]);
    return toResponse(refreshed, updatedDetail, farm, reviews.get(request.id) ?? []);
  }

  async submit(userId: bigint, requestId: bigint): Promise<PartnershipRequestResponseDto> {
    const { request, detail, farm } = await this.owned(userId, requestId);
    if (request.status !== REQUEST_STATUS_DRAFT && request.status !== 'changesRequested') {
      throw new ConflictException('This partnership request was already submitted');
    }
    if (!detail.description?.trim() && !jsonStrings(detail.objective)?.length) {
      throw new BadRequestException('Provide a description or objective before submitting');
    }
    await this.ownedFarm(userId, farm.id);

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: {
          id: requestId,
          createdBy: userId,
          requestType: RequestType.partnership,
          status: { in: [REQUEST_STATUS_DRAFT, 'changesRequested'] },
        },
        data: { status: REQUEST_STATUS_UNDER_REVIEW, submittedAt, visibility: RequestVisibility.private },
      });
      if (locked.count !== 1) throw new ConflictException('This partnership request was already submitted');
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: REQUEST_STATUS_UNDER_REVIEW,
          changedBy: userId,
          reason: 'Submitted for FarmExit review',
        },
      });
    });
    const refreshed = await this.prisma.request.findUniqueOrThrow({ where: { id: requestId } });
    const reviews = await this.ownerReviews([requestId]);
    return toResponse(refreshed, detail, farm, reviews.get(requestId) ?? []);
  }

  private async assertNoConflictingActive(userId: bigint, farmId: bigint): Promise<void> {
    const existing = await this.prisma.request.findFirst({
      where: {
        createdBy: userId,
        farmId,
        requestType: RequestType.partnership,
        status: { in: [...ACTIVE_PARTNERSHIP_REQUEST_STATUSES] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An active partnership request already exists for this farm');
    }
  }

  private async ownedFarm(userId: bigint, farmId: bigint): Promise<Farm> {
    const [farm, roles] = await Promise.all([
      this.prisma.farm.findFirst({ where: { id: farmId, deletedAt: null } }),
      this.farmAccess.activeRoles(userId, farmId),
    ]);
    if (!farm || roles.length === 0) throw new NotFoundException('Farm not found');
    if (!roles.includes(FarmRelationshipRole.owner)) throw forbidden();
    return farm;
  }

  private async ownedFarmIds(userId: bigint): Promise<bigint[]> {
    const rolesByFarm = await this.farmAccess.activeRolesByFarm(userId);
    const owned = [...rolesByFarm.entries()]
      .filter(([, roles]) => roles.includes(FarmRelationshipRole.owner))
      .map(([id]) => id);
    if (owned.length === 0) return [];
    const farms = await this.prisma.farm.findMany({
      where: { id: { in: owned }, deletedAt: null },
      select: { id: true },
    });
    return farms.map((f) => f.id);
  }

  private async owned(
    userId: bigint,
    requestId: bigint,
  ): Promise<{ request: Request; detail: PartnershipDetail; farm: Farm }> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId, requestType: RequestType.partnership },
    });
    if (!request?.farmId) throw notFound();
    const farm = await this.prisma.farm.findFirst({ where: { id: request.farmId, deletedAt: null } });
    const roles = await this.farmAccess.activeRoles(userId, request.farmId);
    if (!farm || !roles.includes(FarmRelationshipRole.owner)) throw notFound();
    const detail = await this.prisma.partnershipDetail.findUnique({ where: { requestId } });
    if (!detail) throw notFound();
    return { request, detail, farm };
  }

  private async insert(
    userId: bigint,
    farm: Farm,
    dto: CreatePartnershipRequestDto,
  ): Promise<{ request: Request; detail: PartnershipDetail }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = newRequestNumber('PN');
      try {
        return await this.prisma.$transaction(async (tx) => {
          const request = await tx.request.create({
            data: {
              requestNumber,
              requestType: RequestType.partnership,
              createdBy: userId,
              farmId: farm.id,
              status: REQUEST_STATUS_DRAFT,
              visibility: RequestVisibility.private,
            },
          });
          const detail = await tx.partnershipDetail.create({
            data: {
              requestId: request.id,
              description: dto.description ?? null,
              objective: dto.objective ?? undefined,
            },
          });
          await tx.requestStatusHistory.create({
            data: { requestId: request.id, fromStatus: null, toStatus: REQUEST_STATUS_DRAFT, changedBy: userId },
          });
          return { request, detail };
        });
      } catch (error) {
        if (isUnique(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error('Could not allocate request number');
  }

  private async ownerReviews(requestIds: bigint[]): Promise<Map<bigint, PartnershipReviewFeedbackDto[]>> {
    if (requestIds.length === 0) return new Map();
    const rows = await this.prisma.requestReview.findMany({
      where: { requestId: { in: requestIds } },
      orderBy: { id: 'asc' },
      select: { requestId: true, decision: true, comment: true, createdAt: true },
    });
    const map = new Map<bigint, PartnershipReviewFeedbackDto[]>();
    for (const row of rows) {
      const list = map.get(row.requestId) ?? [];
      list.push({
        decision: row.decision,
        comment: row.comment,
        createdAt: row.createdAt?.toISOString() ?? null,
      });
      map.set(row.requestId, list);
    }
    return map;
  }
}

function jsonStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length ? items : null;
}

function toResponse(
  request: Request,
  detail: PartnershipDetail,
  farm: Farm,
  reviews: PartnershipReviewFeedbackDto[],
): PartnershipRequestResponseDto {
  return {
    id: request.id.toString(),
    requestNumber: request.requestNumber,
    farmId: farm.id.toString(),
    farmName: farm.name,
    status: request.status,
    visibility: request.visibility,
    publishedAt: request.publishedAt?.toISOString() ?? null,
    submittedAt: request.submittedAt?.toISOString() ?? null,
    description: detail.description,
    objective: jsonStrings(detail.objective),
    acceptedPartnerTypes: jsonStrings(detail.acceptedPartnerTypes),
    contributionDetails: detail.contributionDetails,
    operations: detail.operations,
    salesChannel: detail.salesChannel,
    extraInformation: detail.extraInformation,
    reviews,
    createdAt: request.createdAt?.toISOString() ?? null,
    updatedAt: request.updatedAt?.toISOString() ?? null,
  };
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
