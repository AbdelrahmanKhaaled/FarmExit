import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CommunicationAccessService } from './communication-access.service';
import { CommunicationCasesService } from './communication-cases.service';
import { CommunicationMessagesService } from './communication-messages.service';
import { CommunicationController } from './communication.controller';
import { StaffCommunicationController } from './staff-communication.controller';

@Module({
  imports: [AuthorizationModule],
  controllers: [CommunicationController, StaffCommunicationController],
  providers: [CommunicationAccessService, CommunicationCasesService, CommunicationMessagesService],
})
export class CommunicationModule {}
