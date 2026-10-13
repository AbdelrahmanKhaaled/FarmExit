import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { CreateFarmDto } from './dto/create-farm.dto';
import { FarmListResponseDto, FarmResponseDto } from './dto/farm-response.dto';
import { ListFarmsQueryDto } from './dto/list-farms-query.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { FarmsService } from './farms.service';

/** HTTP only: every permission decision lives in `FarmsService`. */
@ApiTags('farms')
@Controller('farms')
@RequireCompletedProfile()
export class FarmsController {
  constructor(private readonly farms: FarmsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a farm; the caller becomes its owner',
    description:
      "Always creates a NEW farm plus the caller's own active `owner` relationship (one transaction). The owner, " +
      'relationship status and farm status cannot be supplied. Creating a farm does not list it publicly, verify ' +
      'ownership or produce a FarmExit Score.',
  })
  @ApiCreatedResponse({ type: FarmResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or unknown fields' })
  create(@CurrentAuth() auth: AuthContext, @Body() dto: CreateFarmDto): Promise<FarmResponseDto> {
    return this.farms.create(auth.userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "The caller's farms (any active farm role), newest first, paginated" })
  @ApiOkResponse({ type: FarmListResponseDto })
  mine(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<FarmListResponseDto> {
    return this.farms.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'A farm the caller has an active role on (or FarmExit staff with requests.read)',
    description: 'Callers without access get 404, the same as for a farm that does not exist.',
  })
  @ApiParam({ name: 'id', example: '12' })
  @ApiOkResponse({ type: FarmResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'No such farm, or no access' })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<FarmResponseDto> {
    return this.farms.get(auth.userId, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update basic farm details (active owner or manager of this farm)',
    description: 'Only the listed fields can change; `null` clears optional fields.',
  })
  @ApiParam({ name: 'id', example: '12' })
  @ApiOkResponse({ type: FarmResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id, invalid or unknown fields, or nothing to update' })
  @ApiForbiddenResponse({ description: 'Can read the farm but is not its owner or manager' })
  @ApiNotFoundResponse({ description: 'No such farm, or no access' })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateFarmDto,
  ): Promise<FarmResponseDto> {
    return this.farms.update(auth.userId, id, dto);
  }
}
