import type { RealtimeAudience } from './communication-realtime.constants';
import type { MessageResponseDto } from './dto/communication.dto';

export type RealtimeSocketData = {
  authReady?: Promise<void>;
  auth?: RealtimeSocketAuth;
  revalidateTimer?: ReturnType<typeof setInterval>;
};

export type RealtimeSocketAuth = {
  userId: bigint;
  sessionId: bigint;
  audience: RealtimeAudience;
};

export type MessageCreatedEvent = {
  caseId: string;
  conversationId: string;
  message: MessageResponseDto;
};
