import { FileInterceptor } from '@nestjs/platform-express';
import { PHOTO_MAX_BYTES } from '../domain/photo.js';

/**
 * Reads the multipart `file` field into memory.
 *
 * The multer limit stops reading an oversized body early (413) instead of
 * buffering it whole and rejecting it afterwards in the pipe.
 */
export const PhotoUploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
});
