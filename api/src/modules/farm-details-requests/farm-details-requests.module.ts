import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FarmDetailsRequestsController } from './farm-details-requests.controller';
import { FarmDetailsRequestsService } from './farm-details-requests.service';
import { StaffFarmDetailsReviewsController } from './staff-farm-details-reviews.controller';
import { StaffFarmDetailsReviewsService } from './staff-farm-details-reviews.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [FarmDetailsRequestsController, StaffFarmDetailsReviewsController],
  providers: [FarmDetailsRequestsService, StaffFarmDetailsReviewsService],
  exports: [FarmDetailsRequestsService],
})
export class FarmDetailsRequestsModule {}
