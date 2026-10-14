import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';

export type UploadedRequestDocumentFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export type SanitizedRequestDocument = {
  data: Buffer;
  extension: 'pdf' | 'jpg' | 'png' | 'webp';
  contentType: string;
  originalName: string;
};

const PDF_MAGIC = Buffer.from('%PDF');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_MARKER = Buffer.from('WEBP');

function sniffExtension(data: Buffer): SanitizedRequestDocument['extension'] | null {
  if (data.length >= 4 && data.subarray(0, 4).equals(PDF_MAGIC)) return 'pdf';
  if (data.length >= 3 && data.subarray(0, 3).equals(JPEG_MAGIC)) return 'jpg';
  if (data.length >= 4 && data.subarray(0, 4).equals(PNG_MAGIC)) return 'png';
  if (
    data.length >= 12 &&
    data.subarray(0, 4).equals(WEBP_RIFF) &&
    data.subarray(8, 12).equals(WEBP_MARKER)
  ) {
    return 'webp';
  }
  return null;
}

const MIME: Record<SanitizedRequestDocument['extension'], string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function validateRequestDocumentUpload(
  file: UploadedRequestDocumentFile | undefined,
  maxBytes: number,
): SanitizedRequestDocument {
  if (!file?.buffer?.length) throw new BadRequestException('A file is required');
  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    throw new PayloadTooLargeException('File exceeds the maximum allowed size');
  }
  const extension = sniffExtension(file.buffer);
  if (!extension) throw new UnsupportedMediaTypeException('Only PDF, JPEG, PNG or WebP documents are allowed');
  const contentType = MIME[extension];
  if (file.mimetype && file.mimetype !== contentType && !(extension === 'jpg' && file.mimetype === 'image/jpg')) {
    throw new UnsupportedMediaTypeException('Content type does not match the file');
  }
  const originalName = (file.originalname || 'document').replace(/[/\\]/g, '_').slice(0, 255);
  return { data: file.buffer, extension, contentType, originalName };
}
