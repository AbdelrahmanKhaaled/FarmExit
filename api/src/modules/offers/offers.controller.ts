import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole } from '../../generated/prisma/enums';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { StaffOnly, StaffPermissions, StaffRoles } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { CoPurchaseService } from './co-purchase.service';
import {
  AddCoPurchaseMemberDto,
  AssignProposalCaseAgentDto,
  CoPurchaseGroupListResponseDto,
  CoPurchaseGroupResponseDto,
  CreateCoPurchaseGroupDto,
  CreateProposalDto,
  ProposalListResponseDto,
  ProposalResponseDto,
  SaleTermsResponseDto,
  UpdateCoPurchaseGroupDto,
  UpdateCoPurchaseMemberDto,
  UpdateProposalDto,
  UpsertSaleTermsDto,
} from './dto/offers.dto';
import { PurchaseProposalsService } from './purchase-proposals.service';
import { SaleTermsService } from './sale-terms.service';

@ApiTags('sale-terms')
@Controller('listing-requests')
@RequireCompletedProfile()
export class SaleTermsController {
  constructor(private readonly terms: SaleTermsService) {}

  @Get(':id/sale-terms')
  @ApiOperation({
    summary: 'Read sale terms for a listing you created',
    description:
      'The creating owner, while still an active owner. Missing terms are not found. ' +
      'Rent listings and other owners are not found or conflict.',
  })
  @ApiParam({ name: 'id', example: '4' })
  @ApiOkResponse({ type: SaleTermsResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<SaleTermsResponseDto> {
    return this.terms.getForOwner(auth.userId, id);
  }

  @Put(':id/sale-terms')
  @ApiOperation({
    summary: 'Create or replace sale terms',
    description:
      'Draft or changes-requested sale listings only. standardCash accepts cash proposals. ' +
      'quickSale accepts cash, installment and exchange proposals. Eligibility is not acceptance, ' +
      'and a published listing is not changed.',
  })
  @ApiParam({ name: 'id', example: '4' })
  @ApiOkResponse({ type: SaleTermsResponseDto })
  @ApiConflictResponse({ description: 'The listing is not an editable sale listing' })
  put(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpsertSaleTermsDto,
  ): Promise<SaleTermsResponseDto> {
    return this.terms.putForOwner(auth.userId, id, dto);
  }
}

@ApiTags('marketplace')
@Controller('marketplace/farms')
@RequireCompletedProfile()
export class PublishedSaleTermsController {
  constructor(private readonly terms: SaleTermsService) {}

  @Get(':slug/sale-terms')
  @ApiOperation({
    summary: 'Sale preferences for a published listing',
    description:
      'Completed-profile buyers. Published sale listings only. Unset terms use the schema defaults and are not written. ' +
      'This is not the anonymous marketplace card.',
  })
  @ApiOkResponse({ type: SaleTermsResponseDto })
  @ApiNotFoundResponse({ description: 'No published sale listing for this slug' })
  get(@Param('slug') slug: string): Promise<SaleTermsResponseDto> {
    return this.terms.getPublished(slug);
  }
}

@ApiTags('purchase-proposals')
@Controller()
@RequireCompletedProfile()
export class PurchaseProposalsController {
  constructor(private readonly proposals: PurchaseProposalsService) {}

  @Post('marketplace/farms/:slug/purchase-proposals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a nonbinding purchase proposal',
    description:
      'A completed-profile buyer proposes cash, installments, an exchange, a mix, or a co-purchase share. ' +
      'Asset values are buyer claims. Nothing is accepted, paid, or transferred. One proposal per buyer per listing.',
  })
  @ApiCreatedResponse({ type: ProposalResponseDto })
  @ApiConflictResponse({ description: 'The buyer already proposed, or owns the farm' })
  create(
    @CurrentAuth() auth: AuthContext,
    @Param('slug') slug: string,
    @Body() dto: CreateProposalDto,
  ): Promise<ProposalResponseDto> {
    return this.proposals.create(auth.userId, slug, dto);
  }

  @Get('purchase-proposals')
  @ApiOperation({ summary: 'Your purchase proposals' })
  @ApiOkResponse({ type: ProposalListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<ProposalListResponseDto> {
    return this.proposals.listMine(auth.userId, query);
  }

  @Get('purchase-proposals/:id')
  @ApiParam({ name: 'id', example: '9' })
  @ApiOkResponse({ type: ProposalResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<ProposalResponseDto> {
    return this.proposals.getMine(auth.userId, id);
  }

  @Patch('purchase-proposals/:id')
  @ApiOperation({
    summary: 'Replace your submitted proposal',
    description: 'Allowed while it is still submitted, the listing is published, and staff have not added it to a group.',
  })
  @ApiParam({ name: 'id', example: '9' })
  @ApiOkResponse({ type: ProposalResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateProposalDto,
  ): Promise<ProposalResponseDto> {
    return this.proposals.update(auth.userId, id, dto);
  }
}

@ApiTags('staff-purchase-proposals')
@Controller('staff/purchase-proposals')
@StaffOnly()
@StaffPermissions(StaffPermission.RequestsRead)
@StaffRoles(StaffRole.admin, StaffRole.caseAgent)
export class StaffPurchaseProposalsController {
  constructor(private readonly proposals: PurchaseProposalsService) {}

  @Get()
  @ApiOperation({
    summary: 'Purchase proposals for authorized staff',
    description:
      'Admin sees submitted proposals. A case agent sees only proposals assigned to them as case agent. ' +
      'A listing-review assignment does not grant access. Buyer contact details are not included.',
  })
  @ApiOkResponse({ type: ProposalListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<ProposalListResponseDto> {
    return this.proposals.listStaff(auth.userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '9' })
  @ApiOkResponse({ type: ProposalResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<ProposalResponseDto> {
    return this.proposals.getStaff(auth.userId, id);
  }

  @Put(':id/assignments')
  @StaffRoles(StaffRole.admin)
  @ApiOperation({
    summary: 'Assign the case agent for this proposal',
    description: 'Active admin only. The assignee must be an active case agent. No conversation or communication case is opened.',
  })
  @ApiParam({ name: 'id', example: '9' })
  @ApiOkResponse({ type: ProposalResponseDto })
  assign(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: AssignProposalCaseAgentDto,
  ): Promise<ProposalResponseDto> {
    return this.proposals.assignCaseAgent(auth.userId, id, dto);
  }
}

@ApiTags('staff-co-purchase')
@Controller('staff/co-purchase-groups')
@StaffOnly()
@StaffPermissions(StaffPermission.RequestsRead)
@StaffRoles(StaffRole.admin, StaffRole.caseAgent)
export class StaffCoPurchaseController {
  constructor(private readonly groups: CoPurchaseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @StaffRoles(StaffRole.admin)
  @ApiOperation({
    summary: 'Open a staff coordination group',
    description:
      'Active admin only. The listing must be a published sale with stored sale terms. ' +
      'Membership is a shortlist, not ownership or an accepted sale.',
  })
  @ApiCreatedResponse({ type: CoPurchaseGroupResponseDto })
  create(@CurrentAuth() auth: AuthContext, @Body() dto: CreateCoPurchaseGroupDto): Promise<CoPurchaseGroupResponseDto> {
    return this.groups.create(auth.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Groups you may coordinate' })
  @ApiOkResponse({ type: CoPurchaseGroupListResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListFarmsQueryDto): Promise<CoPurchaseGroupListResponseDto> {
    return this.groups.list(auth.userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '3' })
  @ApiOkResponse({ type: CoPurchaseGroupResponseDto })
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseBigIntIdPipe) id: bigint): Promise<CoPurchaseGroupResponseDto> {
    return this.groups.get(auth.userId, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', example: '3' })
  @ApiOkResponse({ type: CoPurchaseGroupResponseDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateCoPurchaseGroupDto,
  ): Promise<CoPurchaseGroupResponseDto> {
    return this.groups.update(auth.userId, id, dto);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a co-purchase proposal to the group',
    description:
      'The share must be greater than 0, at most 100, and at most the group target. ' +
      'Shares are not required to sum to 100. Duplicate membership is rejected.',
  })
  @ApiParam({ name: 'id', example: '3' })
  @ApiCreatedResponse({ type: CoPurchaseGroupResponseDto })
  addMember(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: AddCoPurchaseMemberDto,
  ): Promise<CoPurchaseGroupResponseDto> {
    return this.groups.addMember(auth.userId, id, dto);
  }

  @Patch(':id/members/:memberId')
  @ApiParam({ name: 'id', example: '3' })
  @ApiParam({ name: 'memberId', example: '8' })
  @ApiOkResponse({ type: CoPurchaseGroupResponseDto })
  updateMember(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('memberId', ParseBigIntIdPipe) memberId: bigint,
    @Body() dto: UpdateCoPurchaseMemberDto,
  ): Promise<CoPurchaseGroupResponseDto> {
    return this.groups.updateMember(auth.userId, id, memberId, dto);
  }
}
