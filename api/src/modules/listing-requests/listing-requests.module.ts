import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FarmListingRequestsController, ListingRequestsController } from './listing-requests.controller';
import { ListingRequestsService } from './listing-requests.service';
import { ListingPublicationService } from './listing-publication.service';
import { StaffListingReviewsController } from './staff-listing-reviews.controller';
import { StaffListingReviewsService } from './staff-listing-reviews.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [FarmListingRequestsController, ListingRequestsController, StaffListingReviewsController],
  providers: [ListingRequestsService, StaffListingReviewsService, ListingPublicationService],
})
export class ListingRequestsModule {}
