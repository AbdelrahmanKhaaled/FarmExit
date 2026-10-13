import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve, sep } from 'node:path';
import {
  assertValidStorageKey,
  InvalidStorageKeyError,
  type ObjectStorage,
  StorageObjectNotFoundError,
} from './object-storage';

/**
 * Local-disk adapter for development and tests. Files live under one private root directory that is never served
 * statically. Every key is validated against the strict server-generated pattern AND the resolved path must stay
 * inside the root, so traversal (`..`, absolute paths, separators, encoded tricks) cannot reach other files.
 * Writes go to a temp file and are renamed into place, so readers never see partial files.
 */
export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const target = this.pathFor(key);
    await mkdir(dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, body, { flag: 'wx', mode: 0o600 });
      // keys are random UUIDs; refuse to replace anything that exists
      if (await exists(target)) throw new Error('Storage object already exists');
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
  }

  async get(key: string) {
    const target = this.pathFor(key);
    let size: number;
    try {
      const info = await stat(target);
      if (!info.isFile()) throw new StorageObjectNotFoundError('Not found');
      size = info.size;
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) throw error;
      throw new StorageObjectNotFoundError('Not found');
    }
    return { stream: createReadStream(target), size };
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    assertValidStorageKey(key);
    const target = resolve(this.root, ...key.split('/'));
    if (!target.startsWith(this.root + sep)) throw new InvalidStorageKeyError('Invalid storage key');
    return target;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
