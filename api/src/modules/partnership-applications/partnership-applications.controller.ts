import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  CreatePartnershipApplicationDto,
  PartnershipApplicationListResponseDto,
  PartnershipApplicationResponseDto,
  UpdatePartnershipApplicationDto,
} from './dto/partnership-application.dto';
import { PartnershipApplicationsService } from './partnership-applications.service';

@ApiTags('partnership-applications')
@Controller('partnership-applications')
@RequireCompletedProfile()
export class PartnershipApplicationsController {
  constructor(private readonly applications: PartnershipApplicationsService) {}

  @Post()
  @ApiCreatedResponse({ type: PartnershipApplicationResponseDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreatePartnershipApplicationDto,
  ): Promise<PartnershipApplicationResponseDto> {
    return this.applications.create(auth.userId, dto);
  }

  @Get()
  @ApiOkResponse({ type: PartnershipApplicationListResponseDto })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<PartnershipApplicationListResponseDto> {
    return this.applications.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PartnershipApplicationResponseDto })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<PartnershipApplicationResponseDto> {
    return this.applications.get(auth.userId, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PartnershipApplicationResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdatePartnershipApplicationDto,
  ): Promise<PartnershipApplicationResponseDto> {
    return this.applications.update(auth.userId, id, dto);
  }

  @Post(':id/submit')
  @ApiOkResponse({ type: PartnershipApplicationResponseDto })
  submit(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<PartnershipApplicationResponseDto> {
    return this.applications.submit(auth.userId, id);
  }
}
