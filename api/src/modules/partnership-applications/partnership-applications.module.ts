import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PartnershipApplicationsController } from './partnership-applications.controller';
import { PartnershipApplicationsService } from './partnership-applications.service';
import { StaffPartnershipApplicationsReviewsController } from './staff-partnership-applications-reviews.controller';
import { StaffPartnershipApplicationsReviewsService } from './staff-partnership-applications-reviews.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [PartnershipApplicationsController, StaffPartnershipApplicationsReviewsController],
  providers: [PartnershipApplicationsService, StaffPartnershipApplicationsReviewsService],
})
export class PartnershipApplicationsModule {}
