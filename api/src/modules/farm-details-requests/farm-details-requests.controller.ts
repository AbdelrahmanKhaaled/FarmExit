import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  CreateFarmDetailsRequestDto,
  FarmDetailsRequestListResponseDto,
  FarmDetailsRequestResponseDto,
} from './dto/farm-details-request.dto';
import { FarmDetailsRequestsService } from './farm-details-requests.service';

@ApiTags('farm-details-requests')
@Controller('farm-details-requests')
@RequireCompletedProfile()
export class FarmDetailsRequestsController {
  constructor(private readonly details: FarmDetailsRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Request additional information about a published listing (buyer/renter)' })
  @ApiCreatedResponse({ type: FarmDetailsRequestResponseDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateFarmDetailsRequestDto,
  ): Promise<FarmDetailsRequestResponseDto> {
    return this.details.create(auth.userId, dto);
  }

  @Get()
  @ApiOkResponse({ type: FarmDetailsRequestListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<FarmDetailsRequestListResponseDto> {
    return this.details.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: FarmDetailsRequestResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmDetailsRequestResponseDto> {
    return this.details.get(auth.userId, id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: FarmDetailsRequestResponseDto })
  submit(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmDetailsRequestResponseDto> {
    return this.details.submit(auth.userId, id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: FarmDetailsRequestResponseDto })
  withdraw(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmDetailsRequestResponseDto> {
    return this.details.withdraw(auth.userId, id);
  }
}
