import { HomepageEditorialService } from './homepage-editorial.service';
import { HomepageService } from './homepage.service';
import { HomepageController, HomepageAdminController } from './homepage.controller';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SavedListingsService } from './saved-listings.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [HomepageController, HomepageAdminController, MarketplaceController],
  providers: [HomepageEditorialService, HomepageService, MarketplaceService, SavedListingsService],
})
export class MarketplaceModule {}
