import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { Env } from '../../config/env.validation';
import type { SanitizedImage } from './image-inspector';
import { validateImageUpload, type UploadedImageFile } from './image-upload.validator';
import {
  InvalidStorageKeyError,
  OBJECT_STORAGE,
  type ObjectStorage,
  STORAGE_KEY_PATTERN,
  StorageObjectNotFoundError,
} from './storage/object-storage';

const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export const contentTypeForKey = (key: string): string =>
  CONTENT_TYPES[key.slice(key.lastIndexOf('.') + 1)] ?? 'application/octet-stream';
export const extensionForKey = (key: string): string => key.slice(key.lastIndexOf('.') + 1);

/**
 * A stored key may be served only when it is one of our keys AND it sits under this parent. A well-formed key for
 * another farm or facility must not be streamed just because a row in this parent points at it.
 */
export function isOwnedStorageKey(parent: 'farms' | 'facilities', parentId: bigint, key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key) && key.startsWith(`${parent}/${parentId.toString()}/media/`);
}

/** Validation + storage plumbing shared by farm and facility media. No database access, no authorization. */
@Injectable()
export class MediaFilesService {
  private readonly logger = new Logger(MediaFilesService.name);
  private readonly maxBytes: number;

  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    config: ConfigService<Env, true>,
  ) {
    this.maxBytes = config.get('MEDIA_MAX_IMAGE_BYTES', { infer: true });
  }

  prepare(file: UploadedImageFile | undefined): SanitizedImage {
    return validateImageUpload(file, this.maxBytes);
  }

  /** Server-generated key: the client controls neither the directory, the name nor the extension. */
  async store(parent: 'farms' | 'facilities', parentId: bigint, image: SanitizedImage): Promise<string> {
    const key = `${parent}/${parentId.toString()}/media/${randomUUID()}.${image.extension}`;
    await this.storage.put(key, image.data, image.contentType);
    return key;
  }

  /** Best effort: used when the database write failed after the object was stored. Never throws. */
  async discard(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.error(`Orphaned media object ${key}: ${error instanceof Error ? error.message : 'delete failed'}`);
    }
  }

  async open(key: string): Promise<{ stream: Readable; size: number }> {
    try {
      return await this.storage.get(key);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError || error instanceof InvalidStorageKeyError) {
        throw new NotFoundException('Image not found');
      }
      throw error;
    }
  }
}
