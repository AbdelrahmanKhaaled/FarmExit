import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MediaModule } from '../media/media.module';
import { OpportunityPublicationService } from './opportunity-publication.service';
import { RequestDocumentsService } from './request-documents.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { StaffRequestsController } from './staff-requests.controller';
import { StaffLinkedApplicationsController } from './staff-linked-applications.controller';
import { LinkedRequestApplicationsService } from './linked-request-applications.service';

@Module({
  imports: [AuthorizationModule, MediaModule],
  controllers: [RequestsController, StaffRequestsController, StaffLinkedApplicationsController],
  providers: [RequestsService, RequestDocumentsService, OpportunityPublicationService, LinkedRequestApplicationsService],
  exports: [RequestsService, OpportunityPublicationService],
})
export class RequestsModule {}
