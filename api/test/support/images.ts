import { deflateSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { type ObjectStorage, StorageObjectNotFoundError } from '../../src/modules/media/storage/object-storage';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

export const GPS_MARKER = 'GPS-LAT-30.0444N-LON-31.2357E';

function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), 0);
  return Buffer.concat([head, data, tail]);
}

export function makePng(opts: { width?: number; height?: number; gps?: boolean } = {}): Buffer {
  const width = opts.width ?? 4;
  const height = opts.height ?? 4;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  // Pixel data is only generated for small images; huge declared sizes are for dimension-cap tests.
  const raw = Buffer.alloc(width * height <= 1_000_000 ? height * (1 + width * 3) : 4);
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', ihdr)];
  if (opts.gps) {
    parts.push(pngChunk('tEXt', Buffer.from(`Comment\0${GPS_MARKER}`)));
    parts.push(pngChunk('eXIf', Buffer.from(GPS_MARKER)));
  }
  parts.push(pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

export function makeJpeg(opts: { width?: number; height?: number; gps?: boolean } = {}): Buffer {
  const width = opts.width ?? 8;
  const height = opts.height ?? 8;
  const seg = (marker: number, payload: Buffer): Buffer => {
    const head = Buffer.from([0xff, marker, 0, 0]);
    head.writeUInt16BE(payload.length + 2, 2);
    return Buffer.concat([head, payload]);
  };
  const sof = Buffer.alloc(15);
  sof[0] = 8;
  sof.writeUInt16BE(height, 1);
  sof.writeUInt16BE(width, 3);
  sof[5] = 3;
  sof.set([1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1], 6);
  const sos = Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')),
    ...(opts.gps ? [seg(0xe1, Buffer.from(`Exif\0\0${GPS_MARKER}`)), seg(0xfe, Buffer.from(GPS_MARKER))] : []),
    seg(0xc0, sof),
    seg(0xda, sos),
    Buffer.from([0x12, 0x34, 0x56, 0x78]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

function riff(chunks: Buffer[]): Buffer {
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}
function webpChunk(fourcc: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.write(fourcc, 0, 'latin1');
  head.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

/** Lossless WebP (VP8L). With `gps`, wraps it in a VP8X container carrying EXIF and XMP chunks. */
export function makeWebp(opts: { width?: number; height?: number; gps?: boolean } = {}): Buffer {
  const width = opts.width ?? 6;
  const height = opts.height ?? 6;
  const bits = (width - 1) | ((height - 1) << 14);
  const vp8l = Buffer.alloc(9);
  vp8l[0] = 0x2f;
  vp8l.writeUInt32LE(bits >>> 0, 1);
  const lossless = webpChunk('VP8L', vp8l);
  if (!opts.gps) return riff([lossless]);
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x08 | 0x04; // EXIF + XMP flags
  vp8x.writeUIntLE(width - 1, 4, 3);
  vp8x.writeUIntLE(height - 1, 7, 3);
  return riff([
    webpChunk('VP8X', vp8x),
    lossless,
    webpChunk('EXIF', Buffer.from(GPS_MARKER)),
    webpChunk('XMP ', Buffer.from(GPS_MARKER)),
  ]);
}

/** In-memory ObjectStorage with failure injection. */
export class MemoryObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, Buffer>();
  failPut = false;
  failDelete = false;

  put(key: string, body: Buffer): Promise<void> {
    if (this.failPut) return Promise.reject(new Error('disk full'));
    this.objects.set(key, Buffer.from(body));
    return Promise.resolve();
  }
  get(key: string): Promise<{ stream: Readable; size: number }> {
    const found = this.objects.get(key);
    if (!found) return Promise.reject(new StorageObjectNotFoundError());
    return Promise.resolve({ stream: Readable.from([found]), size: found.length });
  }
  delete(key: string): Promise<void> {
    if (this.failDelete) return Promise.reject(new Error('cannot delete'));
    this.objects.delete(key);
    return Promise.resolve();
  }
}
