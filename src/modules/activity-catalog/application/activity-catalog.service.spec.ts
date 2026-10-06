import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityCatalog } from '../domain/activity-catalog.entity.js';
import type { ActivityCatalogRepository } from '../domain/activity-catalog.repository.js';
import type { PhotoStorageService } from '../../../shared/storage/application/photo-storage.service.js';
import { ActivityCatalogService } from './activity-catalog.service.js';

const base: ActivityCatalog = {
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Museu do Louvre',
  description: null,
  type: 'TOUR',
  location: null,
  city: 'Paris',
  country: 'Franca',
  latitude: null,
  longitude: null,
  googlePlaceId: null,
  photoUrl: null,
  source: 'MANUAL',
  averageRating: 4.6,
  createdAt: new Date('2026-02-01T12:00:00.000Z'),
};

const entity = (overrides: Partial<ActivityCatalog> = {}): ActivityCatalog => ({
  ...base,
  ...overrides,
});

type RepoMock = {
  [K in keyof ActivityCatalogRepository]: ReturnType<typeof vi.fn>;
};

describe('ActivityCatalogService', () => {
  let repository: RepoMock;
  let photos: {
    upload: ReturnType<typeof vi.fn>;
    discard: ReturnType<typeof vi.fn>;
  };
  let service: ActivityCatalogService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    photos = {
      upload: vi.fn(),
      discard: vi.fn().mockResolvedValue(undefined),
    };
    service = new ActivityCatalogService(
      repository as unknown as ActivityCatalogRepository,
      photos as unknown as PhotoStorageService,
    );
  });

  describe('findAll', () => {
    it('turns page and limit into a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 3, limit: 15 });

      expect(repository.findAll).toHaveBeenCalledWith({ skip: 30, take: 15 });
    });

    it('falls back to the default window when the query is empty', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 41,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });
  });

  describe('findOne', () => {
    it('returns the mapped response', async () => {
      repository.findById.mockResolvedValue(entity());

      const result = await service.findOne(base.id);

      expect(result.id).toBe(base.id);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('forwards the payload to the repository', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create({ name: 'Museu do Louvre', type: 'TOUR' as const });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TOUR' }),
      );
    });
  });

  describe('update', () => {
    it('updates an existing record', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {});

      expect(repository.update).toHaveBeenCalledWith(base.id, {});
    });

    it('does not touch the repository when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing record', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id);

      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('remove (photo cleanup)', () => {
    it('discards the stored photo after deleting the record', async () => {
      repository.findById.mockResolvedValue(
        entity({ photoUrl: 'http://s3/bucket/activities/old.jpg' }),
      );
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id);

      expect(photos.discard).toHaveBeenCalledWith(
        'http://s3/bucket/activities/old.jpg',
      );
    });
  });

  describe('updatePhoto', () => {
    const photo = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };
    const newUrl = 'http://s3/bucket/activities/new.jpg';

    it('uploads under the activities folder and stores the new URL', async () => {
      repository.findById.mockResolvedValue(entity());
      photos.upload.mockResolvedValue(newUrl);
      repository.update.mockResolvedValue(entity({ photoUrl: newUrl }));

      const result = await service.updatePhoto(base.id, photo);

      expect(photos.upload).toHaveBeenCalledWith({
        folder: 'activities',
        ownerId: base.id,
        photo,
      });
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        photoUrl: newUrl,
      });
      expect(result.photoUrl).toBe(newUrl);
    });

    it('discards the previous photo only after the record points elsewhere', async () => {
      const oldUrl = 'http://s3/bucket/activities/old.jpg';
      repository.findById.mockResolvedValue(entity({ photoUrl: oldUrl }));
      photos.upload.mockResolvedValue(newUrl);
      repository.update.mockResolvedValue(entity({ photoUrl: newUrl }));

      await service.updatePhoto(base.id, photo);

      expect(photos.discard).toHaveBeenCalledWith(oldUrl);
      expect(photos.discard).not.toHaveBeenCalledWith(newUrl);
      expect(repository.update.mock.invocationCallOrder[0]).toBeLessThan(
        photos.discard.mock.invocationCallOrder[0],
      );
    });

    it('rolls back the uploaded photo when the update fails', async () => {
      const oldUrl = 'http://s3/bucket/activities/old.jpg';
      repository.findById.mockResolvedValue(entity({ photoUrl: oldUrl }));
      photos.upload.mockResolvedValue(newUrl);
      repository.update.mockRejectedValue(new Error('db down'));

      await expect(service.updatePhoto(base.id, photo)).rejects.toThrow(
        'db down',
      );

      expect(photos.discard).toHaveBeenCalledWith(newUrl);
      expect(photos.discard).not.toHaveBeenCalledWith(oldUrl);
    });

    it('does not upload anything for a missing record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updatePhoto(base.id, photo)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(photos.upload).not.toHaveBeenCalled();
    });
  });
});
