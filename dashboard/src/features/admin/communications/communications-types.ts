export type ConversationSummary = {
  id: string;
  externalUserId: string;
  externalUserName: string | null;
};

export type CaseMessage = {
  id: string;
  senderId: string;
  body: string | null;
  sentAt: string | null;
  isRelayedCopy: boolean;
};
