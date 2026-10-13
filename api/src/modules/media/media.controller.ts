import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import {
  FacilityMediaListResponseDto,
  FacilityMediaResponseDto,
  FarmMediaListResponseDto,
  FarmMediaResponseDto,
  UploadFacilityMediaDto,
  UploadFarmMediaDto,
  UploadFileBodyDto,
} from './dto/media.dto';
import { FacilityMediaService } from './facility-media.service';
import { FarmMediaService } from './farm-media.service';
import type { UploadedImageFile } from './image-upload.validator';
import type { MediaFileStream } from './media.types';

/** Hard transport limits. The configured per-image size limit (default 5 MB) is enforced by the service. */
const UPLOAD = FileInterceptor('file', {
  limits: { fileSize: 10_485_760, files: 1, fields: 5, fieldSize: 2048, parts: 8, headerPairs: 50 },
});

const ACCESS =
  'Any active farm role views; only an active owner or manager of the farm uploads. FarmExit staff and the public ' +
  'have no access. Callers without a farm role get 404; read-only roles get 403 on upload.';

/** HTTP only: authorization and validation live in the services. */
@ApiTags('media')
@Controller('farms/:id')
@RequireCompletedProfile()
@ApiParam({ name: 'id', example: '12', description: 'Farm id' })
export class MediaController {
  constructor(
    private readonly farmMedia: FarmMediaService,
    private readonly facilityMedia: FacilityMediaService,
  ) {}

  // ---------- farm images ----------
  @Post('media')
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileBodyDto })
  @ApiOperation({
    summary: 'Upload a farm image (JPEG, PNG or WebP)',
    description: `${ACCESS} Validated by size, extension, content type and file signature; EXIF/XMP metadata (including GPS) is stripped; stored privately under a server-generated key.`,
  })
  @ApiCreatedResponse({ type: FarmMediaResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file, invalid file name or unknown fields' })
  @ApiPayloadTooLargeResponse({ description: 'Image larger than the limit' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a valid JPEG/PNG/WebP, or type mismatch' })
  @ApiConflictResponse({ description: 'Image limit for this farm reached' })
  @ApiForbiddenResponse({ description: 'Read-only farm role' })
  @ApiNotFoundResponse({ description: 'No such farm, or no farm role' })
  uploadFarmImage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: UploadFarmMediaDto,
  ): Promise<FarmMediaResponseDto> {
    return this.farmMedia.upload(auth.userId, id, file, dto);
  }

  @Get('media')
  @ApiOperation({ summary: 'Farm image metadata, paginated', description: ACCESS })
  @ApiOkResponse({ type: FarmMediaListResponseDto })
  listFarmImages(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query() query: ListFarmsQueryDto,
  ): Promise<FarmMediaListResponseDto> {
    return this.farmMedia.list(auth.userId, id, query);
  }

  @Get('media/:mediaId')
  @ApiParam({ name: 'mediaId', example: '7' })
  @ApiOperation({ summary: 'Metadata of one farm image', description: ACCESS })
  @ApiOkResponse({ type: FarmMediaResponseDto })
  @ApiNotFoundResponse({ description: 'No such image on this farm, or no farm role' })
  getFarmImage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('mediaId', ParseBigIntIdPipe) mediaId: bigint,
  ): Promise<FarmMediaResponseDto> {
    return this.farmMedia.get(auth.userId, id, mediaId);
  }

  @Get('media/:mediaId/file')
  @ApiParam({ name: 'mediaId', example: '7' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({
    summary: 'Download a farm image (authorized streaming, never a public URL)',
    description: `${ACCESS} Served with private, no-store caching and nosniff.`,
  })
  @ApiNotFoundResponse({ description: 'No such image on this farm, or no farm role' })
  async downloadFarmImage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('mediaId', ParseBigIntIdPipe) mediaId: bigint,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return send(res, await this.farmMedia.download(auth.userId, id, mediaId));
  }

  // ---------- facility images ----------
  @Post('facilities/:facilityId/media')
  @UseInterceptors(UPLOAD)
  @ApiParam({ name: 'facilityId', example: '5' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileBodyDto })
  @ApiOperation({ summary: 'Upload a facility image (JPEG, PNG or WebP)', description: ACCESS })
  @ApiCreatedResponse({ type: FacilityMediaResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file, invalid file name or unknown fields' })
  @ApiPayloadTooLargeResponse({ description: 'Image larger than the limit' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a valid JPEG/PNG/WebP, or type mismatch' })
  @ApiConflictResponse({ description: 'Image limit for this facility reached' })
  @ApiForbiddenResponse({ description: 'Read-only farm role' })
  @ApiNotFoundResponse({ description: 'No such farm/facility, or no farm role' })
  uploadFacilityImage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('facilityId', ParseBigIntIdPipe) facilityId: bigint,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: UploadFacilityMediaDto,
  ): Promise<FacilityMediaResponseDto> {
    return this.facilityMedia.upload(auth.userId, id, facilityId, file, dto);
  }

  @Get('facilities/:facilityId/media')
  @ApiParam({ name: 'facilityId', example: '5' })
  @ApiOperation({ summary: 'Facility image metadata, paginated', description: ACCESS })
  @ApiOkResponse({ type: FacilityMediaListResponseDto })
  listFacilityImages(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('facilityId', ParseBigIntIdPipe) facilityId: bigint,
    @Query() query: ListFarmsQueryDto,
  ): Promise<FacilityMediaListResponseDto> {
    return this.facilityMedia.list(auth.userId, id, facilityId, query);
  }

  @Get('facilities/:facilityId/media/:mediaId')
  @ApiParam({ name: 'facilityId', example: '5' })
  @ApiParam({ name: 'mediaId', example: '7' })
  @ApiOperation({ summary: 'Metadata of one facility image', description: ACCESS })
  @ApiOkResponse({ type: FacilityMediaResponseDto })
  getFacilityImage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('facilityId', ParseBigIntIdPipe) facilityId: bigint,
    @Param('mediaId', ParseBigIntIdPipe) mediaId: bigint,
  ): Promise<FacilityMediaResponseDto> {
    return this.facilityMedia.get(auth.userId, id, facilityId, mediaId);
  }

  @Get('facilities/:facilityId/media/:mediaId/file')
  @ApiParam({ name: 'facilityId', example: '5' })
  @ApiParam({ name: 'mediaId', example: '7' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({ summary: 'Download a facility image (authorized streaming)', description: ACCESS })
  async downloadFacilityImage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('facilityId', ParseBigIntIdPipe) facilityId: bigint,
    @Param('mediaId', ParseBigIntIdPipe) mediaId: bigint,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return send(res, await this.facilityMedia.download(auth.userId, id, facilityId, mediaId));
  }
}

function send(res: Response, file: MediaFileStream): StreamableFile {
  res.set({
    'Content-Type': file.contentType,
    'Content-Length': String(file.size),
    'Content-Disposition': `inline; filename="${file.filename}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  return new StreamableFile(file.stream);
}
