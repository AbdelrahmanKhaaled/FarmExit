import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../farms/dto/create-farm.dto';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/**
 * Text fields next to the `file` part of a multipart upload. Everything else (farm/facility ids, uploader, storage
 * key, media type, licence status, sort order, any URL) is rejected: the server decides those.
 */
export class UploadFarmMediaDto {
  @ApiPropertyOptional({ maxLength: 255, description: 'English alt text.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  altEn?: string;

  @ApiPropertyOptional({ maxLength: 255, description: 'Arabic alt text (never machine-derived from English).' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  altAr?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Owner-stated: the photo does not show the actual farm.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isIllustrative?: boolean;
}

export class UploadFacilityMediaDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  altEn?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  altAr?: string;
}

/** Multipart schema for Swagger. */
export class UploadFileBodyDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'JPEG, PNG or WebP image (max 5 MB by default).' })
  file: unknown;
  @ApiPropertyOptional() altEn?: string;
  @ApiPropertyOptional() altAr?: string;
  @ApiPropertyOptional({ type: Boolean, description: 'Farm images only.' }) isIllustrative?: boolean;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

class MediaResponseBase {
  @ApiProperty({ example: '7' }) id: string;
  @ApiProperty({ example: 'photo' }) mediaType: string;
  @ApiProperty({ enum: IMAGE_TYPES }) contentType: string;
  @ApiProperty({ nullable: true, type: String }) altEn: string | null;
  @ApiProperty({ nullable: true, type: String }) altAr: string | null;
  @ApiProperty({
    example: 'pending_confirmation',
    description: 'Licence is not confirmed by upload; no approval exists yet.',
  })
  licenceStatus: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty({
    example: '/api/v1/farms/12/media/7/file',
    description: 'Authenticated API path that streams the image. It is not a public URL and needs a bearer token.',
  })
  url: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) createdAt: string | null;
}

export class FarmMediaResponseDto extends MediaResponseBase {
  @ApiProperty({ example: '12' }) farmId: string;
  @ApiProperty({ nullable: true, type: Number }) width: number | null;
  @ApiProperty({ nullable: true, type: Number }) height: number | null;
  @ApiProperty() isIllustrative: boolean;
}

export class FacilityMediaResponseDto extends MediaResponseBase {
  @ApiProperty({ example: '5' }) facilityId: string;
  @ApiProperty({ example: '12' }) farmId: string;
}

export class FarmMediaListResponseDto {
  @ApiProperty({ type: [FarmMediaResponseDto] }) items: FarmMediaResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}

export class FacilityMediaListResponseDto {
  @ApiProperty({ type: [FacilityMediaResponseDto] }) items: FacilityMediaResponseDto[];
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}
