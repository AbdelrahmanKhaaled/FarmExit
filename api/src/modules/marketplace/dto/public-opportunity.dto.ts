import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Public allowlist only; no owner identity, contacts, coordinates, documents or staff feedback. */
export class PublicOpportunityDto {
  @ApiProperty() id!: string;
  @ApiProperty() farmName!: string;
  @ApiProperty() governorate!: string;
  @ApiProperty({ nullable: true, type: String }) areaName!: string | null;
  @ApiProperty() areaFeddan!: number;
  @ApiProperty({ nullable: true, type: String }) farmType!: string | null;
  @ApiProperty({ nullable: true, type: String }) mainActivity!: string | null;
  @ApiProperty({ nullable: true, type: String }) publishedAt!: string | null;
  @ApiProperty({ enum: ['approved'] }) reviewStatus!: 'approved';
  @ApiPropertyOptional({ nullable: true, type: String }) professionalNeed?: string | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) managementTypes?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) goals?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: String }) term?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) experienceLevel?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) currentSituation?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) outcomes?: string | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) responsibilities?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) resourcesAndFacilities?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: String }) additionalInformation?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) description?: string | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) objective?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) acceptedPartnerTypes?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: String }) contributionDetails?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) operations?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) salesChannel?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) extraInformation?: string | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) lookingFor?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) contributionSought?: string[] | null;
  @ApiPropertyOptional({ nullable: true, type: [String] }) partnerBackground?: string[] | null;
}

export class PublicOpportunityListDto {
  @ApiProperty({ type: [PublicOpportunityDto] }) items!: PublicOpportunityDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
