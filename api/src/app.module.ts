import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { FarmsModule } from './modules/farms/farms.module';
import { ListingRequestsModule } from './modules/listing-requests/listing-requests.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { OffersModule } from './modules/offers/offers.module';
import { MediaModule } from './modules/media/media.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ProfessionalProfilesModule } from './modules/professional-profiles/professional-profiles.module';
import { ProfessionalVerificationRequestsModule } from './modules/professional-verification-requests/professional-verification-requests.module';
import { FarmManagementRequestsModule } from './modules/farm-management-requests/farm-management-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AuthorizationModule,
    FarmsModule,
    MediaModule,
    ListingRequestsModule,
    MarketplaceModule,
    OffersModule,
    EvaluationsModule,
    RequestsModule,
    ProfessionalProfilesModule,
    ProfessionalVerificationRequestsModule,
    FarmManagementRequestsModule,
  ],
})
export class AppModule {}
