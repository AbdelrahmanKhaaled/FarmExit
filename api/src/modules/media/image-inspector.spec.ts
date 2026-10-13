import { GPS_MARKER, makeJpeg, makePng, makeWebp } from '../../../test/support/images';
import { MAX_DIMENSION, sanitizeImage } from './image-inspector';

describe('sanitizeImage', () => {
  it.each([
    ['jpeg', makeJpeg({ width: 20, height: 10 }), 'jpg', 'image/jpeg'],
    ['png', makePng({ width: 20, height: 10 }), 'png', 'image/png'],
    ['webp', makeWebp({ width: 20, height: 10 }), 'webp', 'image/webp'],
  ])('accepts a valid %s and reads its size', (kind, buf, extension, contentType) => {
    expect(sanitizeImage(buf)).toMatchObject({ kind, extension, contentType, width: 20, height: 10 });
  });

  it.each([
    ['jpeg', makeJpeg({ gps: true })],
    ['png', makePng({ gps: true })],
    ['webp', makeWebp({ gps: true })],
  ])('strips GPS/EXIF metadata from %s', (_k, buf) => {
    expect(buf.includes(GPS_MARKER)).toBe(true);
    const clean = sanitizeImage(buf);
    expect(clean).not.toBeNull();
    expect(clean?.data.includes(GPS_MARKER)).toBe(false);
    expect(sanitizeImage(clean?.data as Buffer)).not.toBeNull(); // still a valid image
  });

  it('rejects wrong signatures, text, scripts and tiny input', () => {
    for (const bad of [
      'hello world, definitely not an image',
      '<?php echo 1; ?>' + ' '.repeat(40),
      '<svg xmlns="x"></svg>' + ' '.repeat(20),
      'GIF89a' + ' '.repeat(30),
    ]) {
      expect(sanitizeImage(Buffer.from(bad))).toBeNull();
    }
    expect(sanitizeImage(Buffer.alloc(0))).toBeNull();
    expect(sanitizeImage(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('rejects truncated images', () => {
    for (const buf of [makeJpeg(), makePng(), makeWebp()]) {
      expect(sanitizeImage(buf.subarray(0, buf.length - 6))).toBeNull();
    }
  });

  it('rejects oversized dimensions', () => {
    expect(sanitizeImage(makePng({ width: MAX_DIMENSION + 1, height: 2 }))).toBeNull();
    expect(sanitizeImage(makeJpeg({ width: 11_000, height: 11_000 }))).toBeNull(); // pixel cap
    expect(sanitizeImage(makeWebp({ width: 16_000, height: 2 }))).toBeNull();
    expect(sanitizeImage(makePng({ width: 0, height: 4 }))).toBeNull();
  });

  it('drops data appended after the image (polyglots)', () => {
    const script = Buffer.from('<script>alert(1)</script>');
    const png = sanitizeImage(Buffer.concat([makePng(), script]));
    const webp = sanitizeImage(Buffer.concat([makeWebp(), script]));
    expect(png?.data.includes('<script>')).toBe(false);
    expect(webp?.data.includes('<script>')).toBe(false);
    // a JPEG with trailing bytes no longer ends in EOI, so it is refused
    expect(sanitizeImage(Buffer.concat([makeJpeg(), script]))).toBeNull();
  });

  it('rejects a PNG whose first chunk is not IHDR', () => {
    const png = makePng();
    png.write('XXXX', 12, 'latin1');
    expect(sanitizeImage(png)).toBeNull();
  });
});
