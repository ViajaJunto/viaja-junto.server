import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '../domain/trip.entity.js';
import type { TripRepository } from '../domain/trip.repository.js';
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

describe('TripsService', () => {
  let repository: RepoMock;
  let service: TripsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    service = new TripsService(repository as unknown as TripRepository);
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

      await service.create({
        name: 'Eurotrip 2026',
        createdBy: '11111111-1111-4111-8111-111111111111',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PLANNING' }),
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

  it('keeps an explicit status instead of the default', async () => {
    repository.create.mockResolvedValue(entity({ status: 'CONFIRMED' }));

    await service.create({
      name: 'Eurotrip 2026',
      createdBy: '11111111-1111-4111-8111-111111111111',
      status: 'CONFIRMED',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFIRMED' }),
    );
  });
});
