import { NodeEnv, StorageProviderName } from '../../../config/env.validation';
import { createObjectStorage } from './create-object-storage';
import { LocalObjectStorage } from './local-object-storage';

describe('createObjectStorage', () => {
  it('creates local storage outside production', () => {
    expect(createObjectStorage(StorageProviderName.Local, NodeEnv.Development, './storage/uploads')).toBeInstanceOf(
      LocalObjectStorage,
    );
  });
  it('refuses local storage in production', () => {
    expect(() => createObjectStorage(StorageProviderName.Local, NodeEnv.Production, './storage/uploads')).toThrow();
  });
});
