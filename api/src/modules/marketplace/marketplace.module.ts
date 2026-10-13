import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SavedListingsService } from './saved-listings.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, SavedListingsService],
})
export class MarketplaceModule {}
