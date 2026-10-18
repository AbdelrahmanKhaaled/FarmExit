import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  CreatePartnershipRequestDto,
  PartnershipRequestListResponseDto,
  PartnershipRequestResponseDto,
  UpdatePartnershipRequestDto,
} from './dto/partnership-request.dto';
import { PartnershipRequestsService } from './partnership-requests.service';

@ApiTags('partnership-requests')
@Controller('farms/:id/partnership-requests')
@RequireCompletedProfile()
export class FarmPartnershipRequestsController {
  constructor(private readonly partnerships: PartnershipRequestsService) {}

  @Post()
  @ApiParam({ name: 'id', description: 'Farm id' })
  @ApiOperation({ summary: 'Create a farm partnership request (owner only)' })
  @ApiCreatedResponse({ type: PartnershipRequestResponseDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) farmId: bigint,
    @Body() dto: CreatePartnershipRequestDto,
  ): Promise<PartnershipRequestResponseDto> {
    return this.partnerships.create(auth.userId, farmId, dto);
  }
}

@ApiTags('partnership-requests')
@Controller('partnership-requests')
@RequireCompletedProfile()
export class PartnershipRequestsController {
  constructor(private readonly partnerships: PartnershipRequestsService) {}

  @Get()
  @ApiOkResponse({ type: PartnershipRequestListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<PartnershipRequestListResponseDto> {
    return this.partnerships.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PartnershipRequestResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<PartnershipRequestResponseDto> {
    return this.partnerships.get(auth.userId, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PartnershipRequestResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdatePartnershipRequestDto,
  ): Promise<PartnershipRequestResponseDto> {
    return this.partnerships.update(auth.userId, id, dto);
  }

  @Post(':id/submit')
  @ApiOkResponse({ type: PartnershipRequestResponseDto })
  submit(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<PartnershipRequestResponseDto> {
    return this.partnerships.submit(auth.userId, id);
  }
}
