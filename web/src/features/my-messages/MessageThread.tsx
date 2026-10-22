import { MessagesWorkspace, type MessagesPreviewData } from './MessagesWorkspace';

export function MessageThread({
  caseId,
  userId,
  preview,
}: {
  caseId: string;
  userId: string;
  preview?: MessagesPreviewData;
}) {
  return <MessagesWorkspace caseId={caseId} userId={userId} preview={preview} />;
}
