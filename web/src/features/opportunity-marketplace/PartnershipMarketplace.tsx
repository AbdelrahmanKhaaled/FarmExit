'use client';
import { OpportunityMarketplace } from './OpportunityMarketplace';
import type { OpportunityFilters, PublicOpportunityList } from '@/lib/opportunities/public-opportunity';
export function PartnershipMarketplace(props: {
  locale: string;
  initial: PublicOpportunityList;
  filters: OpportunityFilters;
  unavailable?: boolean;
}) {
  return <OpportunityMarketplace {...props} kind="partnerships" />;
}
