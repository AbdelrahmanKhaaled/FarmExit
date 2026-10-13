import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { FarmsModule } from './modules/farms/farms.module';
import { ListingRequestsModule } from './modules/listing-requests/listing-requests.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { MediaModule } from './modules/media/media.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';

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
  ],
})
export class AppModule {}
