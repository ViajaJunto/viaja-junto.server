import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ObjectStorage } from '../domain/object-storage.js';
import {
  buildPhotoKey,
  isPhotoContentType,
  type UploadedPhoto,
} from '../domain/photo.js';

export interface UploadPhotoInput {
  /** Top-level folder in the bucket, one per resource type. */
  folder: string;
  ownerId: string;
  photo: UploadedPhoto;
}

/**
 * Photo use cases shared by every resource that has a `photoUrl`.
 *
 * Callers follow upload → persist the URL → discard the previous one, so a
 * failure at any step leaves the record pointing at a photo that exists.
 */
@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);

  constructor(private readonly storage: ObjectStorage) {}

  /** Stores the photo under a fresh key and returns its public URL. */
  async upload({ folder, ownerId, photo }: UploadPhotoInput): Promise<string> {
    // The HTTP pipe already checks this; repeated here because the use case
    // must not trust its caller to have done so.
    if (!isPhotoContentType(photo.mimetype)) {
      throw new UnprocessableEntityException(
        `Unsupported photo type "${photo.mimetype}"`,
      );
    }

    const stored = await this.storage.put({
      key: buildPhotoKey(folder, ownerId, photo.mimetype),
      body: photo.buffer,
      contentType: photo.mimetype,
    });

    return stored.url;
  }

  /**
   * Best-effort removal of a photo that is no longer referenced.
   *
   * URLs that do not belong to our bucket (seeded external links, another
   * environment) are left alone, and a storage failure is only logged: an
   * orphan object is cheaper than failing a request that already succeeded.
   */
  async discard(url: string | null | undefined): Promise<void> {
    if (!url) return;

    const key = this.storage.keyFromUrl(url);
    if (!key) return;

    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(
        `Could not delete orphan photo "${key}": ${(error as Error).message}`,
      );
    }
  }
}
