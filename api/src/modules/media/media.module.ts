import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FarmsModule } from '../farms/farms.module';
import { FacilityMediaService } from './facility-media.service';
import { FarmMediaService } from './farm-media.service';
import { MediaFilesService } from './media-files.service';
import { RequestDocumentFilesService } from './request-document-files.service';
import { MediaController } from './media.controller';
import { createObjectStorage } from './storage/create-object-storage';
import { OBJECT_STORAGE } from './storage/object-storage';

@Module({
  imports: [AuthorizationModule, FarmsModule],
  controllers: [MediaController],
  providers: [
    MediaFilesService,
    RequestDocumentFilesService,
    FarmMediaService,
    FacilityMediaService,
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createObjectStorage(
          config.get('MEDIA_STORAGE_PROVIDER', { infer: true }),
          config.get('NODE_ENV', { infer: true }),
          config.get('MEDIA_STORAGE_DIR', { infer: true }),
        ),
    },
  ],
  exports: [MediaFilesService, RequestDocumentFilesService, OBJECT_STORAGE],
})
export class MediaModule {}
