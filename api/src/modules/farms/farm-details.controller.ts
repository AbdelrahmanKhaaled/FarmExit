import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import {
  CreateFacilityDto,
  FacilityListResponseDto,
  FacilityResponseDto,
  UpdateFacilityDto,
} from './dto/farm-facility.dto';
import { FarmSpecificationResponseDto, UpdateFarmSpecificationDto } from './dto/farm-specification.dto';
import { ListFarmsQueryDto } from './dto/list-farms-query.dto';
import { FarmFacilitiesService } from './farm-facilities.service';
import { FarmSpecificationsService } from './farm-specifications.service';

const ACCESS =
  'Any active farm role reads; only an active owner or manager of this farm edits. FarmExit staff have no access ' +
  'here yet (case assignment is undefined). Callers without a farm role get 404, read-only roles get 403 on writes.';

/** HTTP only: permissions are enforced in the services. */
@ApiTags('farm details')
@Controller('farms/:id')
@RequireCompletedProfile()
@ApiParam({ name: 'id', example: '12', description: 'Farm id' })
export class FarmDetailsController {
  constructor(
    private readonly specs: FarmSpecificationsService,
    private readonly facilities: FarmFacilitiesService,
  ) {}

  @Get('specifications')
  @ApiOperation({ summary: 'Structured farm specifications', description: ACCESS })
  @ApiOkResponse({ type: FarmSpecificationResponseDto })
  @ApiNotFoundResponse({ description: 'No such farm, or no farm role' })
  getSpecifications(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<FarmSpecificationResponseDto> {
    return this.specs.get(auth.userId, id);
  }

  @Patch('specifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Partially update farm specifications',
    description: `${ACCESS} Omitted fields are untouched; production details merge key by key; cropTypes replaces the stated set.`,
  })
  @ApiOkResponse({ type: FarmSpecificationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or unknown fields, or nothing to update' })
  @ApiForbiddenResponse({ description: 'Read-only farm role' })
  @ApiNotFoundResponse({ description: 'No such farm, or no farm role' })
  @ApiConflictResponse({ description: 'Changed concurrently by someone else; reload and retry' })
  updateSpecifications(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateFarmSpecificationDto,
  ): Promise<FarmSpecificationResponseDto> {
    return this.specs.update(auth.userId, id, dto);
  }

  @Get('facilities')
  @ApiOperation({ summary: "The farm's facilities, newest first, paginated", description: ACCESS })
  @ApiOkResponse({ type: FacilityListResponseDto })
  listFacilities(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query() query: ListFarmsQueryDto,
  ): Promise<FacilityListResponseDto> {
    return this.facilities.list(auth.userId, id, query);
  }

  @Post('facilities')
  @ApiOperation({
    summary: 'Add a facility to the farm (always created as a draft)',
    description: `${ACCESS} The farm comes from the URL and the owner is the caller; neither can be supplied.`,
  })
  @ApiCreatedResponse({ type: FacilityResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or unknown fields' })
  @ApiForbiddenResponse({ description: 'Read-only farm role' })
  @ApiNotFoundResponse({ description: 'No such farm, or no farm role' })
  createFacility(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: CreateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.facilities.create(auth.userId, id, dto);
  }

  @Get('facilities/:facilityId')
  @ApiOperation({ summary: 'One facility of this farm', description: ACCESS })
  @ApiParam({ name: 'facilityId', example: '5' })
  @ApiOkResponse({ type: FacilityResponseDto })
  @ApiNotFoundResponse({ description: 'No such facility on this farm, or no farm role' })
  getFacility(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('facilityId', ParseBigIntIdPipe) facilityId: bigint,
  ): Promise<FacilityResponseDto> {
    return this.facilities.get(auth.userId, id, facilityId);
  }

  @Patch('facilities/:facilityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a facility of this farm (no deletion exists)', description: ACCESS })
  @ApiParam({ name: 'facilityId', example: '5' })
  @ApiOkResponse({ type: FacilityResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or unknown fields, or nothing to update' })
  @ApiForbiddenResponse({ description: 'Read-only farm role' })
  @ApiNotFoundResponse({ description: 'No such facility on this farm, or no farm role' })
  updateFacility(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('facilityId', ParseBigIntIdPipe) facilityId: bigint,
    @Body() dto: UpdateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.facilities.update(auth.userId, id, facilityId, dto);
  }
}
