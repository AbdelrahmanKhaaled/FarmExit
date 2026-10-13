import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { FarmMedia } from '../../generated/prisma/client';
import { FarmMediaType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { FarmMemberAccessService } from '../farms/farm-member-access.service';
import type { FarmMediaListResponseDto, FarmMediaResponseDto, UploadFarmMediaDto } from './dto/media.dto';
import type { UploadedImageFile } from './image-upload.validator';
import { contentTypeForKey, extensionForKey, isOwnedStorageKey, MediaFilesService } from './media-files.service';
import type { MediaFileStream } from './media.types';

export const MAX_MEDIA_PER_FARM = 30;
const notFound = (): NotFoundException => new NotFoundException('Image not found');

/**
 * Farm images. Access is farm-role based (see FarmMemberAccessService): any active farm role reads and downloads,
 * an active owner/manager uploads, FarmExit staff have no access, and there is no public access to any image.
 * Every query is scoped by the farm id from the route.
 */
@Injectable()
export class FarmMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: FarmMemberAccessService,
    private readonly files: MediaFilesService,
  ) {}

  async upload(
    userId: bigint,
    farmId: bigint,
    file: UploadedImageFile | undefined,
    dto: UploadFarmMediaDto,
  ): Promise<FarmMediaResponseDto> {
    await this.access.require(userId, farmId, 'edit');
    const image = this.files.prepare(file);

    // Lock the farm row so two uploads cannot both pass the cap. The file is stored only after the count check,
    // and a failed insert deletes it before the transaction rolls the row back.
    const row = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id FROM farms WHERE id = ${farmId} AND deleted_at IS NULL FOR UPDATE
      `;
      if (locked.length !== 1) throw new NotFoundException('Farm not found');

      const count = await tx.farmMedia.count({ where: { farmId } });
      if (count >= MAX_MEDIA_PER_FARM) {
        throw new ConflictException(`A farm can have at most ${MAX_MEDIA_PER_FARM} images`);
      }

      const key = await this.files.store('farms', farmId, image);
      try {
        return await tx.farmMedia.create({
          data: {
            farmId,
            uploadedBy: userId,
            mediaType: FarmMediaType.photo,
            storageKey: key,
            altEn: dto.altEn ?? null,
            altAr: dto.altAr ?? null,
            width: image.width,
            height: image.height,
            isIllustrative: dto.isIllustrative ?? false,
            sortOrder: count,
          },
        });
      } catch (error) {
        await this.files.discard(key); // no file without metadata
        throw error;
      }
    });
    return toResponse(row);
  }

  async list(userId: bigint, farmId: bigint, query: ListFarmsQueryDto): Promise<FarmMediaListResponseDto> {
    await this.access.require(userId, farmId, 'read');
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const [total, rows] = await Promise.all([
      this.prisma.farmMedia.count({ where: { farmId } }),
      this.prisma.farmMedia.findMany({
        where: { farmId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map(toResponse), page, pageSize, total };
  }

  async get(userId: bigint, farmId: bigint, mediaId: bigint): Promise<FarmMediaResponseDto> {
    await this.access.require(userId, farmId, 'read');
    return toResponse(await this.find(farmId, mediaId));
  }

  async download(userId: bigint, farmId: bigint, mediaId: bigint): Promise<MediaFileStream> {
    await this.access.require(userId, farmId, 'read');
    const row = await this.find(farmId, mediaId);
    if (!isOwnedStorageKey('farms', farmId, row.storageKey)) throw notFound();
    const { stream, size } = await this.files.open(row.storageKey);
    return {
      stream,
      size,
      contentType: contentTypeForKey(row.storageKey),
      filename: `farm-image-${row.id.toString()}.${extensionForKey(row.storageKey)}`,
    };
  }

  private async find(farmId: bigint, mediaId: bigint): Promise<FarmMedia> {
    const row = await this.prisma.farmMedia.findFirst({ where: { id: mediaId, farmId } });
    if (!row) throw notFound();
    return row;
  }
}

function toResponse(m: FarmMedia): FarmMediaResponseDto {
  return {
    id: m.id.toString(),
    farmId: m.farmId.toString(),
    mediaType: m.mediaType,
    contentType: contentTypeForKey(m.storageKey),
    altEn: m.altEn ?? null,
    altAr: m.altAr ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
    isIllustrative: m.isIllustrative,
    licenceStatus: m.licenceStatus,
    sortOrder: m.sortOrder,
    url: `/api/v1/farms/${m.farmId.toString()}/media/${m.id.toString()}/file`,
    createdAt: m.createdAt?.toISOString() ?? null,
  };
}
