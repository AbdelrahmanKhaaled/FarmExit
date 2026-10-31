import { publicContent } from './public-localized-content';
import type { Prisma } from '../../generated/prisma/client';
import type { PublicOpportunityDto } from './dto/public-opportunity.dto';
import { publicOpportunityListSelect } from './public-opportunity-query';

export type PublicOpportunityRow = Prisma.RequestGetPayload<{ select: typeof publicOpportunityListSelect }>;

function jsonStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length ? items : null;
}

export function toPublicOpportunityDto(row: PublicOpportunityRow): PublicOpportunityDto {
  const farm = row.farm!;
  return {
    id: row.id.toString(),
    farmName: farm.name,
    localizedContent: publicContent(farm.localizedContent, ['name', 'mainActivity', 'areaName']),
    opportunityLocalizedContent: publicContent(
      row.managementDetail?.localizedContent ?? row.partnershipDetail?.localizedContent,
      [
        'description',
        'term',
        'currentSituation',
        'outcomes',
        'additionalInformation',
        'contributionDetails',
        'operations',
        'salesChannel',
        'extraInformation',
      ],
    ),
    governorate: farm.governorate,
    areaName: farm.areaName,
    areaFeddan: Number(farm.areaFeddan),
    farmType: farm.farmType,
    mainActivity: farm.mainActivity,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    reviewStatus: 'approved',
    professionalNeed: row.managementDetail?.professionalNeed ?? null,
    managementTypes: jsonStrings(row.managementDetail?.managementTypes),
    goals: jsonStrings(row.managementDetail?.goals),
    term: row.managementDetail?.term ?? null,
    experienceLevel: row.managementDetail?.experienceLevel ?? null,
    currentSituation: row.managementDetail?.currentSituation ?? null,
    outcomes: row.managementDetail?.outcomes ?? null,
    responsibilities: jsonStrings(row.managementDetail?.responsibilities),
    resourcesAndFacilities: jsonStrings(row.managementDetail?.resourcesAndFacilities),
    additionalInformation: row.managementDetail?.additionalInformation ?? null,
    description: row.partnershipDetail?.description ?? null,
    objective: jsonStrings(row.partnershipDetail?.objective),
    acceptedPartnerTypes: jsonStrings(row.partnershipDetail?.acceptedPartnerTypes),
    contributionDetails: row.partnershipDetail?.contributionDetails ?? null,
    operations: row.partnershipDetail?.operations ?? null,
    salesChannel: row.partnershipDetail?.salesChannel ?? null,
    extraInformation: row.partnershipDetail?.extraInformation ?? null,
    lookingFor: jsonStrings(row.partnershipDetail?.lookingFor),
    contributionSought: jsonStrings(row.partnershipDetail?.contributionSought),
    partnerBackground: jsonStrings(row.partnershipDetail?.partnerBackground),
  };
}
