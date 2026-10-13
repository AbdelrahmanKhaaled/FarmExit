import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalObjectStorage } from './local-object-storage';
import { InvalidStorageKeyError, StorageObjectNotFoundError } from './object-storage';

const KEY = 'farms/12/media/123e4567-e89b-42d3-a456-426614174000.png';
const read = async (s: { stream: AsyncIterable<Buffer> }): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const c of s.stream) chunks.push(c);
  return Buffer.concat(chunks);
};

describe('LocalObjectStorage', () => {
  let dir: string;
  let storage: LocalObjectStorage;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'farmexit-storage-'));
    storage = new LocalObjectStorage(dir);
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('stores, reads back and deletes (idempotently)', async () => {
    await storage.put(KEY, Buffer.from('abc'));
    const got = await storage.get(KEY);
    expect(got.size).toBe(3);
    expect((await read(got)).toString()).toBe('abc');
    await storage.delete(KEY);
    await storage.delete(KEY);
    await expect(storage.get(KEY)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it('refuses to overwrite and leaves no temp files', async () => {
    await storage.put(KEY, Buffer.from('one'));
    await expect(storage.put(KEY, Buffer.from('two'))).rejects.toThrow();
    expect((await read(await storage.get(KEY))).toString()).toBe('one');
    const files = await readdir(join(dir, 'farms', '12', 'media'));
    expect(files).toEqual([KEY.split('/').pop()]);
  });

  it.each([
    '../outside.png',
    'farms/../../outside.png',
    'farms/12/media/../../../x.png',
    '/etc/passwd',
    'C:\\windows\\win.ini',
    'farms/12/media/evil.php',
    'farms/012/media/123e4567-e89b-42d3-a456-426614174000.png',
    'other/12/media/123e4567-e89b-42d3-a456-426614174000.png',
    'farms/12/media/123e4567-e89b-42d3-a456-426614174000.png/../x.png',
    `farms/12/media/123e4567-e89b-42d3-a456-426614174000.png\0`,
    '',
  ])('rejects invalid key %j on every operation', async (key) => {
    await expect(storage.put(key, Buffer.from('x'))).rejects.toBeInstanceOf(InvalidStorageKeyError);
    await expect(storage.get(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
    await expect(storage.delete(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
    expect(existsSync(join(dir, '..', 'outside.png'))).toBe(false);
  });
});
