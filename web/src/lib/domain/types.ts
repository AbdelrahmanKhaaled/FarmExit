/**
 * Domain model contracts (interfaces only: no data, no behaviour).
 * Fields whose business rules are not yet defined are nullable and must render as
 * "Not stated in listing". Never invent values.
 */
import type {
  ApplicantType,
  Capability,
  CropType,
  EnergySource,
  ExperienceLevel,
  FarmType,
  IrrigationMethod,
  ListingPurpose,
  ManagementType,
  ProfessionalType,
  RequestedProfessionalType,
  WaterSource,
} from './enums';
import type {
  ApplicationStatus,
  DetailsRequestStatus,
  DocumentStatus,
  ListingStatus,
  OwnerDecision,
  RequestStatus,
  VerificationStatus,
} from './status';

export type Id = string;
export type IsoDate = string;
export type Localized<T = string> = { en: T; ar: T };

/** Whole Egyptian pounds. */
export type Egp = number;

export interface User {
  id: Id;
  fullName: string;
  /** OTP-verified mobile number. Never shown to other parties. */
  mobile: string;
  photoUrl: string | null;
  location: string | null;
  capabilities: Capability[];
}

export interface ImageAsset {
  id: Id;
  src: string;
  width: number;
  height: number;
  alt: Localized;
  /** Technical: focal point for object-position, 0–1 on each axis. */
  focalPoint: { x: number; y: number } | null;
  /** CONFIRMED (4p): shows "Illustrative image" when the photo does not show the actual farm. */
  isIllustrative: boolean;
  /** CONFIRMED: every photo needs its licence confirmed before production. */
  licenceConfirmed: boolean;
}

export interface DocumentSlot {
  id: Id;
  /** Generic label key until the legal list is confirmed (business decision required). */
  labelKey: string;
  status: DocumentStatus;
  fileName: string | null;
}

export interface FarmLocation {
  governorate: string;
  area: string;
  /** Private to FarmExit. Never rendered publicly. */
  privatePin: { lat: number; lng: number } | null;
}

export interface FarmProfile {
  id: Id;
  ownerId: Id;
  name: string;
  farmType: FarmType;
  mainActivity: string;
  areaFeddan: number | null;
  location: FarmLocation;
  waterSource: WaterSource | null;
  irrigationMethod: IrrigationMethod | null;
  energySource: EnergySource | null;
  cropTypes: CropType[];
  photos: ImageAsset[];
  documents: DocumentSlot[];
}

export interface FarmListing {
  id: Id;
  slug: string;
  farmId: Id;
  purpose: ListingPurpose;
  /** Sale: total asking price. */
  askingPrice: Egp | null;
  /** Rent: expected annual rent per feddan. */
  annualRentPerFeddan: Egp | null;
  description: string | null;
  highlights: string[];
  status: ListingStatus;
  publishedAt: IsoDate | null;
}

export interface FarmDetailsRequest {
  id: Id;
  listingId: Id;
  kind: 'details' | 'rentalInformation';
  message: string | null;
  status: DetailsRequestStatus;
  createdAt: IsoDate;
}

export interface ChangeRequest {
  id: Id;
  /** Step or field FarmExit asks the user to update. */
  target: string;
  note: string;
}

export interface FarmManagementRequest {
  id: Id;
  farmId: Id;
  professionalType: RequestedProfessionalType;
  managementType: ManagementType;
  term: string | null;
  currentTeam: string | null;
  currentSituation: string;
  challenges: string[];
  goals: string[];
  outcomes: string | null;
  responsibilities: string[];
  experienceLevel: ExperienceLevel | null;
  cropExpertise: string | null;
  onSitePresence: string;
  teamLeadership: string | null;
  extraFacilities: string[];
  note: string | null;
  documents: DocumentSlot[];
  status: RequestStatus;
  draftStep: number | null;
  changeRequests: ChangeRequest[];
}

export interface ProfessionalTypeVerification {
  type: ProfessionalType;
  status: VerificationStatus;
}

export interface ProfessionalProfile {
  userId: Id;
  verifications: ProfessionalTypeVerification[];
  baseGovernorate: string | null;
  introduction: string | null;
  experienceLevel: ExperienceLevel | null;
  yearsOfExperience: number | null;
  relevantExperience: string | null;
  farmActivities: FarmType[];
  cropExpertise: string | null;
  managementTypes: ManagementType[];
  expertiseAreas: string[];
  governorates: string[];
  documents: DocumentSlot[];
}

export interface ManagementApplication {
  id: Id;
  opportunityId: Id;
  applyingAs: ProfessionalType;
  whyGoodFit: string;
  relevantExperience: string | null;
  approach: string | null;
  additionalInformation: string | null;
  status: ApplicationStatus;
}

export interface PartnershipRequest {
  id: Id;
  farmId: Id;
  objective: string;
  description: string;
  acceptedApplicantTypes: ApplicantType[];
  documents: DocumentSlot[];
  status: RequestStatus;
  draftStep: number | null;
  changeRequests: ChangeRequest[];
}

/** Public opportunity. Every nullable field renders as "Not stated in listing". */
export interface PartnershipOpportunity {
  id: Id;
  slug: string;
  requestId: Id;
  objective: string;
  acceptedApplicantTypes: ApplicantType[];
  farmAreaFeddan: number | null;
  partnershipArea: string | null;
  duration: string | null;
  ownerContribution: string | null;
  fees: string | null;
  partnerContribution: { expertise: string | null; equipment: string | null; marketAccess: string | null };
  /** Business decision required: never inferred. */
  allContributionsRequired: boolean | null;
  image: ImageAsset;
}

export interface PartnershipApplication {
  id: Id;
  opportunityId: Id;
  applicantType: ApplicantType;
  proposal: { whyGoodFit: string; contribution: string | null; workingTogether: string | null };
  documents: DocumentSlot[];
  status: ApplicationStatus;
  ownerDecision: OwnerDecision | null;
}

/** CONFIRMED: every conversation is between the user and FarmExit. */
export interface MessageThread {
  id: Id;
  subject: string;
  relatedEntity: { kind: 'farm' | 'request' | 'application'; id: Id } | null;
  unread: boolean;
}

export interface Message {
  id: Id;
  threadId: Id;
  from: 'farmExit' | 'you';
  body: string;
  attachmentName: string | null;
  sentAt: IsoDate;
}

export interface Notification {
  id: Id;
  read: boolean;
  needsAttention: boolean;
  createdAt: IsoDate;
}

export interface SavedItem {
  kind: 'farm' | 'managementOpportunity' | 'partnershipOpportunity';
  id: Id;
  savedAt: IsoDate;
}

export interface Page<T> {
  items: T[];
  /** From the API. Sample totals are never shown as real counts. */
  total: number | null;
  page: number;
  pageSize: number;
}
