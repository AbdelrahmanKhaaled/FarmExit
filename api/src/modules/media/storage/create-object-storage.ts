import { NodeEnv, StorageProviderName } from '../../../config/env.validation';
import { LocalObjectStorage } from './local-object-storage';
import type { ObjectStorage } from './object-storage';

/**
 * Chooses the storage adapter. Local disk is refused in production: use a private S3-compatible adapter there
 * (to be added behind the same `ObjectStorage` interface).
 */
export function createObjectStorage(name: StorageProviderName, nodeEnv: NodeEnv, localDir: string): ObjectStorage {
  if (name === StorageProviderName.Local) {
    if (nodeEnv === NodeEnv.Production) {
      throw new Error('MEDIA_STORAGE_PROVIDER=local is not allowed in production: configure private object storage');
    }
    return new LocalObjectStorage(localDir);
  }
  throw new Error(`Unsupported MEDIA_STORAGE_PROVIDER: ${String(name)}`);
}
