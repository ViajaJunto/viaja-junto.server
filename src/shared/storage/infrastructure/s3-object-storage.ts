import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type {
  ObjectStorage,
  PutObjectInput,
  StoredObject,
} from '../domain/object-storage.js';

export interface S3ObjectStorageOptions {
  bucket: string;
  region: string;
  /** Custom endpoint for emulators; omit on real AWS. */
  endpoint?: string;
  /** Base URL for public reads, bucket included. */
  publicUrl?: string;
  forcePathStyle: boolean;
}

/**
 * ObjectStorage backed by Amazon S3 (or any S3-compatible emulator).
 *
 * Credentials come from the SDK default chain, so the same code runs with an
 * ECS task role on AWS, container credentials on MiniStack and AWS_* env vars
 * on a developer machine.
 */
export class S3ObjectStorage implements ObjectStorage {
  private readonly publicBaseUrl: string;

  constructor(
    private readonly options: S3ObjectStorageOptions,
    private readonly client: S3Client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
    }),
  ) {
    this.publicBaseUrl = S3ObjectStorage.resolvePublicBaseUrl(options);
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are unique per upload, so the object never changes in place.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return { key, url: `${this.publicBaseUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
  }

  keyFromUrl(url: string): string | null {
    const prefix = `${this.publicBaseUrl}/`;

    return url.startsWith(prefix) && url.length > prefix.length
      ? url.slice(prefix.length)
      : null;
  }

  /**
   * Explicit S3_PUBLIC_URL wins. Otherwise the URL is derived the same way
   * the SDK addresses the bucket: path style for emulators, virtual-hosted
   * style on AWS.
   */
  private static resolvePublicBaseUrl(options: S3ObjectStorageOptions): string {
    const trim = (value: string) => value.replace(/\/+$/, '');

    if (options.publicUrl) {
      return trim(options.publicUrl);
    }

    if (options.endpoint) {
      const endpoint = new URL(trim(options.endpoint));

      if (options.forcePathStyle) {
        return `${trim(endpoint.toString())}/${options.bucket}`;
      }

      return `${endpoint.protocol}//${options.bucket}.${endpoint.host}`;
    }

    return `https://${options.bucket}.s3.${options.region}.amazonaws.com`;
  }
}
