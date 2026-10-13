import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { FacilityMedia } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { FarmMemberAccessService } from '../farms/farm-member-access.service';
import type { FacilityMediaListResponseDto, FacilityMediaResponseDto, UploadFacilityMediaDto } from './dto/media.dto';
import type { UploadedImageFile } from './image-upload.validator';
import { contentTypeForKey, extensionForKey, isOwnedStorageKey, MediaFilesService } from './media-files.service';
import type { MediaFileStream } from './media.types';

export const MAX_MEDIA_PER_FACILITY = 20;
const notFound = (): NotFoundException => new NotFoundException('Image not found');

/**
 * Facility images. Same access as the facility itself: farm roles through the PARENT FARM (a facility has no
 * access rules of its own). The facility must belong to the farm in the route and not be deleted; every media query
 * is scoped by that facility, so ids from other farms or facilities are 404.
 */
@Injectable()
export class FacilityMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: FarmMemberAccessService,
    private readonly files: MediaFilesService,
  ) {}

  async upload(
    userId: bigint,
    farmId: bigint,
    facilityId: bigint,
    file: UploadedImageFile | undefined,
    dto: UploadFacilityMediaDto,
  ): Promise<FacilityMediaResponseDto> {
    await this.access.require(userId, farmId, 'edit');
    await this.facility(farmId, facilityId);
    const image = this.files.prepare(file);

    // Lock the farm, then the facility, so concurrent uploads cannot both pass the cap and a deleted parent loses.
    const row = await this.prisma.$transaction(async (tx) => {
      const farm = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id FROM farms WHERE id = ${farmId} AND deleted_at IS NULL FOR UPDATE
      `;
      if (farm.length !== 1) throw new NotFoundException('Farm not found');
      const facility = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id FROM agricultural_facilities
        WHERE id = ${facilityId} AND farm_id = ${farmId} AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (facility.length !== 1) throw new NotFoundException('Facility not found');

      const count = await tx.facilityMedia.count({ where: { facilityId } });
      if (count >= MAX_MEDIA_PER_FACILITY) {
        throw new ConflictException(`A facility can have at most ${MAX_MEDIA_PER_FACILITY} images`);
      }

      const key = await this.files.store('facilities', facilityId, image);
      try {
        return await tx.facilityMedia.create({
          data: {
            facilityId,
            uploadedBy: userId,
            storageKey: key,
            mediaType: 'photo',
            altEn: dto.altEn ?? null,
            altAr: dto.altAr ?? null,
            sortOrder: count,
          },
        });
      } catch (error) {
        await this.files.discard(key);
        throw error;
      }
    });
    return toResponse(row, farmId);
  }

  async list(
    userId: bigint,
    farmId: bigint,
    facilityId: bigint,
    query: ListFarmsQueryDto,
  ): Promise<FacilityMediaListResponseDto> {
    await this.access.require(userId, farmId, 'read');
    await this.facility(farmId, facilityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const [total, rows] = await Promise.all([
      this.prisma.facilityMedia.count({ where: { facilityId } }),
      this.prisma.facilityMedia.findMany({
        where: { facilityId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map((r) => toResponse(r, farmId)), page, pageSize, total };
  }

  async get(userId: bigint, farmId: bigint, facilityId: bigint, mediaId: bigint): Promise<FacilityMediaResponseDto> {
    await this.access.require(userId, farmId, 'read');
    await this.facility(farmId, facilityId);
    return toResponse(await this.find(facilityId, mediaId), farmId);
  }

  async download(userId: bigint, farmId: bigint, facilityId: bigint, mediaId: bigint): Promise<MediaFileStream> {
    await this.access.require(userId, farmId, 'read');
    await this.facility(farmId, facilityId);
    const row = await this.find(facilityId, mediaId);
    if (!isOwnedStorageKey('facilities', facilityId, row.storageKey)) throw notFound();
    const { stream, size } = await this.files.open(row.storageKey);
    return {
      stream,
      size,
      contentType: contentTypeForKey(row.storageKey),
      filename: `facility-image-${row.id.toString()}.${extensionForKey(row.storageKey)}`,
    };
  }

  private async facility(farmId: bigint, facilityId: bigint): Promise<void> {
    const found = await this.prisma.agriculturalFacility.findFirst({
      where: { id: facilityId, farmId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Facility not found');
  }

  private async find(facilityId: bigint, mediaId: bigint): Promise<FacilityMedia> {
    const row = await this.prisma.facilityMedia.findFirst({ where: { id: mediaId, facilityId } });
    if (!row) throw notFound();
    return row;
  }
}

function toResponse(m: FacilityMedia, farmId: bigint): FacilityMediaResponseDto {
  return {
    id: m.id.toString(),
    facilityId: m.facilityId.toString(),
    farmId: farmId.toString(),
    mediaType: m.mediaType,
    contentType: contentTypeForKey(m.storageKey),
    altEn: m.altEn ?? null,
    altAr: m.altAr ?? null,
    licenceStatus: m.licenceStatus,
    sortOrder: m.sortOrder,
    url: `/api/v1/farms/${farmId.toString()}/facilities/${m.facilityId.toString()}/media/${m.id.toString()}/file`,
    createdAt: m.createdAt?.toISOString() ?? null,
  };
}
