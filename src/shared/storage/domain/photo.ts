import { randomUUID } from 'node:crypto';

/** Formats browsers render natively; anything else is rejected on upload. */
export const PHOTO_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type PhotoContentType = keyof typeof PHOTO_CONTENT_TYPES;

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** The part of an uploaded file the application layer cares about. */
export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
}

export function isPhotoContentType(value: string): value is PhotoContentType {
  return Object.hasOwn(PHOTO_CONTENT_TYPES, value);
}

/**
 * Builds a fresh, never-reused key such as `destinations/<id>/<uuid>.jpg`.
 *
 * A new key per upload (instead of overwriting `<id>.jpg`) means browsers and
 * CDNs can cache a photo forever: a replaced photo simply has another URL.
 */
export function buildPhotoKey(
  folder: string,
  ownerId: string,
  contentType: PhotoContentType,
): string {
  return `${folder}/${ownerId}/${randomUUID()}.${PHOTO_CONTENT_TYPES[contentType]}`;
}
