import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { makeJpeg, makePng, makeWebp } from '../../../test/support/images';
import { assertSafeFilename, validateImageUpload, type UploadedImageFile } from './image-upload.validator';

const file = (buffer: Buffer, originalname: string, mimetype: string): UploadedImageFile => ({
  buffer,
  originalname,
  mimetype,
  size: buffer.length,
});
const MAX = 5_242_880;

describe('validateImageUpload', () => {
  it('accepts matching extension, content type and contents', () => {
    expect(validateImageUpload(file(makeJpeg(), 'a.JPG', 'image/jpeg'), MAX).kind).toBe('jpeg');
    expect(validateImageUpload(file(makeJpeg(), 'a.jpeg', 'image/jpeg'), MAX).kind).toBe('jpeg');
    expect(validateImageUpload(file(makePng(), 'a.png', 'image/png'), MAX).kind).toBe('png');
    expect(validateImageUpload(file(makeWebp(), 'a.webp', 'image/webp'), MAX).kind).toBe('webp');
  });

  it('requires a file', () => {
    expect(() => validateImageUpload(undefined, MAX)).toThrow(BadRequestException);
  });

  it('rejects empty and oversized files', () => {
    expect(() => validateImageUpload(file(Buffer.alloc(0), 'a.png', 'image/png'), MAX)).toThrow(BadRequestException);
    const big = Buffer.concat([makePng(), Buffer.alloc(2000)]);
    expect(() => validateImageUpload(file(big, 'a.png', 'image/png'), 1024)).toThrow(PayloadTooLargeException);
  });

  it('rejects mismatches and disallowed types', () => {
    const cases: [Buffer, string, string][] = [
      [makePng(), 'a.jpg', 'image/jpeg'], // extension/content mismatch
      [makePng(), 'a.png', 'image/jpeg'], // content type mismatch
      [makePng(), 'a.gif', 'image/png'],
      [makePng(), 'a.png', 'image/gif'],
      [makePng(), 'a.png', 'application/octet-stream'],
      [Buffer.from('<?php system($_GET[1]); ?>'.padEnd(64, ' ')), 'a.jpg', 'image/jpeg'],
      [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'.padEnd(64, ' ')), 'a.png', 'image/png'],
    ];
    for (const [buf, name, mime] of cases) {
      expect(() => validateImageUpload(file(buf, name, mime), MAX)).toThrow(UnsupportedMediaTypeException);
    }
  });
});

describe('assertSafeFilename', () => {
  it('returns the lowercase extension of valid names', () => {
    expect(assertSafeFilename('Farm photo 1.JPG')).toBe('jpg');
  });

  it.each([
    '',
    '../../etc/passwd.png',
    'a/b.png',
    'a\\b.png',
    '..png',
    'a..png',
    '.hidden.png',
    'noextension',
    ' a.png',
    'a.png ',
    'a\u0000.png',
    'a:b.png',
    'a<b>.png',
    'x'.repeat(200) + '.png',
    'shell.php.png',
    'page.html.jpg',
    'a.svg.png',
  ])('rejects %j', (name) => {
    expect(() => assertSafeFilename(name)).toThrow(BadRequestException);
  });

  it('rejects non-strings', () => {
    expect(() => assertSafeFilename(undefined)).toThrow(BadRequestException);
    expect(() => assertSafeFilename(42)).toThrow(BadRequestException);
  });
});
