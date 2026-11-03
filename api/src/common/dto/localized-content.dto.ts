import { Type } from 'class-transformer';
import { IsOptional, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';
export class ContentLanguageDto {
  @IsOptional() @IsString() @MaxLength(8000) verificationSummary?: string;
  @IsOptional() @IsString() @MaxLength(4000) proposalNotes?: string;
  @IsOptional() @IsString() @MaxLength(2000) assetDescription?: string;
  @IsOptional() @IsString() @MaxLength(100) role?: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
  @IsOptional() @IsString() @MaxLength(8000) applicationMessage?: string;
  @IsOptional() @IsString() @MaxLength(8000) whyGoodFit?: string;
  @IsOptional() @IsString() @MaxLength(8000) relevantExperience?: string;
  @IsOptional() @IsString() @MaxLength(8000) approach?: string;
  @IsOptional() @IsString() @MaxLength(30) experienceLevel?: string;
  @IsOptional() @IsString() @MaxLength(100) onSitePresence?: string;
  @IsOptional() @IsString() @MaxLength(5000) goals?: string;
  @IsOptional() @IsString() @MaxLength(5000) currentProduction?: string;
  @IsOptional() @IsString() @MaxLength(5000) harvestSeasons?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(255) mainActivity?: string;
  @IsOptional() @IsString() @MaxLength(120) areaName?: string;
  @IsOptional() @IsString() @MaxLength(120) soilType?: string;
  @IsOptional() @IsString() @MaxLength(5000) listingDescription?: string;
  @IsOptional() @IsString() @MaxLength(100) term?: string;
  @IsOptional() @IsString() @MaxLength(8000) currentSituation?: string;
  @IsOptional() @IsString() @MaxLength(8000) outcomes?: string;
  @IsOptional() @IsString() @MaxLength(8000) additionalInformation?: string;
  @IsOptional() @IsString() @MaxLength(5000) contributionDetails?: string;
  @IsOptional() @IsString() @MaxLength(5000) operations?: string;
  @IsOptional() @IsString() @MaxLength(5000) salesChannel?: string;
  @IsOptional() @IsString() @MaxLength(5000) extraInformation?: string;
}
export class LocalizedContentDto {
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ContentLanguageDto) en?: ContentLanguageDto;
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ContentLanguageDto) ar?: ContentLanguageDto;
}
