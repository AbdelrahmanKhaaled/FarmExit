import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  CreateProfessionalVerificationRequestDto,
  ProfessionalVerificationRequestListResponseDto,
  ProfessionalVerificationRequestResponseDto,
  UpdateProfessionalVerificationRequestDto,
} from './dto/professional-verification-request.dto';
import { ProfessionalVerificationRequestsService } from './professional-verification-requests.service';

@ApiTags('professional-verification-requests')
@Controller('professional-verification-requests')
@RequireCompletedProfile()
export class ProfessionalVerificationRequestsController {
  constructor(private readonly verification: ProfessionalVerificationRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a professional verification request for a capability' })
  @ApiCreatedResponse({ type: ProfessionalVerificationRequestResponseDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateProfessionalVerificationRequestDto,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    return this.verification.create(auth.userId, dto);
  }

  @Get()
  @ApiOkResponse({ type: ProfessionalVerificationRequestListResponseDto })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<ProfessionalVerificationRequestListResponseDto> {
    return this.verification.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProfessionalVerificationRequestResponseDto })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    return this.verification.get(auth.userId, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProfessionalVerificationRequestResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateProfessionalVerificationRequestDto,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    return this.verification.update(auth.userId, id, dto);
  }

  @Post(':id/submit')
  @ApiOkResponse({ type: ProfessionalVerificationRequestResponseDto })
  submit(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<ProfessionalVerificationRequestResponseDto> {
    return this.verification.submit(auth.userId, id);
  }
}
