import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProfessionalProfilesController } from './professional-profiles.controller';
import { ProfessionalProfilesService } from './professional-profiles.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [ProfessionalProfilesController],
  providers: [ProfessionalProfilesService],
  exports: [ProfessionalProfilesService],
})
export class ProfessionalProfilesModule {}
