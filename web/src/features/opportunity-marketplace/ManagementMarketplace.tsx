'use client';
import { OpportunityMarketplace } from './OpportunityMarketplace';
import type {
  OpportunityFilters,
  PublicOpportunityList,
  PublicOpportunity,
} from '@/lib/opportunities/public-opportunity';
export function ManagementMarketplace(props: {
  locale: string;
  initial: PublicOpportunityList;
  filters: OpportunityFilters;
  unavailable?: boolean;
  initialSelected?: PublicOpportunity | null;
}) {
  return <OpportunityMarketplace {...props} kind="management" />;
}
