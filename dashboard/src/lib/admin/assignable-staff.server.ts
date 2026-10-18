import 'server-only';

import { apiFetchAdmin } from '@/lib/admin/session.server';

export type AssignableStaffItem = {
  userId: string;
  fullName: string | null;
  staffRole: string;
};

export type AssignableStaffList = { items: AssignableStaffItem[] };

export async function fetchAssignableStaff(
  accessToken: string,
  role: 'reviewer' | 'caseAgent',
  search?: string,
): Promise<AssignableStaffItem[]> {
  const qs = new URLSearchParams({ role, limit: '100' });
  if (search) qs.set('search', search);
  const data = await apiFetchAdmin<AssignableStaffList>(`/staff/admin/assignable-staff?${qs}`, accessToken);
  return data.items;
}

export function staffOptionLabel(item: AssignableStaffItem): string {
  return item.fullName ? `${item.fullName} (#${item.userId})` : `#${item.userId}`;
}

export async function loadStaffOptionSets(accessToken: string) {
  const [reviewers, agents] = await Promise.all([
    fetchAssignableStaff(accessToken, 'reviewer'),
    fetchAssignableStaff(accessToken, 'caseAgent'),
  ]);
  return {
    reviewerOptions: reviewers.map((s) => ({ userId: s.userId, label: staffOptionLabel(s) })),
    caseAgentOptions: agents.map((s) => ({ userId: s.userId, label: staffOptionLabel(s) })),
  };
}
