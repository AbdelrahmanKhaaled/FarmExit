import type { MessageRow } from './messages-types';

export async function fetchCaseMessages(caseId: string): Promise<MessageRow[] | null> {
  const items: MessageRow[] = [];
  let page = 1;
  let total: number;
  do {
    const res = await fetch(`/api/communication/cases/${caseId}/messages?page=${page}&pageSize=50`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items: MessageRow[]; total: number };
    items.push(...data.items);
    total = data.total;
    if (data.items.length === 0) break;
    page++;
  } while (items.length < total);
  return items;
}
