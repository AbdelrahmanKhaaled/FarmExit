export type LinkedApplication = {
  id: string;
  parentRequestId: string;
  requestNumber: string;
  status: string;
  applicantName: string | null;
  applicantKind: string | null;
  summary: string | null;
  submittedAt: string | null;
  assignedStaff: { role: string; name: string | null }[];
};

export type LinkedApplications = {
  items: LinkedApplication[];
  page: number;
  pageSize: number;
  total: number;
  summary: { total: number; pending: number; approved: number; rejected: number; byStatus: Record<string, number> };
};

export type ApplicationFilters = {
  applicationsPage?: string;
  applicationSearch?: string;
  applicationStatus?: string;
  applicationSort?: string;
};

export const APPLICATION_STATUSES = [
  'submitted',
  'underFarmExitReview',
  'changesRequested',
  'approved',
  'rejected',
  'sentToOwner',
  'accepted',
  'declined',
  'withdrawn',
  'closed',
] as const;

export function applicationQuery(filters: ApplicationFilters): string {
  const query = new URLSearchParams({ page: filters.applicationsPage ?? '1', pageSize: '6' });
  if (filters.applicationSearch?.trim()) query.set('search', filters.applicationSearch.trim());
  if (filters.applicationStatus) query.set('status', filters.applicationStatus);
  if (filters.applicationSort) query.set('sort', filters.applicationSort);
  return query.toString();
}

export function applicationsHref(id: string, filters: ApplicationFilters, page: number): string {
  const query = new URLSearchParams();
  if (filters.applicationSearch) query.set('applicationSearch', filters.applicationSearch);
  if (filters.applicationStatus) query.set('applicationStatus', filters.applicationStatus);
  if (filters.applicationSort) query.set('applicationSort', filters.applicationSort);
  if (page > 1) query.set('applicationsPage', String(page));
  return `/admin/requests/${id}${query.size ? `?${query}` : ''}#applications`;
}
