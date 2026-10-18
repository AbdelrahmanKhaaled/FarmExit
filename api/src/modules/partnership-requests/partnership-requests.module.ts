import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import {
  FarmPartnershipRequestsController,
  PartnershipRequestsController,
} from './partnership-requests.controller';
import { PartnershipRequestsService } from './partnership-requests.service';
import { StaffPartnershipReviewsController } from './staff-partnership-reviews.controller';
import { StaffPartnershipReviewsService } from './staff-partnership-reviews.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [FarmPartnershipRequestsController, PartnershipRequestsController, StaffPartnershipReviewsController],
  providers: [PartnershipRequestsService, StaffPartnershipReviewsService],
  exports: [PartnershipRequestsService],
})
export class PartnershipRequestsModule {}
