import { MessagesInbox } from './MessagesInbox';
import { ConversationView } from './ConversationView';
export function MessageThread({ caseId, userId }: { caseId: string; userId: string }) {
  return (
    <div className="grid items-start gap-24 desktop:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden desktop:block">
        <MessagesInbox />
      </aside>
      <ConversationView caseId={caseId} userId={userId} />
    </div>
  );
}
