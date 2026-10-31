import { Type } from 'class-transformer';
import { IsOptional, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';
export class ContentLanguageDto {
  @IsOptional() @IsString() @MaxLength(5000) currentProduction?: string;
  @IsOptional() @IsString() @MaxLength(5000) harvestSeasons?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(255) mainActivity?: string;
  @IsOptional() @IsString() @MaxLength(120) areaName?: string;
  @IsOptional() @IsString() @MaxLength(120) soilType?: string;
  @IsOptional() @IsString() @MaxLength(5000) listingDescription?: string;
  @IsOptional() @IsString() @MaxLength(5000) term?: string;
  @IsOptional() @IsString() @MaxLength(5000) currentSituation?: string;
  @IsOptional() @IsString() @MaxLength(5000) outcomes?: string;
  @IsOptional() @IsString() @MaxLength(5000) additionalInformation?: string;
  @IsOptional() @IsString() @MaxLength(5000) contributionDetails?: string;
  @IsOptional() @IsString() @MaxLength(5000) operations?: string;
  @IsOptional() @IsString() @MaxLength(5000) salesChannel?: string;
  @IsOptional() @IsString() @MaxLength(5000) extraInformation?: string;
}
export class LocalizedContentDto {
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ContentLanguageDto) en?: ContentLanguageDto;
  @IsOptional() @IsObject() @ValidateNested() @Type(() => ContentLanguageDto) ar?: ContentLanguageDto;
}
