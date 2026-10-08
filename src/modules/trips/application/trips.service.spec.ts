import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '../domain/trip.entity.js';
import type { TripRepository } from '../domain/trip.repository.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripsService } from './trips.service.js';

const base: Trip = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Eurotrip 2026',
  description: null,
  startDate: null,
  endDate: null,
  status: 'PLANNING',
  createdBy: '11111111-1111-4111-8111-111111111111',
  createdAt: new Date('2026-03-14T18:22:05.000Z'),
};

const entity = (overrides: Partial<Trip> = {}): Trip => ({
  ...base,
  ...overrides,
});

type RepoMock = {
  [K in keyof TripRepository]: ReturnType<typeof vi.fn>;
};
type AccessMock = {
  [K in keyof TripAccessService]: ReturnType<typeof vi.fn>;
};

const user: AuthenticatedUser = {
  id: base.createdBy,
  email: 'ana@example.com',
};

describe('TripsService', () => {
  let repository: RepoMock;
  let access: AccessMock;
  let service: TripsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    access = {
      assertCanRead: vi.fn().mockResolvedValue('CREATOR'),
      assertCanEdit: vi.fn().mockResolvedValue('CREATOR'),
      assertIsCreator: vi.fn().mockResolvedValue('CREATOR'),
      tripIdOfDestination: vi.fn(),
      tripIdOfActivity: vi.fn(),
    };
    service = new TripsService(
      repository as unknown as TripRepository,
      access as unknown as TripAccessService,
    );
  });

  describe('findAll', () => {
    it('lists only the trips of the caller, in a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 3, limit: 15 }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        user.id,
      );
    });

    it('falls back to the default window when the query is empty', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({}, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
      );
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 }, user);

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
    it('returns the trip to anyone who can read it', async () => {
      repository.findById.mockResolvedValue(entity());

      const result = await service.findOne(base.id, user);

      expect(result.id).toBe(base.id);
      expect(access.assertCanRead).toHaveBeenCalledWith(base.id, user.id);
    });

    it('does not load the trip for someone with no access', async () => {
      access.assertCanRead.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('makes the caller the creator and defaults the status', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create({ name: 'Eurotrip 2026' }, user);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PLANNING', createdBy: user.id }),
      );
    });

    it('ignores a createdBy smuggled into the payload', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        { name: 'Eurotrip 2026', createdBy: 'someone-else' } as never,
        user,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: user.id }),
      );
    });

    it('keeps an explicit status instead of the default', async () => {
      repository.create.mockResolvedValue(entity({ status: 'CONFIRMED' }));

      await service.create(
        { name: 'Eurotrip 2026', status: 'CONFIRMED' },
        user,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED' }),
      );
    });
  });

  describe('update', () => {
    it('lets the creator update the trip', async () => {
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {}, user);

      expect(access.assertIsCreator).toHaveBeenCalledWith(base.id, user.id);
      expect(repository.update).toHaveBeenCalledWith(base.id, {});
    });

    it('does not update when the caller is not the creator', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not update a trip that does not exist', async () => {
      access.assertIsCreator.mockRejectedValue(new NotFoundException());

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lets the creator delete the trip', async () => {
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(access.assertIsCreator).toHaveBeenCalledWith(base.id, user.id);
      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the caller is not the creator', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
