export type CaseItem = {
  id: string;
  requestId: string;
  status: string;
  createdAt: string | null;
  closedAt: string | null;
};

export type CaseRow = CaseItem;

export type MessageRow = {
  id: string;
  senderId: string;
  body: string | null;
  sentAt: string | null;
  isRelayedCopy: boolean;
};

export const MAX_MESSAGE_BODY = 8000;
