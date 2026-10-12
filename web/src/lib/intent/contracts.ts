/**
 * Protected-action intent. CONFIRMED: after authentication the original action resumes with
 * nothing lost. The storage strategy is implemented in Phase 3.
 */
export const protectedActions = [
  'requestFarmDetails',
  'requestRentalInformation',
  'saveItem',
  'listFarm',
  'requestFarmManagement',
  'applyForManagementOpportunity',
  'requestPartnershipDetails',
  'requestPartner',
  'applyForPartnership',
] as const;
export type ProtectedAction = (typeof protectedActions)[number];

export interface PendingIntent {
  action: ProtectedAction;
  /** Listing, opportunity or farm the action targets. */
  targetId: string | null;
  /** Path and query to return to, within the current locale. */
  returnTo: string;
  /** Reference to a saved form draft, if any. */
  draftRef: string | null;
  createdAt: string;
}

export interface IntentStore {
  save(intent: PendingIntent): void;
  /** Reads and removes the intent (single use). */
  consume(): PendingIntent | null;
  clear(): void;
}
