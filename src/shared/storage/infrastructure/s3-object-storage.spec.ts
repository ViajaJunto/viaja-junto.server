import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import {
  S3ObjectStorage,
  type S3ObjectStorageOptions,
} from './s3-object-storage.js';

const base: S3ObjectStorageOptions = {
  bucket: 'photos',
  region: 'us-east-1',
  forcePathStyle: false,
};

function build(options: Partial<S3ObjectStorageOptions> = {}) {
  const send = vi.fn().mockResolvedValue({});
  const storage = new S3ObjectStorage({ ...base, ...options }, {
    send,
  } as unknown as S3Client);
  return { storage, send };
}

describe('S3ObjectStorage', () => {
  it('uploads with the content type and an immutable cache policy', async () => {
    const { storage, send } = build();
    const body = Buffer.from('img');

    await storage.put({ key: 'a/b.jpg', body, contentType: 'image/jpeg' });

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'photos',
      Key: 'a/b.jpg',
      Body: body,
      ContentType: 'image/jpeg',
    });
    expect(command.input.CacheControl).toContain('immutable');
  });

  it('deletes by key', async () => {
    const { storage, send } = build();

    await storage.delete('a/b.jpg');

    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: 'photos', Key: 'a/b.jpg' });
  });

  describe('public URL', () => {
    const urlOf = async (options: Partial<S3ObjectStorageOptions>) =>
      (
        await build(options).storage.put({
          key: 'k.png',
          body: Buffer.alloc(0),
          contentType: 'image/png',
        })
      ).url;

    it('uses the virtual-hosted AWS URL by default', async () => {
      expect(await urlOf({})).toBe(
        'https://photos.s3.us-east-1.amazonaws.com/k.png',
      );
    });

    it('uses path style against an emulator endpoint', async () => {
      expect(
        await urlOf({
          endpoint: 'http://ministack:4566/',
          forcePathStyle: true,
        }),
      ).toBe('http://ministack:4566/photos/k.png');
    });

    it('uses a bucket subdomain on a custom endpoint without path style', async () => {
      expect(await urlOf({ endpoint: 'https://s3.example.com' })).toBe(
        'https://photos.s3.example.com/k.png',
      );
    });

    it('prefers the explicit public URL', async () => {
      expect(
        await urlOf({
          endpoint: 'http://ministack:4566',
          forcePathStyle: true,
          publicUrl: 'http://localhost:4566/photos/',
        }),
      ).toBe('http://localhost:4566/photos/k.png');
    });
  });

  describe('keyFromUrl', () => {
    const { storage } = build({ publicUrl: 'http://localhost:4566/photos' });

    it('extracts the key of one of our objects', () => {
      expect(
        storage.keyFromUrl('http://localhost:4566/photos/destinations/1/x.jpg'),
      ).toBe('destinations/1/x.jpg');
    });

    it.each([
      'https://images.example.com/x.jpg',
      'http://localhost:4566/photos-other/x.jpg',
      'http://localhost:4566/photos/',
    ])('ignores %s', (url) => {
      expect(storage.keyFromUrl(url)).toBeNull();
    });
  });
});
