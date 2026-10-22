import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MediaModule } from '../media/media.module';
import { OpportunityPublicationService } from './opportunity-publication.service';
import { RequestDocumentsService } from './request-documents.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { StaffRequestsController } from './staff-requests.controller';

@Module({
  imports: [AuthorizationModule, MediaModule],
  controllers: [RequestsController, StaffRequestsController],
  providers: [RequestsService, RequestDocumentsService, OpportunityPublicationService],
  exports: [RequestsService, OpportunityPublicationService],
})
export class RequestsModule {}
