import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { caseStaffRoom, convRoom } from './communication-realtime.constants';
import type { MessageCreatedEvent } from './communication-realtime.types';

@Injectable()
export class CommunicationRealtimePublisher {
  private readonly logger = new Logger(CommunicationRealtimePublisher.name);
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  messageCreated(event: MessageCreatedEvent): void {
    if (!this.server) return;
    try {
      const payload = {
        caseId: event.caseId,
        conversationId: event.conversationId,
        message: event.message,
      };
      this.server.to(convRoom(event.conversationId)).emit('message.created', payload);
      this.server.to(caseStaffRoom(event.caseId)).emit('message.created', payload);
    } catch (err) {
      this.logger.warn('Realtime publish failed (REST write already committed)');
      if (err instanceof Error) this.logger.debug(err.message);
    }
  }
}
