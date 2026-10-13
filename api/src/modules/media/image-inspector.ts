/**
 * Image validation by FILE SIGNATURE and structure (never by extension or client Content-Type), plus metadata
 * stripping. Supported: JPEG, PNG, WebP. `sanitizeImage` removes EXIF/XMP/text metadata, which can carry GPS
 * coordinates and would otherwise leak a farm's precise location (farms keep their pin private).
 */
export type ImageKind = 'jpeg' | 'png' | 'webp';
export type ImageInfo = {
  kind: ImageKind;
  extension: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
};
export type SanitizedImage = ImageInfo & { data: Buffer };

export const MAX_DIMENSION = 12_000;
export const MAX_PIXELS = 50_000_000;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const META = {
  jpegDrop: new Set([0xe1, 0xec, 0xed, 0xfe]),
  pngDrop: new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']),
};

const INFO: Record<ImageKind, Pick<ImageInfo, 'extension' | 'contentType'>> = {
  jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
  png: { extension: 'png', contentType: 'image/png' },
  webp: { extension: 'webp', contentType: 'image/webp' },
};

/** Returns the cleaned image and its dimensions, or null when it is not a well-formed supported image. */
export function sanitizeImage(input: Buffer): SanitizedImage | null {
  const result = detect(input);
  if (!result) return null;
  const data = result.data;
  const dims = result.kind === 'jpeg' ? jpegSize(data) : result.kind === 'png' ? pngSize(data) : webpSize(data);
  if (!dims) return null;
  const [width, height] = dims;
  if (width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    return null;
  }
  return { kind: result.kind, ...INFO[result.kind], width, height, data };
}

function detect(buf: Buffer): { kind: ImageKind; data: Buffer } | null {
  if (buf.length < 16) return null;
  if (buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    const data = stripPng(buf);
    return data ? { kind: 'png', data } : null;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    const data = stripJpeg(buf);
    return data ? { kind: 'jpeg', data } : null;
  }
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const data = stripWebp(buf);
    return data ? { kind: 'webp', data } : null;
  }
  return null;
}

// ---------- JPEG ----------
function stripJpeg(buf: Buffer): Buffer | null {
  const out: Buffer[] = [buf.subarray(0, 2)];
  let pos = 2;
  while (pos < buf.length) {
    if (buf[pos] !== 0xff) return null;
    while (buf[pos] === 0xff) pos++; // fill bytes
    const marker = buf[pos];
    if (marker === undefined) return null;
    const start = pos - 1;
    pos++;
    if (marker === 0xd9) {
      out.push(buf.subarray(start, pos)); // EOI
      return Buffer.concat(out);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      out.push(buf.subarray(start, pos));
      continue;
    }
    if (pos + 2 > buf.length) return null;
    const length = buf.readUInt16BE(pos);
    if (length < 2 || pos + length > buf.length) return null;
    const end = pos + length;
    if (marker === 0xda) {
      // start of scan: the entropy-coded data follows; copy the rest unchanged (must contain EOI)
      const rest = buf.subarray(start);
      if (!(rest[rest.length - 2] === 0xff && rest[rest.length - 1] === 0xd9)) return null;
      out.push(rest);
      return Buffer.concat(out);
    }
    if (!META.jpegDrop.has(marker)) out.push(buf.subarray(start, end));
    pos = end;
  }
  return null;
}

function jpegSize(buf: Buffer): [number, number] | null {
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) return null;
    const marker = buf[pos + 1];
    if (marker === 0xff) {
      pos++;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = buf.readUInt16BE(pos + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (length < 8 || pos + 9 > buf.length) return null;
      return [buf.readUInt16BE(pos + 7), buf.readUInt16BE(pos + 5)];
    }
    pos += 2 + length;
  }
  return null;
}

// ---------- PNG ----------
function stripPng(buf: Buffer): Buffer | null {
  const out: Buffer[] = [buf.subarray(0, 8)];
  let pos = 8;
  let first = true;
  let sawEnd = false;
  while (pos + 12 <= buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const end = pos + 12 + length;
    if (end > buf.length) return null;
    if (first && (type !== 'IHDR' || length !== 13)) return null;
    first = false;
    if (!META.pngDrop.has(type)) out.push(buf.subarray(pos, end));
    pos = end;
    if (type === 'IEND') {
      sawEnd = true;
      break;
    }
  }
  return sawEnd ? Buffer.concat(out) : null;
}

function pngSize(buf: Buffer): [number, number] | null {
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

// ---------- WebP ----------
function stripWebp(buf: Buffer): Buffer | null {
  const riffSize = buf.readUInt32LE(4);
  if (riffSize + 8 > buf.length || riffSize < 12) return null;
  const limit = riffSize + 8;
  const chunks: Buffer[] = [];
  let pos = 12;
  while (pos + 8 <= limit) {
    const fourcc = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const end = pos + 8 + size + (size % 2);
    if (end > limit) return null;
    if (fourcc === 'EXIF' || fourcc === 'XMP ') {
      pos = end;
      continue;
    }
    const chunk = Buffer.from(buf.subarray(pos, end));
    if (fourcc === 'VP8X' && size >= 10) chunk[8] = chunk[8] & ~0x0c; // clear EXIF + XMP flags
    chunks.push(chunk);
    pos = end;
  }
  if (chunks.length === 0) return null;
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, body]);
}

function webpSize(buf: Buffer): [number, number] | null {
  const fourcc = buf.toString('latin1', 12, 16);
  if (fourcc === 'VP8X' && buf.length >= 30) {
    return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  }
  if (fourcc === 'VP8 ' && buf.length >= 30) {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  if (fourcc === 'VP8L' && buf.length >= 25) {
    if (buf[20] !== 0x2f) return null;
    const b = (i: number): number => buf[i];
    return [1 + (b(21) | ((b(22) & 0x3f) << 8)), 1 + ((b(22) >> 6) | (b(23) << 2) | ((b(24) & 0x0f) << 10))];
  }
  return null;
}
