import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { type ImageKind, type SanitizedImage, sanitizeImage } from './image-inspector';

/** The part of a multer memory-storage file this module relies on. */
export type UploadedImageFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const ALLOWED_EXTENSIONS: Record<string, ImageKind> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp' };
const ALLOWED_MIME: Record<string, ImageKind> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const DANGEROUS_SEGMENTS = new Set([
  'php',
  'phtml',
  'phar',
  'asp',
  'aspx',
  'jsp',
  'cgi',
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'js',
  'mjs',
  'html',
  'htm',
  'svg',
  'xml',
]);
const MAX_FILENAME_LENGTH = 150;
// eslint-disable-next-line no-control-regex
const FORBIDDEN_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/;

/** The original filename is only validated, never stored or used in a path, header or storage key. */
export function assertSafeFilename(name: unknown): string {
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_FILENAME_LENGTH) {
    throw new BadRequestException('Invalid file name');
  }
  if (FORBIDDEN_FILENAME_CHARS.test(name) || name.includes('..') || name !== name.trim() || name.startsWith('.')) {
    throw new BadRequestException('Invalid file name');
  }
  const parts = name.toLowerCase().split('.');
  if (parts.length < 2) throw new BadRequestException('File name must have an image extension');
  if (parts.slice(1, -1).some((segment) => DANGEROUS_SEGMENTS.has(segment))) {
    throw new BadRequestException('Invalid file name');
  }
  return parts[parts.length - 1];
}

/**
 * Validates an upload by size, extension, declared type AND file signature/structure, and returns the sanitized
 * bytes (metadata stripped) to store. Extension, Content-Type and the real format must all agree.
 */
export function validateImageUpload(file: UploadedImageFile | undefined, maxBytes: number): SanitizedImage {
  if (!file) throw new BadRequestException('Attach one image in the "file" field');
  const extension = assertSafeFilename(file.originalname);
  if (file.size === 0 || file.buffer.length === 0) throw new BadRequestException('The file is empty');
  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    throw new PayloadTooLargeException(`Images can be at most ${Math.floor(maxBytes / 1024)} KB`);
  }
  const byExtension = ALLOWED_EXTENSIONS[extension];
  const byMime = ALLOWED_MIME[String(file.mimetype).toLowerCase()];
  if (!byExtension || !byMime) throw new UnsupportedMediaTypeException('Only JPEG, PNG and WebP images are allowed');

  const image = sanitizeImage(file.buffer);
  if (!image) throw new UnsupportedMediaTypeException('The file is not a valid JPEG, PNG or WebP image');
  if (image.kind !== byExtension || image.kind !== byMime) {
    throw new UnsupportedMediaTypeException('The file extension, content type and contents do not match');
  }
  return image;
}
