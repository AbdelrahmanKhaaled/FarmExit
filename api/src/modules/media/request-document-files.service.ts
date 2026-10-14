import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { Env } from '../../config/env.validation';
import {
  InvalidStorageKeyError,
  OBJECT_STORAGE,
  type ObjectStorage,
  REQUEST_DOCUMENT_KEY_PATTERN,
  StorageObjectNotFoundError,
} from './storage/object-storage';
import {
  validateRequestDocumentUpload,
  type SanitizedRequestDocument,
  type UploadedRequestDocumentFile,
} from './request-document-upload.validator';

export function isRequestDocumentStorageKey(requestId: bigint, key: string): boolean {
  return REQUEST_DOCUMENT_KEY_PATTERN.test(key) && key.startsWith(`requests/${requestId.toString()}/documents/`);
}

@Injectable()
export class RequestDocumentFilesService {
  private readonly logger = new Logger(RequestDocumentFilesService.name);
  private readonly maxBytes: number;

  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    config: ConfigService<Env, true>,
  ) {
    this.maxBytes = config.get('MEDIA_MAX_IMAGE_BYTES', { infer: true });
  }

  prepare(file: UploadedRequestDocumentFile | undefined): SanitizedRequestDocument {
    return validateRequestDocumentUpload(file, this.maxBytes);
  }

  async store(requestId: bigint, doc: SanitizedRequestDocument): Promise<string> {
    const key = `requests/${requestId.toString()}/documents/${randomUUID()}.${doc.extension}`;
    await this.storage.put(key, doc.data, doc.contentType);
    return key;
  }

  async discard(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.error(
        `Orphaned request document ${key}: ${error instanceof Error ? error.message : 'delete failed'}`,
      );
    }
  }

  async open(key: string): Promise<{ stream: Readable; size: number }> {
    try {
      return await this.storage.get(key);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError || error instanceof InvalidStorageKeyError) {
        throw new NotFoundException('Document not found');
      }
      throw error;
    }
  }
}
