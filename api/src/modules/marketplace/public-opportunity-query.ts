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
      detail.managementTypes = { array_contains: [query.managementType] };
    }
    if (Object.keys(detail).length > 0) where.managementDetail = { is: detail };
  } else {
    const detail: Prisma.PartnershipDetailWhereInput = {};
    if (query.objective) detail.objective = { array_contains: [query.objective] };
    if (query.partnerType) detail.acceptedPartnerTypes = { array_contains: [query.partnerType] };
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
      localizedContent: true,
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
      localizedContent: true,
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
      localizedContent: true,
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

/** Facets come from the entire eligible dataset, never the current page. */
export async function loadPublicOpportunityFacets(
  prisma: import('../../prisma/prisma.service').PrismaService,
  kind: 'farmManagement' | 'partnership',
) {
  const rows = await prisma.request.findMany({
    where: buildPublicOpportunityWhere(kind, {}),
    select: publicOpportunityListSelect,
  });
  const out: Record<string, string[]> = {
    governorate: [],
    area: [],
    managementType: [],
    objective: [],
    partnerType: [],
  };
  const add = (key: string, value: unknown) => {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) if (typeof v === 'string' && v.trim() && !out[key].includes(v)) out[key].push(v);
  };
  for (const r of rows) {
    add('governorate', r.farm?.governorate);
    add('area', r.farm?.areaName);
    add('managementType', r.managementDetail?.managementTypes);
    add('objective', r.partnershipDetail?.objective);
    add('partnerType', r.partnershipDetail?.acceptedPartnerTypes);
  }
  for (const key of Object.keys(out)) out[key].sort();
  return out;
}
