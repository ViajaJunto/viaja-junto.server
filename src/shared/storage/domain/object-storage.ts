export interface StoredObject {
  /** Object key inside the bucket, e.g. `destinations/<id>/<uuid>.jpg`. */
  key: string;
  /** Public URL the frontend can use directly in an `<img>` tag. */
  url: string;
}

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Port for binary object storage (photos).
 *
 * The application layer depends on this contract only; the S3 adapter lives
 * in infrastructure/. Abstract class instead of interface so it can be used
 * as a Nest injection token.
 */
export abstract class ObjectStorage {
  abstract put(input: PutObjectInput): Promise<StoredObject>;

  abstract delete(key: string): Promise<void>;

  /**
   * Reverse of `put().url`: returns the key when `url` points to an object of
   * this storage, or null for anything else (external URLs, other buckets).
   * Lets callers clean up a replaced photo without storing the key twice.
   */
  abstract keyFromUrl(url: string): string | null;
}
