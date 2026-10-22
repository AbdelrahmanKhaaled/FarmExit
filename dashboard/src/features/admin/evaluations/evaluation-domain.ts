/** Matches Prisma EvaluationStatus (API enums). */
export const EVALUATION_STATUSES_CREATABLE = ['draft', 'inReview'] as const;
export const EVALUATION_STATUSES_EDITABLE = ['draft', 'inReview'] as const;
export const EVALUATION_STATUSES_LOCKED = ['approved', 'published', 'superseded', 'withdrawn'] as const;

export const EVALUATION_CHECK_STATUSES = ['notReviewed', 'reviewed', 'needsInformation'] as const;

/** Example criterion keys from API contract (staff-entered; not auto-scored). */
export const EVALUATION_CHECK_KEY_EXAMPLES = [
  'water_source_inspection',
  'soil_salinity_check',
] as const;

export function evaluationIsLocked(status: string): boolean {
  return (EVALUATION_STATUSES_LOCKED as readonly string[]).includes(status);
}
