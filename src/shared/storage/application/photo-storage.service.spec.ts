import { UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObjectStorage } from '../domain/object-storage.js';
import { PhotoStorageService } from './photo-storage.service.js';

describe('PhotoStorageService', () => {
  let storage: {
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    keyFromUrl: ReturnType<typeof vi.fn>;
  };
  let service: PhotoStorageService;

  beforeEach(() => {
    storage = { put: vi.fn(), delete: vi.fn(), keyFromUrl: vi.fn() };
    service = new PhotoStorageService(storage as unknown as ObjectStorage);
  });

  describe('upload', () => {
    it('stores under a fresh key and returns the public URL', async () => {
      storage.put.mockImplementation(({ key }: { key: string }) =>
        Promise.resolve({ key, url: `http://cdn/${key}` }),
      );
      const buffer = Buffer.from('img');

      const url = await service.upload({
        folder: 'destinations',
        ownerId: 'abc',
        photo: { buffer, mimetype: 'image/png' },
      });

      expect(url).toMatch(/^http:\/\/cdn\/destinations\/abc\/[0-9a-f-]+\.png$/);
      expect(storage.put).toHaveBeenCalledWith(
        expect.objectContaining({ body: buffer, contentType: 'image/png' }),
      );
    });

    it('rejects an unsupported type without touching storage', async () => {
      await expect(
        service.upload({
          folder: 'destinations',
          ownerId: 'abc',
          photo: { buffer: Buffer.alloc(1), mimetype: 'image/gif' },
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(storage.put).not.toHaveBeenCalled();
    });
  });

  describe('replace', () => {
    const photo = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };
    const oldUrl = 'http://cdn/destinations/abc/old.jpg';
    const newUrl = 'http://cdn/destinations/abc/new.jpg';

    beforeEach(() => {
      storage.put.mockResolvedValue({
        key: 'destinations/abc/new.jpg',
        url: newUrl,
      });
      storage.keyFromUrl.mockImplementation((url: string) =>
        url.replace('http://cdn/', ''),
      );
      storage.delete.mockResolvedValue(undefined);
    });

    it('saves the new URL and returns the saved record', async () => {
      const save = vi.fn().mockResolvedValue({ photoUrl: newUrl });

      const result = await service.replace({
        folder: 'destinations',
        ownerId: 'abc',
        photo,
        previousUrl: null,
        save,
      });

      expect(save).toHaveBeenCalledWith(newUrl);
      expect(result).toEqual({ photoUrl: newUrl });
    });

    it('discards the previous photo only after the record points elsewhere', async () => {
      const save = vi.fn().mockResolvedValue({});

      await service.replace({
        folder: 'destinations',
        ownerId: 'abc',
        photo,
        previousUrl: oldUrl,
        save,
      });

      expect(storage.delete).toHaveBeenCalledWith('destinations/abc/old.jpg');
      expect(storage.delete).not.toHaveBeenCalledWith(
        'destinations/abc/new.jpg',
      );
      expect(save.mock.invocationCallOrder[0]).toBeLessThan(
        storage.delete.mock.invocationCallOrder[0],
      );
    });

    it('rolls back the uploaded photo when saving fails', async () => {
      const save = vi.fn().mockRejectedValue(new Error('db down'));

      await expect(
        service.replace({
          folder: 'destinations',
          ownerId: 'abc',
          photo,
          previousUrl: oldUrl,
          save,
        }),
      ).rejects.toThrow('db down');

      expect(storage.delete).toHaveBeenCalledWith('destinations/abc/new.jpg');
      expect(storage.delete).not.toHaveBeenCalledWith(
        'destinations/abc/old.jpg',
      );
    });
  });

  describe('discard', () => {
    it.each([null, undefined, ''])('ignores an empty URL (%s)', async (url) => {
      await service.discard(url);

      expect(storage.keyFromUrl).not.toHaveBeenCalled();
    });

    it('leaves URLs outside the bucket alone', async () => {
      storage.keyFromUrl.mockReturnValue(null);

      await service.discard('https://elsewhere/x.jpg');

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('deletes one of our objects', async () => {
      storage.keyFromUrl.mockReturnValue('destinations/abc/x.jpg');
      storage.delete.mockResolvedValue(undefined);

      await service.discard('http://cdn/destinations/abc/x.jpg');

      expect(storage.delete).toHaveBeenCalledWith('destinations/abc/x.jpg');
    });

    it('swallows storage failures, since the request already succeeded', async () => {
      storage.keyFromUrl.mockReturnValue('k.jpg');
      storage.delete.mockRejectedValue(new Error('timeout'));

      await expect(
        service.discard('http://cdn/k.jpg'),
      ).resolves.toBeUndefined();
    });
  });
});
