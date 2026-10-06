import { ServiceUnavailableException } from '@nestjs/common';
import type { ObjectStorage, StoredObject } from '../domain/object-storage.js';

/**
 * Stand-in used when S3_BUCKET is not set (plain `npm run start:dev`, CI).
 *
 * The rest of the API keeps working; only operations that actually need to
 * store a file fail, with a 503 that says what is missing.
 */
export class UnconfiguredObjectStorage implements ObjectStorage {
  put(): Promise<StoredObject> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Photo storage is not configured (set S3_BUCKET)',
      ),
    );
  }

  /** Nothing can have been stored, so there is nothing to remove. */
  delete(): Promise<void> {
    return Promise.resolve();
  }

  keyFromUrl(): string | null {
    return null;
  }
}
