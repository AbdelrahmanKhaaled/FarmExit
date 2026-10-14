import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProfessionalProfilesModule } from '../professional-profiles/professional-profiles.module';
import { ProfessionalVerificationRequestsController } from './professional-verification-requests.controller';
import { ProfessionalVerificationRequestsService } from './professional-verification-requests.service';
import { StaffProfessionalVerificationReviewsController } from './staff-professional-verification-reviews.controller';
import { StaffProfessionalVerificationReviewsService } from './staff-professional-verification-reviews.service';

@Module({
  imports: [AuthorizationModule, ProfessionalProfilesModule],
  controllers: [ProfessionalVerificationRequestsController, StaffProfessionalVerificationReviewsController],
  providers: [ProfessionalVerificationRequestsService, StaffProfessionalVerificationReviewsService],
})
export class ProfessionalVerificationRequestsModule {}
