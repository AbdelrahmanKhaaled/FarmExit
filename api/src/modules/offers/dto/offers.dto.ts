import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ExchangeAssetType,
  ExchangePreferenceScope,
  ProposalComponentType,
  ProposalKind,
  SaleMode,
} from '../../../generated/prisma/enums';
import { MAX_LISTING_POUNDS } from '../../listing-requests/listing-prices';

const saleMode = ({ value }: { value: unknown }): unknown =>
  value === 'standard_cash' ? SaleMode.standardCash : value === 'quick_sale' ? SaleMode.quickSale : value;
const scope = ({ value }: { value: unknown }): unknown => value;
const kind = ({ value }: { value: unknown }): unknown => (value === 'co_purchase' ? ProposalKind.coPurchase : value);
const componentType = ({ value }: { value: unknown }): unknown =>
  value === 'exchange_asset' ? ProposalComponentType.exchangeAsset : value;

export class UpsertSaleTermsDto {
  @ApiProperty({ enum: [SaleMode.standardCash, SaleMode.quickSale, 'standard_cash', 'quick_sale'] })
  @Transform(saleMode)
  @IsIn([SaleMode.standardCash, SaleMode.quickSale])
  saleMode!: SaleMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsCashProposals?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsInstallmentProposals?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsExchangeProposals?: boolean;

  @ApiPropertyOptional({ enum: [ExchangePreferenceScope.any, ExchangePreferenceScope.selected] })
  @IsOptional()
  @Transform(scope)
  @IsIn([ExchangePreferenceScope.any, ExchangePreferenceScope.selected])
  exchangePreferenceScope?: ExchangePreferenceScope;

  @ApiPropertyOptional({ enum: ExchangeAssetType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(Object.values(ExchangeAssetType), { each: true })
  exchangeAssetTypes?: ExchangeAssetType[];
}

export class SaleTermsResponseDto {
  @ApiProperty({ enum: [SaleMode.standardCash, SaleMode.quickSale] }) saleMode: SaleMode;
  @ApiProperty() acceptsCashProposals: boolean;
  @ApiProperty() acceptsInstallmentProposals: boolean;
  @ApiProperty() acceptsExchangeProposals: boolean;
  @ApiProperty({ enum: [ExchangePreferenceScope.any, ExchangePreferenceScope.selected] })
  exchangePreferenceScope: ExchangePreferenceScope;
  @ApiProperty({ enum: ExchangeAssetType, isArray: true }) exchangeAssetTypes: ExchangeAssetType[];
  @ApiProperty({ description: 'False when the owner has not stored terms. Schema defaults then apply.' })
  configured: boolean;
}

export class ProposalComponentDto {
  @ApiProperty({ enum: Object.values(ProposalComponentType) })
  @Transform(componentType)
  @IsIn(Object.values(ProposalComponentType))
  componentType!: ProposalComponentType;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  proposedValue!: number;

  @ApiPropertyOptional({ enum: ExchangeAssetType })
  @IsOptional()
  @IsIn(Object.values(ExchangeAssetType))
  assetType?: ExchangeAssetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assetDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  installmentCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  installmentInterval?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  componentNotes?: string;
}

export class CreateProposalDto {
  @ApiProperty({ enum: Object.values(ProposalKind) })
  @Transform(kind)
  @IsIn(Object.values(ProposalKind))
  proposalKind!: ProposalKind;

  @ApiPropertyOptional({ description: 'Buyer-declared total. Not calculated, paid, or verified.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  proposedTotalValue?: number;

  @ApiPropertyOptional({ description: 'Only for co-purchase. Greater than 0 and at most 100.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  requestedSharePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  proposalNotes?: string;

  @ApiProperty({ type: [ProposalComponentDto] })
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ProposalComponentDto)
  components!: ProposalComponentDto[];
}

export class UpdateProposalDto extends CreateProposalDto {}

export class ProposalComponentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() componentType: string;
  @ApiProperty({ nullable: true, type: Number }) proposedValue: number | null;
  @ApiProperty() currency: string;
  @ApiProperty({ nullable: true, type: String }) assetType: string | null;
  @ApiProperty({ nullable: true, type: String }) assetDescription: string | null;
  @ApiProperty({ nullable: true, type: Number }) installmentCount: number | null;
  @ApiProperty({ nullable: true, type: String }) installmentInterval: string | null;
  @ApiProperty({ nullable: true, type: String }) componentNotes: string | null;
}

export class ProposalResponseDto {
  @ApiPropertyOptional({ type: SaleTermsResponseDto, nullable: true }) saleEligibility?: SaleTermsResponseDto | null;
  @ApiProperty() id: string;
  @ApiProperty() requestNumber: string;
  @ApiProperty() listingId: string;
  @ApiProperty() proposalKind: string;
  @ApiProperty({ nullable: true, type: Number }) proposedTotalValue: number | null;
  @ApiProperty() currency: string;
  @ApiProperty({ nullable: true, type: String, description: 'Decimal string. Interest only, not ownership.' })
  requestedSharePercent: string | null;
  @ApiProperty({ nullable: true, type: String }) proposalNotes: string | null;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true, type: String }) submittedAt: string | null;
  @ApiProperty({ type: [ProposalComponentResponseDto] }) components: ProposalComponentResponseDto[];
}

export class ProposalListResponseDto {
  @ApiProperty({ type: [ProposalResponseDto] }) items: ProposalResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}

export class AssignProposalCaseAgentDto {
  @ApiProperty({ description: 'Active case agent user id.' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  assignedStaffId!: string;
}

export class CreateCoPurchaseGroupDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  listingId!: string;

  @ApiProperty({ description: 'Active FarmExit staff user who coordinates this group.' })
  @IsString()
  @MinLength(1)
  assignedStaffId!: string;

  @ApiPropertyOptional({ description: 'Nonbinding target. Defaults to 100. Not an agreed deal.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  targetSharePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class AddCoPurchaseMemberDto {
  @ApiProperty({ description: 'A co-purchase proposal for this listing.' })
  @IsString()
  @MinLength(1)
  proposalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  proposedSharePercent?: number;

  @ApiPropertyOptional({ description: 'Buyer-stated figure. Not money collected.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_POUNDS)
  proposedContributionValue?: number;
}

export class UpdateCoPurchaseMemberDto {
  @ApiPropertyOptional({ enum: ['candidate', 'shortlisted', 'withdrawn', 'archived'] })
  @IsOptional()
  @IsIn(['candidate', 'shortlisted', 'withdrawn', 'archived'])
  memberStatus?: 'candidate' | 'shortlisted' | 'withdrawn' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  proposedSharePercent?: number;
}

export class UpdateCoPurchaseGroupDto {
  @ApiPropertyOptional({
    enum: ['collectingInterest', 'underStaffFollowup', 'closed', 'collecting_interest', 'under_staff_followup'],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'collecting_interest'
      ? 'collectingInterest'
      : value === 'under_staff_followup'
        ? 'underStaffFollowup'
        : value,
  )
  @IsIn(['collectingInterest', 'underStaffFollowup', 'closed'])
  groupStatus?: 'collectingInterest' | 'underStaffFollowup' | 'closed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Active staff user who coordinates this group. Admin only.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  assignedStaffId?: string;
}

export class CoPurchaseMemberResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() proposalId: string;
  @ApiProperty() proposedSharePercent: string;
  @ApiProperty({ nullable: true, type: Number }) proposedContributionValue: number | null;
  @ApiProperty() memberStatus: string;
}

export class CoPurchaseGroupResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() listingId: string;
  @ApiProperty() targetSharePercent: string;
  @ApiProperty({ nullable: true, type: Number }) listingAskingPriceSnapshot: number | null;
  @ApiProperty() groupStatus: string;
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
  @ApiProperty() assignedStaffId: string;
  @ApiProperty({ type: [CoPurchaseMemberResponseDto] }) members: CoPurchaseMemberResponseDto[];
}

export class CoPurchaseGroupListResponseDto {
  @ApiProperty({ type: [CoPurchaseGroupResponseDto] }) items: CoPurchaseGroupResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}
