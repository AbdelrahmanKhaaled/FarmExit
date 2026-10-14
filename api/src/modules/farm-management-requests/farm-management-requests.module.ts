import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import {
  FarmFarmManagementRequestsController,
  FarmManagementRequestsController,
} from './farm-management-requests.controller';
import { FarmManagementRequestsService } from './farm-management-requests.service';
import { StaffFarmManagementReviewsController } from './staff-farm-management-reviews.controller';
import { StaffFarmManagementReviewsService } from './staff-farm-management-reviews.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [
    FarmFarmManagementRequestsController,
    FarmManagementRequestsController,
    StaffFarmManagementReviewsController,
  ],
  providers: [FarmManagementRequestsService, StaffFarmManagementReviewsService],
})
export class FarmManagementRequestsModule {}
