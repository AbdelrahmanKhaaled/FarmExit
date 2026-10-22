import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CommunicationAccessService } from './communication-access.service';
import { CommunicationCasesService } from './communication-cases.service';
import { CommunicationMessagesService } from './communication-messages.service';
import { CommunicationRealtimeGateway } from './communication-realtime.gateway';
import { CommunicationRealtimePublisher } from './communication-realtime.publisher';
import { CommunicationRealtimeTicketService } from './communication-realtime-ticket.service';
import { CommunicationController } from './communication.controller';
import { StaffCommunicationController } from './staff-communication.controller';

@Module({
  imports: [AuthorizationModule, AuthModule, AdminAuthModule],
  controllers: [CommunicationController, StaffCommunicationController],
  providers: [
    CommunicationAccessService,
    CommunicationCasesService,
    CommunicationMessagesService,
    CommunicationRealtimeTicketService,
    CommunicationRealtimePublisher,
    CommunicationRealtimeGateway,
  ],
})
export class CommunicationModule {}
