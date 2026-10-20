import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Farm, type FarmManagementDetail, type Request } from '../../generated/prisma/client';
import { FarmRelationshipRole, RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { FarmAccessService } from '../authorization/farm-access.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { newRequestNumber } from '../requests/request-number';
import {
  OWNER_EDITABLE_STATUSES,
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_UNDER_REVIEW,
} from '../requests/request-workflow.policy';
import type {
  CreateFarmManagementRequestDto,
  FarmManagementRequestListResponseDto,
  FarmManagementRequestResponseDto,
  FarmManagementReviewFeedbackDto,
  UpdateFarmManagementRequestDto,
} from './dto/farm-management-request.dto';

const notFound = (): NotFoundException => new NotFoundException('Farm management request not found');

@Injectable()
export class FarmManagementRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async create(
    userId: bigint,
    farmId: bigint,
    dto: CreateFarmManagementRequestDto,
  ): Promise<FarmManagementRequestResponseDto> {
    const farm = await this.ownedFarm(userId, farmId);
    const created = await this.insert(userId, farm, dto);
    return toResponse(created.request, created.detail, farm, []);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<FarmManagementRequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const farmIds = await this.ownedFarmIds(userId);
    if (farmIds.length === 0) return { items: [], page, pageSize, total: 0 };

    const where: Prisma.RequestWhereInput = {
      createdBy: userId,
      requestType: RequestType.farmManagement,
      farmId: { in: farmIds },
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const details = await this.prisma.farmManagementDetail.findMany({
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

  async get(userId: bigint, requestId: bigint): Promise<FarmManagementRequestResponseDto> {
    const { request, detail, farm } = await this.owned(userId, requestId);
    const reviews = await this.ownerReviews([request.id]);
    return toResponse(request, detail, farm, reviews.get(request.id) ?? []);
  }

  /** Staff presentation without re-checking farm ownership (authorization is enforced by the staff service). */
  async getById(requestId: bigint): Promise<FarmManagementRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmManagement },
    });
    if (!request?.farmId) throw notFound();
    const farm = await this.prisma.farm.findFirst({ where: { id: request.farmId, deletedAt: null } });
    const detail = await this.prisma.farmManagementDetail.findUnique({ where: { requestId } });
    if (!farm || !detail) throw notFound();
    const reviews = await this.ownerReviews([requestId]);
    return toResponse(request, detail, farm, reviews.get(requestId) ?? []);
  }

  async update(
    userId: bigint,
    requestId: bigint,
    dto: UpdateFarmManagementRequestDto,
  ): Promise<FarmManagementRequestResponseDto> {
    const { request, farm } = await this.owned(userId, requestId);
    if (!OWNER_EDITABLE_STATUSES.has(request.status)) {
      throw new ConflictException('Only a draft or a request with requested changes can be updated');
    }
    const updatedDetail = await this.prisma.farmManagementDetail.update({
      where: { requestId: request.id },
      data: {
        ...(dto.professionalNeed !== undefined ? { professionalNeed: dto.professionalNeed } : {}),
        ...(dto.managementTypes !== undefined ? { managementTypes: dto.managementTypes } : {}),
        ...(dto.term !== undefined ? { term: dto.term ?? null } : {}),
        ...(dto.currentSituation !== undefined ? { currentSituation: dto.currentSituation ?? null } : {}),
        ...(dto.challenges !== undefined ? { challenges: dto.challenges } : {}),
        ...(dto.goals !== undefined ? { goals: dto.goals } : {}),
        ...(dto.outcomes !== undefined ? { outcomes: dto.outcomes ?? null } : {}),
        ...(dto.additionalInformation !== undefined
          ? { additionalInformation: dto.additionalInformation ?? null }
          : {}),
      },
    });
    const refreshed = await this.prisma.request.findUniqueOrThrow({ where: { id: request.id } });
    const reviews = await this.ownerReviews([request.id]);
    return toResponse(refreshed, updatedDetail, farm, reviews.get(request.id) ?? []);
  }

  async submit(userId: bigint, requestId: bigint): Promise<FarmManagementRequestResponseDto> {
    const { request, detail, farm } = await this.owned(userId, requestId);
    if (request.status !== REQUEST_STATUS_DRAFT && request.status !== 'changesRequested') {
      throw new ConflictException('This management request was already submitted');
    }
    if (!detail.currentSituation?.trim()) {
      throw new BadRequestException('Describe the current farm situation before submitting');
    }

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: {
          id: requestId,
          createdBy: userId,
          requestType: RequestType.farmManagement,
          status: { in: [REQUEST_STATUS_DRAFT, 'changesRequested'] },
        },
        data: { status: REQUEST_STATUS_UNDER_REVIEW, submittedAt, visibility: RequestVisibility.private },
      });
      if (locked.count !== 1) throw new ConflictException('This management request was already submitted');
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
  ): Promise<{ request: Request; detail: FarmManagementDetail; farm: Farm }> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId, requestType: RequestType.farmManagement },
    });
    if (!request?.farmId) throw notFound();
    const farm = await this.prisma.farm.findFirst({ where: { id: request.farmId, deletedAt: null } });
    const roles = await this.farmAccess.activeRoles(userId, request.farmId);
    if (!farm || !roles.includes(FarmRelationshipRole.owner)) throw notFound();
    const detail = await this.prisma.farmManagementDetail.findUnique({ where: { requestId } });
    if (!detail) throw notFound();
    return { request, detail, farm };
  }

  private async insert(
    userId: bigint,
    farm: Farm,
    dto: CreateFarmManagementRequestDto,
  ): Promise<{ request: Request; detail: FarmManagementDetail }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = newRequestNumber('FM');
      try {
        return await this.prisma.$transaction(async (tx) => {
          const request = await tx.request.create({
            data: {
              requestNumber,
              requestType: RequestType.farmManagement,
              createdBy: userId,
              farmId: farm.id,
              status: REQUEST_STATUS_DRAFT,
              visibility: RequestVisibility.private,
            },
          });
          const detail = await tx.farmManagementDetail.create({
            data: {
              requestId: request.id,
              professionalNeed: dto.professionalNeed,
              managementTypes: dto.managementTypes ?? undefined,
              term: dto.term ?? null,
              currentSituation: dto.currentSituation ?? null,
              goals: dto.goals ?? undefined,
              challenges: dto.challenges ?? undefined,
              outcomes: dto.outcomes ?? null,
              additionalInformation: dto.additionalInformation ?? null,
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

  private async ownerReviews(requestIds: bigint[]): Promise<Map<bigint, FarmManagementReviewFeedbackDto[]>> {
    if (requestIds.length === 0) return new Map();
    const rows = await this.prisma.requestReview.findMany({
      where: { requestId: { in: requestIds } },
      orderBy: { id: 'asc' },
      select: { requestId: true, decision: true, comment: true, createdAt: true },
    });
    const map = new Map<bigint, FarmManagementReviewFeedbackDto[]>();
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
  detail: FarmManagementDetail,
  farm: Farm,
  reviews: FarmManagementReviewFeedbackDto[],
): FarmManagementRequestResponseDto {
  return {
    id: request.id.toString(),
    requestNumber: request.requestNumber,
    farmId: farm.id.toString(),
    farmName: farm.name,
    professionalNeed: detail.professionalNeed,
    status: request.status,
    managementTypes: jsonStrings(detail.managementTypes),
    term: detail.term,
    currentSituation: detail.currentSituation,
    goals: jsonStrings(detail.goals),
    challenges: jsonStrings(detail.challenges),
    outcomes: detail.outcomes,
    additionalInformation: detail.additionalInformation,
    reviews,
    createdAt: request.createdAt?.toISOString() ?? null,
    updatedAt: request.updatedAt?.toISOString() ?? null,
  };
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
