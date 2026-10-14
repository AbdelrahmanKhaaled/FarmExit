import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
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
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffOnly, StaffPermissions } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  EvaluationCheckResponseDto,
  EvaluationListResponseDto,
  EvaluationResponseDto,
} from './dto/evaluation-response.dto';
import { ListEvaluationsQueryDto } from './dto/list-evaluations-query.dto';
import { RecordEvaluationCheckDto } from './dto/record-evaluation-check.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { EvaluationsService } from './evaluations.service';

const STAFF_SCOPE =
  'Internal FarmExit staff only (evaluations.manage permission required). ' +
  'FarmExit Score is an assessment produced by authorized FarmExit staff, never a user review or public customer rating. ' +
  'Evaluations and checks are private by default.';

@ApiTags('farm evaluations')
@Controller('farms/:farmId/evaluations')
@StaffOnly()
@StaffPermissions(StaffPermission.EvaluationsManage)
@ApiParam({ name: 'farmId', example: '10', description: 'Target farm ID' })
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a FarmExit evaluation for a farm',
    description:
      `${STAFF_SCOPE} Admins may create directly on any active farm. ` +
      'Reviewers require an assigned listing request on the farm. Scores must satisfy 0 <= scoreValue <= scoreMax.',
  })
  @ApiCreatedResponse({ type: EvaluationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid score ranges, invalid ID, or listing request mismatch' })
  @ApiForbiddenResponse({ description: 'Not authorized staff or reviewer not assigned' })
  @ApiNotFoundResponse({ description: 'Farm not found' })
  create(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
    @Body() dto: CreateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    return this.evaluations.create(auth.userId, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Retrieve paginated evaluation history for a farm',
    description: `${STAFF_SCOPE} Returns historical assessments ordered newest first.`,
  })
  @ApiOkResponse({ type: EvaluationListResponseDto })
  @ApiNotFoundResponse({ description: 'Farm not found' })
  list(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
    @Query() query: ListEvaluationsQueryDto,
  ): Promise<EvaluationListResponseDto> {
    return this.evaluations.listHistory(auth.userId, farmId, query);
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Retrieve the latest evaluation for a farm',
    description: `${STAFF_SCOPE} Returns 404 if the farm has no recorded evaluations.`,
  })
  @ApiOkResponse({ type: EvaluationResponseDto })
  @ApiNotFoundResponse({ description: 'Farm not found or has no evaluations' })
  getLatest(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
  ): Promise<EvaluationResponseDto> {
    return this.evaluations.getLatest(auth.userId, farmId);
  }

  @Get(':evaluationId')
  @ApiOperation({
    summary: 'Retrieve evaluation details including all recorded checks',
    description: `${STAFF_SCOPE} Prevents cross-farm IDOR.`,
  })
  @ApiParam({ name: 'evaluationId', example: '1', description: 'Evaluation ID' })
  @ApiOkResponse({ type: EvaluationResponseDto })
  @ApiNotFoundResponse({ description: 'Farm or evaluation not found' })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
    @Param('evaluationId', ParseBigIntIdPipe) evaluationId: bigint,
  ): Promise<EvaluationResponseDto> {
    return this.evaluations.get(auth.userId, farmId, evaluationId);
  }

  @Patch(':evaluationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an incomplete evaluation',
    description:
      `${STAFF_SCOPE} Only incomplete assessments in draft or in_review status can be modified. ` +
      'Approved, published, or superseded evaluations are locked against silent overwrite.',
  })
  @ApiParam({ name: 'evaluationId', example: '1', description: 'Evaluation ID' })
  @ApiOkResponse({ type: EvaluationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid scoring bounds or parameters' })
  @ApiConflictResponse({ description: 'Evaluation is completed or locked' })
  @ApiForbiddenResponse({ description: 'Not authorized to edit this evaluation' })
  @ApiNotFoundResponse({ description: 'Farm or evaluation not found' })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
    @Param('evaluationId', ParseBigIntIdPipe) evaluationId: bigint,
    @Body() dto: UpdateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    return this.evaluations.update(auth.userId, farmId, evaluationId, dto);
  }

  @Post(':evaluationId/checks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record or update an evaluation check criterion',
    description: `${STAFF_SCOPE} Upserts an evaluation check. Allowed only while evaluation is in draft or in_review.`,
  })
  @ApiParam({ name: 'evaluationId', example: '1', description: 'Evaluation ID' })
  @ApiOkResponse({ type: EvaluationCheckResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid check data or evidence document mismatch' })
  @ApiConflictResponse({ description: 'Evaluation is locked' })
  @ApiNotFoundResponse({ description: 'Farm or evaluation not found' })
  recordCheck(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
    @Param('evaluationId', ParseBigIntIdPipe) evaluationId: bigint,
    @Body() dto: RecordEvaluationCheckDto,
  ): Promise<EvaluationCheckResponseDto> {
    return this.evaluations.recordCheck(auth.userId, farmId, evaluationId, dto);
  }

  @Put(':evaluationId/checks/:checkKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record or update an evaluation check for a specific criterion key',
    description: `${STAFF_SCOPE} Upserts an evaluation check key path.`,
  })
  @ApiParam({ name: 'evaluationId', example: '1', description: 'Evaluation ID' })
  @ApiParam({ name: 'checkKey', example: 'water_source_inspection', description: 'Criterion check key' })
  @ApiOkResponse({ type: EvaluationCheckResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid check data' })
  @ApiConflictResponse({ description: 'Evaluation is locked' })
  @ApiNotFoundResponse({ description: 'Farm or evaluation not found' })
  putCheck(
    @CurrentAuth() auth: AuthContext,
    @Param('farmId', ParseBigIntIdPipe) farmId: bigint,
    @Param('evaluationId', ParseBigIntIdPipe) evaluationId: bigint,
    @Param('checkKey') checkKey: string,
    @Body() dto: Omit<RecordEvaluationCheckDto, 'checkKey'>,
  ): Promise<EvaluationCheckResponseDto> {
    return this.evaluations.recordCheck(auth.userId, farmId, evaluationId, {
      ...dto,
      checkKey,
    });
  }
}
