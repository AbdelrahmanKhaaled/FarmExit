/**
 * Domain enums.
 * CONFIRMED = approved in Figma / FARMEXIT_SOURCE_OF_TRUTH.md.
 * Option lists not listed here are placeholders (Business/content validation required) and are
 * deliberately not typed as enums yet.
 */

// CONFIRMED (1A): one account, many capabilities. Partnership is a request type, never a capability.
export const capabilities = ['farmOwner', 'buyer', 'renter', 'farmManager', 'agriculturalEngineer'] as const;
export type Capability = (typeof capabilities)[number];

// CONFIRMED (1A, v1.2): the only professional types.
export const professionalTypes = ['farmManager', 'agriculturalEngineer'] as const;
export type ProfessionalType = (typeof professionalTypes)[number];

// CONFIRMED (4j): owner-side Management Request only; "both" is not a role.
export const requestedProfessionalTypes = ['farmManager', 'agriculturalEngineer', 'both'] as const;
export type RequestedProfessionalType = (typeof requestedProfessionalTypes)[number];

// CONFIRMED (4i): Add Farm is only for sale or rent.
export const listingPurposes = ['sale', 'rent'] as const;
export type ListingPurpose = (typeof listingPurposes)[number];

// CONFIRMED (4i): farm type taxonomy.
export const farmTypes = ['vegetable', 'fruit', 'livestock', 'mixed'] as const;
export type FarmType = (typeof farmTypes)[number];

// CONFIRMED (4o): three separate concepts.
export const waterSources = ['well', 'canal'] as const;
export type WaterSource = (typeof waterSources)[number];
export const irrigationMethods = ['drip', 'sprinkler', 'gravity'] as const;
export type IrrigationMethod = (typeof irrigationMethods)[number];
export const energySources = ['electricity', 'solar', 'diesel'] as const;
export type EnergySource = (typeof energySources)[number];

// CONFIRMED (4n): crop type options. Overlap with farm type is a pending business decision.
export const cropTypes = ['fruits', 'citrus', 'fieldCrops', 'palms', 'exportCrops'] as const;
export type CropType = (typeof cropTypes)[number];

// CONFIRMED (4d / 4j): approved management values.
export const managementTypes = [
  'fullOperationManagement',
  'productionSupervision',
  'agriculturalConsulting',
  'seasonalManagement',
] as const;
export type ManagementType = (typeof managementTypes)[number];

export const experienceLevels = ['entryLevel', 'experienced', 'expert'] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

// CONFIRMED (1A / 4l): partnership applicants.
export const applicantTypes = ['individual', 'company'] as const;
export type ApplicantType = (typeof applicantTypes)[number];

// CONFIRMED (4h): Badge / Status tones.
export const statusTones = ['neutral', 'review', 'action', 'positive', 'negative'] as const;
export type StatusTone = (typeof statusTones)[number];
