import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ProfessionalVerificationDetail, type Request } from '../../generated/prisma/client';
import { RequestType, RequestVisibility, VerificationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfessionalProfilesService } from '../professional-profiles/professional-profiles.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { newRequestNumber } from '../requests/request-number';
import {
  ACTIVE_VERIFICATION_REQUEST_STATUSES,
  OWNER_EDITABLE_STATUSES,
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_UNDER_REVIEW,
} from '../requests/request-workflow.policy';
import type {
  CreateProfessionalVerificationRequestDto,
  ProfessionalVerificationRequestListResponseDto,
  ProfessionalVerificationRequestResponseDto,
  ProfessionalVerificationReviewFeedbackDto,
  UpdateProfessionalVerificationRequestDto,
} from './dto/professional-verification-request.dto';

const notFound = (): NotFoundException => new NotFoundException('Professional verification request not found');

@Injectable()
export class ProfessionalVerificationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfessionalProfilesService,
  ) {}

  async create(userId: bigint, dto: CreateProfessionalVerificationRequestDto): Promise<ProfessionalVerificationRequestResponseDto> {
    const capabilityId = BigInt(dto.professionalCapabilityId);
    const capability = await this.prisma.professionalCapability.findFirst({
      where: { id: capabilityId, profile: { userId } },
      include: { profile: true },
    });
    if (!capability) throw notFound();
    if (capability.verificationStatus === VerificationStatus.verified) {
      throw new ConflictException('This capability is already verified');
    }

    const active = await this.prisma.request.findFirst({
      where: {
        createdBy: userId,
        requestType: RequestType.professionalVerification,
        status: { in: [...ACTIVE_VERIFICATION_REQUEST_STATUSES] },
        professionalVerification: { is: { professionalCapabilityId: capabilityId } },
      },
    });
    if (active) {
      throw new ConflictException('An active verification request already exists for this capability');
    }

    const snapshot = await this.profiles.buildSnapshot(capabilityId);
    const created = await this.insert(userId, capabilityId, snapshot);
    return this.present(created.request.id);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<ProfessionalVerificationRequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.RequestWhereInput = {
      createdBy: userId,
      requestType: RequestType.professionalVerification,
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const items = await Promise.all(rows.map((row) => this.present(row.id)));
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<ProfessionalVerificationRequestResponseDto> {
    await this.owned(userId, requestId);
    return this.present(requestId);
  }

  async getById(requestId: bigint): Promise<ProfessionalVerificationRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.professionalVerification },
    });
    if (!request) throw notFound();
    return this.present(requestId);
  }

  async update(
    userId: bigint,
    requestId: bigint,
    dto: UpdateProfessionalVerificationRequestDto,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    const request = await this.owned(userId, requestId);
    if (!OWNER_EDITABLE_STATUSES.has(request.status)) {
      throw new ConflictException('Only a draft or a request with requested changes can be updated');
    }
    if (dto.verificationSummary !== undefined) {
      await this.prisma.professionalVerificationDetail.update({
        where: { requestId },
        data: { verificationSummary: dto.verificationSummary ?? null },
      });
    }
    return this.present(requestId);
  }

  async submit(userId: bigint, requestId: bigint): Promise<ProfessionalVerificationRequestResponseDto> {
    const request = await this.owned(userId, requestId);
    if (request.status !== REQUEST_STATUS_DRAFT && request.status !== 'changesRequested') {
      throw new ConflictException('This verification request was already submitted');
    }
    const docCount = await this.prisma.requestDocument.count({ where: { requestId } });
    if (docCount < 1) throw new BadRequestException('Upload at least one supporting document before submitting');

    const detail = await this.prisma.professionalVerificationDetail.findUniqueOrThrow({ where: { requestId } });
    const snapshot = await this.profiles.buildSnapshot(detail.professionalCapabilityId);
    const submittedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: {
          id: requestId,
          createdBy: userId,
          requestType: RequestType.professionalVerification,
          status: { in: [REQUEST_STATUS_DRAFT, 'changesRequested'] },
        },
        data: { status: REQUEST_STATUS_UNDER_REVIEW, submittedAt, visibility: RequestVisibility.private },
      });
      if (locked.count !== 1) throw new ConflictException('This verification request was already submitted');
      await tx.professionalVerificationDetail.update({
        where: { requestId },
        data: { profileSnapshot: snapshot as Prisma.InputJsonValue },
      });
      await tx.professionalCapability.update({
        where: { id: detail.professionalCapabilityId },
        data: { verificationStatus: VerificationStatus.underReview, notApprovedReason: null },
      });
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: REQUEST_STATUS_UNDER_REVIEW,
          changedBy: userId,
          reason: 'Submitted for FarmExit verification review',
        },
      });
    });
    return this.present(requestId);
  }

  private async owned(userId: bigint, requestId: bigint): Promise<Request> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId, requestType: RequestType.professionalVerification },
    });
    if (!request) throw notFound();
    return request;
  }

  private async insert(
    userId: bigint,
    capabilityId: bigint,
    snapshot: Record<string, unknown>,
  ): Promise<{ request: Request; detail: ProfessionalVerificationDetail }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = newRequestNumber('PV');
      try {
        return await this.prisma.$transaction(async (tx) => {
          const request = await tx.request.create({
            data: {
              requestNumber,
              requestType: RequestType.professionalVerification,
              createdBy: userId,
              status: REQUEST_STATUS_DRAFT,
              visibility: RequestVisibility.private,
            },
          });
          const detail = await tx.professionalVerificationDetail.create({
            data: {
              requestId: request.id,
              professionalCapabilityId: capabilityId,
              profileSnapshot: snapshot as Prisma.InputJsonValue,
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

  private async present(requestId: bigint): Promise<ProfessionalVerificationRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.professionalVerification },
    });
    if (!request) throw notFound();
    const detail = await this.prisma.professionalVerificationDetail.findUnique({
      where: { requestId },
      include: { capability: true },
    });
    if (!detail) throw notFound();
    const reviews = await this.ownerReviews([requestId]);
    return {
      id: request.id.toString(),
      requestNumber: request.requestNumber,
      status: request.status,
      professionalCapabilityId: detail.professionalCapabilityId.toString(),
      professionalType: detail.capability.professionalType,
      verificationSummary: detail.verificationSummary,
      reviews: reviews.get(requestId) ?? [],
      createdAt: request.createdAt?.toISOString() ?? null,
      updatedAt: request.updatedAt?.toISOString() ?? null,
    };
  }

  private async ownerReviews(requestIds: bigint[]): Promise<Map<bigint, ProfessionalVerificationReviewFeedbackDto[]>> {
    const rows = await this.prisma.requestReview.findMany({
      where: { requestId: { in: requestIds } },
      orderBy: { id: 'asc' },
      select: { requestId: true, decision: true, comment: true, createdAt: true },
    });
    const map = new Map<bigint, ProfessionalVerificationReviewFeedbackDto[]>();
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

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
