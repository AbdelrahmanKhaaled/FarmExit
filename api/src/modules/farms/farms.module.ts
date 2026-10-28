import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FarmDetailsController } from './farm-details.controller';
import { FarmFacilitiesService } from './farm-facilities.service';
import { FarmMemberAccessService } from './farm-member-access.service';
import { FarmSpecificationsService } from './farm-specifications.service';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { AdminFarmManagementController } from './admin-farm-management.controller';
import { PrivateLocationController } from './private-location.controller';
import { PrivateLocationService } from './private-location.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [FarmsController, FarmDetailsController, PrivateLocationController, AdminFarmManagementController],
  providers: [
    FarmsService,
    FarmMemberAccessService,
    FarmSpecificationsService,
    FarmFacilitiesService,
    PrivateLocationService,
  ],
  exports: [FarmsService, FarmMemberAccessService],
})
export class FarmsModule {}
