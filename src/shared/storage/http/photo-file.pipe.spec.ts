import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PHOTO_MAX_BYTES } from '../domain/photo.js';
import { photoFilePipe } from './photo-file.pipe.js';

// Smallest valid PNG (1x1, transparent): real magic numbers for file-type.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const file = (buffer: Buffer, mimetype: string, size = buffer.length) =>
  ({ buffer, mimetype, size }) as never;

describe('photoFilePipe', () => {
  it('accepts a real PNG', async () => {
    const input = file(PNG, 'image/png');

    await expect(photoFilePipe.transform(input)).resolves.toBe(input);
  });

  it('rejects a missing file with 422', async () => {
    await expect(photoFilePipe.transform(undefined)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects content that only claims to be an image', async () => {
    const fake = Buffer.from('%PDF-1.7\n'.padEnd(64, ' '));

    await expect(
      photoFilePipe.transform(file(fake, 'image/png')),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects files above the size limit', async () => {
    const big = file(PNG, 'image/png', PHOTO_MAX_BYTES + 1);

    await expect(photoFilePipe.transform(big)).rejects.toThrow(/5 MB/);
  });
});
