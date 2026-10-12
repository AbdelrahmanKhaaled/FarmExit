/**
 * Data-access contracts. Phase 0.1 defines interfaces only: no API calls, no mock data and
 * no fake backend. Adapters arrive in later phases.
 */
import type { ListingPurpose } from '@/lib/domain/enums';
import type {
  FarmDetailsRequest,
  FarmListing,
  FarmManagementRequest,
  FarmProfile,
  Id,
  ManagementApplication,
  Message,
  MessageThread,
  Notification,
  Page,
  PartnershipApplication,
  PartnershipOpportunity,
  PartnershipRequest,
  ProfessionalProfile,
  SavedItem,
} from '@/lib/domain/types';

export interface PageQuery {
  page: number;
  pageSize: number;
  sort?: string;
}

/** Open record until each marketplace filter configuration is built (Phase 2). */
export type FilterValues = Record<string, string | string[] | number | [number, number] | undefined>;

export interface FarmListingRepository {
  list(query: PageQuery & { purpose?: ListingPurpose; filters?: FilterValues }): Promise<Page<FarmListing>>;
  getBySlug(slug: string): Promise<FarmListing | null>;
  getFarm(farmId: Id): Promise<FarmProfile | null>;
}

export interface ManagementOpportunityRepository {
  list(query: PageQuery & { filters?: FilterValues }): Promise<Page<FarmManagementRequest>>;
  getById(id: Id): Promise<FarmManagementRequest | null>;
}

export interface PartnershipOpportunityRepository {
  list(query: PageQuery & { filters?: FilterValues }): Promise<Page<PartnershipOpportunity>>;
  getBySlug(slug: string): Promise<PartnershipOpportunity | null>;
}

export interface WorkspaceRepository {
  myFarms(): Promise<FarmProfile[]>;
  myDetailsRequests(): Promise<FarmDetailsRequest[]>;
  myManagementRequests(): Promise<FarmManagementRequest[]>;
  myPartnershipRequests(): Promise<PartnershipRequest[]>;
  myManagementApplications(): Promise<ManagementApplication[]>;
  myPartnershipApplications(): Promise<PartnershipApplication[]>;
  receivedApplications(requestId: Id): Promise<PartnershipApplication[]>;
  saved(): Promise<SavedItem[]>;
  notifications(): Promise<Notification[]>;
  professionalProfile(): Promise<ProfessionalProfile | null>;
}

export interface MessageRepository {
  threads(): Promise<MessageThread[]>;
  messages(threadId: Id): Promise<Message[]>;
  send(threadId: Id, body: string): Promise<Message>;
}

/** Drafts for multi-step flows (autosave and resume). Storage is decided per adapter. */
export interface DraftRepository<TDraft> {
  load(draftId: Id): Promise<{ data: TDraft; step: number } | null>;
  save(draftId: Id, data: TDraft, step: number): Promise<{ savedAt: string }>;
  discard(draftId: Id): Promise<void>;
}

export interface UploadService {
  upload(file: Blob, purpose: 'photo' | 'document'): Promise<{ fileId: Id; fileName: string }>;
  remove(fileId: Id): Promise<void>;
}
