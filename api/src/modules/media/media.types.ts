import type { Readable } from 'node:stream';

export type MediaFileStream = { stream: Readable; size: number; contentType: string; filename: string };
