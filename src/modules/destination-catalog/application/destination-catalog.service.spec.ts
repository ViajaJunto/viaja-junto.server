import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DestinationCatalog } from '../domain/destination-catalog.entity.js';
import type { DestinationCatalogRepository } from '../domain/destination-catalog.repository.js';
import type { PhotoStorageService } from '../../../shared/storage/application/photo-storage.service.js';
import type { CatalogAccessService } from '../../catalog-access/application/catalog-access.service.js';
import { DestinationCatalogService } from './destination-catalog.service.js';

const base: DestinationCatalog = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Paris',
  country: 'Franca',
  category: 'CITY',
  description: null,
  latitude: 48.856614,
  longitude: 2.3522219,
  photoUrl: null,
};

const entity = (
  overrides: Partial<DestinationCatalog> = {},
): DestinationCatalog => ({ ...base, ...overrides });

type RepoMock = {
  [K in keyof DestinationCatalogRepository]: ReturnType<typeof vi.fn>;
};

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
};

describe('DestinationCatalogService', () => {
  let access: {
    assertAdmin: ReturnType<typeof vi.fn>;
    assertCanDelete: ReturnType<typeof vi.fn>;
  };
  let repository: RepoMock;
  let photos: {
    replace: ReturnType<typeof vi.fn>;
    discard: ReturnType<typeof vi.fn>;
  };
  let service: DestinationCatalogService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      countTripUsages: vi.fn().mockResolvedValue(0),
      remove: vi.fn(),
    };
    access = {
      assertAdmin: vi.fn().mockResolvedValue(undefined),
      assertCanDelete: vi.fn().mockResolvedValue(undefined),
    };
    photos = {
      replace: vi.fn(),
      discard: vi.fn().mockResolvedValue(undefined),
    };
    service = new DestinationCatalogService(
      repository as unknown as DestinationCatalogRepository,
      photos as unknown as PhotoStorageService,
      access as unknown as CatalogAccessService,
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

      await service.create({ name: 'Paris' }, user);

      expect(repository.create).toHaveBeenCalledWith({ name: 'Paris' });
    });
  });

  describe('update', () => {
    it('updates an existing record', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {}, user);

      expect(repository.update).toHaveBeenCalledWith(base.id, {});
    });

    it('does not touch the repository when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing record', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('remove (photo cleanup)', () => {
    it('discards the stored photo after deleting the record', async () => {
      repository.findById.mockResolvedValue(
        entity({ photoUrl: 'http://s3/bucket/destinations/old.jpg' }),
      );
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(photos.discard).toHaveBeenCalledWith(
        'http://s3/bucket/destinations/old.jpg',
      );
    });
  });

  describe('updatePhoto', () => {
    const photo = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };
    const newUrl = 'http://s3/bucket/destinations/new.jpg';

    it('replaces the stored photo and returns the saved record', async () => {
      const oldUrl = 'http://s3/bucket/destinations/old.jpg';
      repository.findById.mockResolvedValue(entity({ photoUrl: oldUrl }));
      repository.update.mockResolvedValue(entity({ photoUrl: newUrl }));
      photos.replace.mockImplementation(
        ({ save }: { save: (url: string) => Promise<unknown> }) => save(newUrl),
      );

      const result = await service.updatePhoto(base.id, photo, user);

      expect(photos.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'destinations',
          ownerId: base.id,
          photo,
          previousUrl: oldUrl,
        }),
      );
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        photoUrl: newUrl,
      });
      expect(result.photoUrl).toBe(newUrl);
    });

    it('does not touch storage for a missing record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updatePhoto(base.id, photo, user),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(photos.replace).not.toHaveBeenCalled();
    });
  });

  describe('permissions', () => {
    const photo = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };

    beforeEach(() => {
      access.assertAdmin.mockRejectedValue(new ForbiddenException());
      repository.findById.mockResolvedValue(entity());
    });

    it('lets only an administrator create', async () => {
      await expect(
        service.create({ name: 'Nova entrada' } as never, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(access.assertAdmin).toHaveBeenCalledWith(user.id);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('lets only an administrator update', async () => {
      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('lets only an administrator upload a photo', async () => {
      await expect(
        service.updatePhoto(base.id, photo, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(photos.replace).not.toHaveBeenCalled();
    });

    it('lets only an administrator delete', async () => {
      access.assertCanDelete.mockRejectedValue(new ForbiddenException());

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
      expect(photos.discard).not.toHaveBeenCalled();
    });

    it('refuses to delete an entry that trips still use', async () => {
      access.assertCanDelete.mockRejectedValue(new ConflictException());

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('hands the policy a way to count how many trips use the entry', async () => {
      repository.countTripUsages.mockResolvedValue(3);
      access.assertCanDelete.mockImplementation(
        async (_userId: string, countUsages: () => Promise<number>) => {
          expect(await countUsages()).toBe(3);
        },
      );
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(repository.countTripUsages).toHaveBeenCalledWith(base.id);
    });
  });
});
