import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { RequestType } from '../../generated/prisma/enums';
import type { PublicOpportunityQueryDto } from './dto/public-opportunity-query.dto';

export const PUBLIC_OPPORTUNITY_SORTS = ['newest', 'areaAsc', 'areaDesc'] as const;

const PUBLISHED_WHERE = {
  status: 'approved' as const,
  visibility: 'public' as const,
  publishedAt: { not: null },
  reviews: { some: { decision: 'approved' as const } },
};

export function assertPublicOpportunityRanges(query: PublicOpportunityQueryDto): void {
  if (query.minArea !== undefined && query.maxArea !== undefined && query.minArea > query.maxArea) {
    throw new BadRequestException('minArea cannot exceed maxArea');
  }
}

export function buildPublicOpportunityWhere(
  requestType: typeof RequestType.farmManagement | typeof RequestType.partnership,
  query: PublicOpportunityQueryDto,
): Prisma.RequestWhereInput {
  const farm: Prisma.FarmWhereInput = { deletedAt: null };
  if (query.governorate) farm.governorate = query.governorate;
  if (query.area) farm.areaName = query.area;
  if (query.farmType) farm.farmType = query.farmType;
  if (query.minArea !== undefined || query.maxArea !== undefined) {
    farm.areaFeddan = {
      ...(query.minArea !== undefined ? { gte: query.minArea } : {}),
      ...(query.maxArea !== undefined ? { lte: query.maxArea } : {}),
    };
  }
  if (query.q) {
    farm.OR = [
      { name: { contains: query.q } },
      { governorate: { contains: query.q } },
      { areaName: { contains: query.q } },
    ];
  }

  const where: Prisma.RequestWhereInput = {
    requestType,
    ...PUBLISHED_WHERE,
    farm,
  };

  if (requestType === 'farmManagement') {
    const detail: Prisma.FarmManagementDetailWhereInput = {};
    if (query.professionalNeed) detail.professionalNeed = query.professionalNeed;
    if (query.experienceLevel) detail.experienceLevel = query.experienceLevel;
    if (query.managementType) {
      detail.managementTypes = { string_contains: query.managementType };
    }
    if (Object.keys(detail).length > 0) where.managementDetail = { is: detail };
  } else {
    const detail: Prisma.PartnershipDetailWhereInput = {};
    if (query.objective) detail.objective = { string_contains: query.objective };
    if (query.partnerType) detail.acceptedPartnerTypes = { string_contains: query.partnerType };
    if (Object.keys(detail).length > 0) where.partnershipDetail = { is: detail };
  }

  return where;
}

export function publicOpportunityOrderBy(
  sort: (typeof PUBLIC_OPPORTUNITY_SORTS)[number] | undefined,
): Prisma.RequestOrderByWithRelationInput[] {
  if (sort === 'areaAsc') return [{ farm: { areaFeddan: 'asc' } }, { id: 'desc' }];
  if (sort === 'areaDesc') return [{ farm: { areaFeddan: 'desc' } }, { id: 'desc' }];
  return [{ publishedAt: 'desc' }, { id: 'desc' }];
}

export const publicOpportunityListSelect = {
  id: true,
  publishedAt: true,
  farm: {
    select: {
      name: true,
      governorate: true,
      areaName: true,
      areaFeddan: true,
      farmType: true,
      mainActivity: true,
      description: true,
    },
  },
  managementDetail: {
    select: {
      professionalNeed: true,
      managementTypes: true,
      goals: true,
      term: true,
      experienceLevel: true,
      currentSituation: true,
      outcomes: true,
      responsibilities: true,
      resourcesAndFacilities: true,
      additionalInformation: true,
    },
  },
  partnershipDetail: {
    select: {
      description: true,
      objective: true,
      acceptedPartnerTypes: true,
      contributionDetails: true,
      operations: true,
      salesChannel: true,
      extraInformation: true,
      lookingFor: true,
      contributionSought: true,
      partnerBackground: true,
    },
  },
} satisfies Prisma.RequestSelect;
