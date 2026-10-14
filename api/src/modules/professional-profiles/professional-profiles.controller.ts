import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import {
  CreateProfessionalCapabilityDto,
  ProfessionalProfileResponseDto,
  UpdateProfessionalCapabilityDto,
  UpdateProfessionalProfileDto,
} from './dto/professional-profile.dto';
import { ProfessionalProfilesService } from './professional-profiles.service';

@ApiTags('professional-profile')
@Controller('professional-profile')
@RequireCompletedProfile()
export class ProfessionalProfilesController {
  constructor(private readonly profiles: ProfessionalProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'View own professional profile' })
  @ApiOkResponse({ type: ProfessionalProfileResponseDto })
  @ApiNotFoundResponse()
  getMine(@CurrentAuth() auth: AuthContext): Promise<ProfessionalProfileResponseDto> {
    return this.profiles.getMine(auth.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update allowed professional profile fields' })
  @ApiOkResponse({ type: ProfessionalProfileResponseDto })
  upsert(@CurrentAuth() auth: AuthContext, @Body() dto: UpdateProfessionalProfileDto): Promise<ProfessionalProfileResponseDto> {
    return this.profiles.upsertMine(auth.userId, dto);
  }

  @Post('capabilities')
  @ApiOperation({ summary: 'Register a farm manager or agricultural engineer capability' })
  @ApiCreatedResponse({ type: ProfessionalProfileResponseDto })
  addCapability(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateProfessionalCapabilityDto,
  ): Promise<ProfessionalProfileResponseDto> {
    return this.profiles.addCapability(auth.userId, dto);
  }

  @Patch('capabilities/:capabilityId')
  @ApiOperation({ summary: 'Update expertise and service areas for a capability' })
  @ApiOkResponse({ type: ProfessionalProfileResponseDto })
  updateCapability(
    @CurrentAuth() auth: AuthContext,
    @Param('capabilityId', ParseBigIntIdPipe) capabilityId: bigint,
    @Body() dto: UpdateProfessionalCapabilityDto,
  ): Promise<ProfessionalProfileResponseDto> {
    return this.profiles.updateCapability(auth.userId, capabilityId, dto);
  }
}
