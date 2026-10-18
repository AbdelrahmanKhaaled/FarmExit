/** Deterministic demo dataset plan (no DB writes). */

export const DEMO_TAG = '[DEMO-DASH]';
export const REQ_PREFIX = 'DEMO-DASH-REQ-';
/** Valid E.164 Egyptian mobiles (+2010 + 8 digits); separate from legacy seed +20100000000x. */
export const STAFF_MOBILE = '+201070000099';
export const USER_MOBILE_BASE = 70_000_000; // first user: +201070000001

export const GOVERNORATES = [
  'Beheira',
  'Sharqia',
  'Gharbia',
  'Dakahlia',
  'Kafr El Sheikh',
  'Fayoum',
  'Minya',
  'Assiut',
  'Beni Suef',
  'New Valley',
  'Ismailia',
  'Matrouh',
] as const;

export type DemoPlanCounts = {
  users: number;
  farms: number;
  listingRequests: number;
  publishedListings: number;
  purchaseProposals: number;
  coPurchaseGroups: number;
  partnershipRequests: number;
  partnershipApplications: number;
  farmManagementRequests: number;
  professionalVerificationRequests: number;
  farmDetailsRequests: number;
  draftEvaluations: number;
  communicationCases: number;
  auditLogs: number;
};

export function buildDemoPlan(): DemoPlanCounts {
  return {
    users: 48,
    farms: 28,
    listingRequests: 42,
    publishedListings: 14,
    purchaseProposals: 55,
    coPurchaseGroups: 8,
    partnershipRequests: 18,
    partnershipApplications: 28,
    farmManagementRequests: 14,
    professionalVerificationRequests: 12,
    farmDetailsRequests: 20,
    draftEvaluations: 6,
    communicationCases: 10,
    auditLogs: 35,
  };
}

/** Egyptian E.164: +2010 + 8 digits (unique per index 1..9999). */
export function demoMobile(index: number): string {
  return `+2010${String(USER_MOBILE_BASE + index).padStart(8, '0')}`;
}

export function daysAgoUtc(days: number, hour = 12): Date {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}
