import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Request, type RequestApplicationDetail } from '../../generated/prisma/client';
import { ApplicantKind, FarmRelationshipRole, RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { newRequestNumber } from '../requests/request-number';
import {
  ACTIVE_PARTNERSHIP_APPLICATION_STATUSES,
  OWNER_EDITABLE_STATUSES,
  PARTNERSHIP_PARENT_OPEN_FOR_APPLICATIONS,
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_UNDER_REVIEW,
} from '../requests/request-workflow.policy';
import type {
  CreatePartnershipApplicationDto,
  PartnershipApplicationListResponseDto,
  PartnershipApplicationResponseDto,
  PartnershipApplicationReviewFeedbackDto,
  UpdatePartnershipApplicationDto,
} from './dto/partnership-application.dto';

const notFound = (): NotFoundException => new NotFoundException('Partnership application not found');

@Injectable()
export class PartnershipApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async create(userId: bigint, dto: CreatePartnershipApplicationDto): Promise<PartnershipApplicationResponseDto> {
    const parentId = BigInt(dto.parentPartnershipRequestId);
    const parent = await this.openParent(parentId);
    await this.assertApplicantEligible(userId, parent);
    await this.assertNoConflictingActive(userId, parentId);

    const created = await this.insert(userId, parent, dto.applicantKind);
    return this.present(created.request.id);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<PartnershipApplicationListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.RequestWhereInput = {
      createdBy: userId,
      requestType: RequestType.partnershipApplication,
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const items = await Promise.all(rows.map((row) => this.present(row.id)));
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<PartnershipApplicationResponseDto> {
    await this.owned(userId, requestId);
    return this.present(requestId);
  }

  async getById(requestId: bigint): Promise<PartnershipApplicationResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.partnershipApplication },
    });
    if (!request) throw notFound();
    return this.present(requestId);
  }

  async update(
    userId: bigint,
    requestId: bigint,
    dto: UpdatePartnershipApplicationDto,
  ): Promise<PartnershipApplicationResponseDto> {
    const request = await this.owned(userId, requestId);
    if (!OWNER_EDITABLE_STATUSES.has(request.status)) {
      throw new ConflictException('Only a draft or an application with requested changes can be updated');
    }
    const detail = await this.prisma.requestApplicationDetail.findUniqueOrThrow({ where: { requestId } });
    if (detail.applicantKind === ApplicantKind.company) {
      validateCompanyFieldsOnUpdate(dto, detail);
    }
    await this.prisma.requestApplicationDetail.update({
      where: { requestId },
      data: {
        ...(dto.applicationMessage !== undefined ? { applicationMessage: dto.applicationMessage ?? null } : {}),
        ...(dto.whyGoodFit !== undefined ? { whyGoodFit: dto.whyGoodFit ?? null } : {}),
        ...(dto.relevantExperience !== undefined ? { relevantExperience: dto.relevantExperience ?? null } : {}),
        ...(dto.approach !== undefined ? { approach: dto.approach ?? null } : {}),
        ...(dto.companyName !== undefined ? { companyName: dto.companyName ?? null } : {}),
        ...(dto.companyRegistrationNumber !== undefined
          ? { companyRegistrationNumber: dto.companyRegistrationNumber ?? null }
          : {}),
        ...(dto.companyContactName !== undefined ? { companyContactName: dto.companyContactName ?? null } : {}),
        ...(dto.companyContactRole !== undefined ? { companyContactRole: dto.companyContactRole ?? null } : {}),
        ...(dto.companySector !== undefined ? { companySector: dto.companySector ?? null } : {}),
      },
    });
    return this.present(requestId);
  }

  async submit(userId: bigint, requestId: bigint): Promise<PartnershipApplicationResponseDto> {
    const request = await this.owned(userId, requestId);
    if (request.status !== REQUEST_STATUS_DRAFT && request.status !== 'changesRequested') {
      throw new ConflictException('This application was already submitted');
    }
    const detail = await this.prisma.requestApplicationDetail.findUniqueOrThrow({ where: { requestId } });
    assertSubmitShape(detail);
    if (!request.parentRequestId) throw new BadRequestException('Application is not linked to a partnership request');
    await this.openParent(request.parentRequestId);

    const docCount = await this.prisma.requestDocument.count({ where: { requestId } });
    if (docCount < 1) throw new BadRequestException('Upload at least one supporting document before submitting');

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: {
          id: requestId,
          createdBy: userId,
          requestType: RequestType.partnershipApplication,
          status: { in: [REQUEST_STATUS_DRAFT, 'changesRequested'] },
        },
        data: { status: REQUEST_STATUS_UNDER_REVIEW, submittedAt, visibility: RequestVisibility.private },
      });
      if (locked.count !== 1) throw new ConflictException('This application was already submitted');
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: REQUEST_STATUS_UNDER_REVIEW,
          changedBy: userId,
          reason: 'Partnership application submitted for FarmExit review',
        },
      });
    });
    return this.present(requestId);
  }

  private async openParent(parentId: bigint): Promise<Request> {
    const parent = await this.prisma.request.findFirst({
      where: { id: parentId, requestType: RequestType.partnership },
    });
    if (!parent || !PARTNERSHIP_PARENT_OPEN_FOR_APPLICATIONS.has(parent.status)) {
      throw new ConflictException('This farm partnership opportunity is not open for applications');
    }
    return parent;
  }

  private async assertApplicantEligible(userId: bigint, parent: Request): Promise<void> {
    if (parent.createdBy === userId) {
      throw new ConflictException('The farm owner cannot apply to their own partnership request');
    }
    if (parent.farmId) {
      const roles = await this.farmAccess.activeRoles(userId, parent.farmId);
      if (roles.includes(FarmRelationshipRole.owner)) {
        throw new ConflictException('An active owner of this farm cannot submit a partnership application');
      }
    }
  }

  private async assertNoConflictingActive(userId: bigint, parentId: bigint): Promise<void> {
    const existing = await this.prisma.request.findFirst({
      where: {
        createdBy: userId,
        parentRequestId: parentId,
        requestType: RequestType.partnershipApplication,
        status: { in: [...ACTIVE_PARTNERSHIP_APPLICATION_STATUSES] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You already have an active application for this partnership opportunity');
    }
  }

  private async owned(userId: bigint, requestId: bigint): Promise<Request> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId, requestType: RequestType.partnershipApplication },
    });
    if (!request) throw notFound();
    return request;
  }

  private async insert(
    userId: bigint,
    parent: Request,
    applicantKind: ApplicantKind,
  ): Promise<{ request: Request; detail: RequestApplicationDetail }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = newRequestNumber('PA');
      try {
        return await this.prisma.$transaction(async (tx) => {
          const request = await tx.request.create({
            data: {
              requestNumber,
              requestType: RequestType.partnershipApplication,
              createdBy: userId,
              farmId: parent.farmId,
              parentRequestId: parent.id,
              status: REQUEST_STATUS_DRAFT,
              visibility: RequestVisibility.private,
            },
          });
          const detail = await tx.requestApplicationDetail.create({
            data: {
              requestId: request.id,
              applicantKind,
              professionalCapabilityId: null,
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

  private async present(requestId: bigint): Promise<PartnershipApplicationResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.partnershipApplication },
    });
    if (!request?.parentRequestId) throw notFound();
    const detail = await this.prisma.requestApplicationDetail.findUnique({ where: { requestId } });
    if (!detail) throw notFound();
    const reviews = await this.ownerReviews([requestId]);
    return {
      id: request.id.toString(),
      requestNumber: request.requestNumber,
      status: request.status,
      parentPartnershipRequestId: request.parentRequestId.toString(),
      applicantKind: detail.applicantKind,
      applicationMessage: detail.applicationMessage,
      whyGoodFit: detail.whyGoodFit,
      companyName: detail.companyName,
      relevantExperience: detail.relevantExperience,
      approach: detail.approach,
      companyRegistrationNumber: detail.companyRegistrationNumber,
      companyContactName: detail.companyContactName,
      companyContactRole: detail.companyContactRole,
      companySector: detail.companySector,
      reviews: reviews.get(requestId) ?? [],
      createdAt: request.createdAt?.toISOString() ?? null,
      updatedAt: request.updatedAt?.toISOString() ?? null,
    };
  }

  private async ownerReviews(
    requestIds: bigint[],
  ): Promise<Map<bigint, PartnershipApplicationReviewFeedbackDto[]>> {
    const rows = await this.prisma.requestReview.findMany({
      where: { requestId: { in: requestIds } },
      orderBy: { id: 'asc' },
      select: { requestId: true, decision: true, comment: true, createdAt: true },
    });
    const map = new Map<bigint, PartnershipApplicationReviewFeedbackDto[]>();
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

function assertSubmitShape(detail: RequestApplicationDetail): void {
  if (!detail.applicantKind) throw new BadRequestException('Applicant kind is required');
  const hasMessage =
    Boolean(detail.applicationMessage?.trim()) ||
    Boolean(detail.whyGoodFit?.trim()) ||
    Boolean(detail.relevantExperience?.trim());
  if (!hasMessage) {
    throw new BadRequestException('Provide an application message or why you are a good fit before submitting');
  }
  if (detail.applicantKind === ApplicantKind.company) {
    if (!detail.companyName?.trim()) throw new BadRequestException('Company name is required for company applications');
    if (!detail.companyContactName?.trim()) {
      throw new BadRequestException('Company contact name is required for company applications');
    }
  }
}

function validateCompanyFieldsOnUpdate(
  dto: UpdatePartnershipApplicationDto,
  detail: RequestApplicationDetail,
): void {
  if (detail.applicantKind !== ApplicantKind.company) return;
  const name = dto.companyName !== undefined ? dto.companyName : detail.companyName;
  if (!name?.trim()) throw new BadRequestException('Company name is required for company applications');
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
