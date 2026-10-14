import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  CreateFarmManagementRequestDto,
  FarmManagementRequestListResponseDto,
  FarmManagementRequestResponseDto,
  UpdateFarmManagementRequestDto,
} from './dto/farm-management-request.dto';
import { FarmManagementRequestsService } from './farm-management-requests.service';

@ApiTags('farm-management-requests')
@Controller('farms/:id/management-requests')
@RequireCompletedProfile()
export class FarmFarmManagementRequestsController {
  constructor(private readonly management: FarmManagementRequestsService) {}

  @Post()
  @ApiParam({ name: 'id', description: 'Farm id' })
  @ApiOperation({ summary: 'Create a farm management request (owner only)' })
  @ApiCreatedResponse({ type: FarmManagementRequestResponseDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) farmId: bigint,
    @Body() dto: CreateFarmManagementRequestDto,
  ): Promise<FarmManagementRequestResponseDto> {
    return this.management.create(auth.userId, farmId, dto);
  }
}

@ApiTags('farm-management-requests')
@Controller('farm-management-requests')
@RequireCompletedProfile()
export class FarmManagementRequestsController {
  constructor(private readonly management: FarmManagementRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'List own farm management requests' })
  @ApiOkResponse({ type: FarmManagementRequestListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<FarmManagementRequestListResponseDto> {
    return this.management.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: FarmManagementRequestResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmManagementRequestResponseDto> {
    return this.management.get(auth.userId, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: FarmManagementRequestResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateFarmManagementRequestDto,
  ): Promise<FarmManagementRequestResponseDto> {
    return this.management.update(auth.userId, id, dto);
  }

  @Post(':id/submit')
  @ApiOkResponse({ type: FarmManagementRequestResponseDto })
  submit(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmManagementRequestResponseDto> {
    return this.management.submit(auth.userId, id);
  }
}
