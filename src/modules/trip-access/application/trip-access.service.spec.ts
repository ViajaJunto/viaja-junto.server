import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  TripAccessRepository,
  TripRole,
} from '../domain/trip-access.repository.js';
import { TripAccessService } from './trip-access.service.js';

const tripId = '22222222-2222-4222-8222-222222222222';
const userId = '11111111-1111-4111-8111-111111111111';

type RepoMock = {
  [K in keyof TripAccessRepository]: ReturnType<typeof vi.fn>;
};

describe('TripAccessService', () => {
  let repository: RepoMock;
  let service: TripAccessService;

  beforeEach(() => {
    repository = {
      findRole: vi.fn(),
      findTripIdByDestination: vi.fn(),
      findTripIdByActivity: vi.fn(),
    };
    service = new TripAccessService(
      repository as unknown as TripAccessRepository,
    );
  });

  /** Outcome of each action for each role: the permission table of the trip. */
  const matrix: Array<{
    action: 'assertCanRead' | 'assertCanEdit' | 'assertIsCreator';
    role: TripRole | null;
    allowed: boolean;
  }> = [
    { action: 'assertCanRead', role: 'CREATOR', allowed: true },
    { action: 'assertCanRead', role: 'EDITOR', allowed: true },
    { action: 'assertCanRead', role: 'VIEWER', allowed: true },
    { action: 'assertCanEdit', role: 'CREATOR', allowed: true },
    { action: 'assertCanEdit', role: 'EDITOR', allowed: true },
    { action: 'assertCanEdit', role: 'VIEWER', allowed: false },
    { action: 'assertIsCreator', role: 'CREATOR', allowed: true },
    { action: 'assertIsCreator', role: 'EDITOR', allowed: false },
    { action: 'assertIsCreator', role: 'VIEWER', allowed: false },
  ];

  it.each(matrix)(
    '$action as $role -> allowed: $allowed',
    async ({ action, role, allowed }) => {
      repository.findRole.mockResolvedValue(role);

      const result = service[action](tripId, userId);

      if (allowed) {
        await expect(result).resolves.toBe(role);
      } else {
        await expect(result).rejects.toBeInstanceOf(ForbiddenException);
      }
    },
  );

  it.each(['assertCanRead', 'assertCanEdit', 'assertIsCreator'] as const)(
    '%s answers 404 to someone unrelated to the trip, as for a missing trip',
    async (action) => {
      repository.findRole.mockResolvedValue(null);

      await expect(service[action](tripId, userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it('looks the role up by trip and user', async () => {
    repository.findRole.mockResolvedValue('VIEWER');

    await service.assertCanRead(tripId, userId);

    expect(repository.findRole).toHaveBeenCalledWith(tripId, userId);
  });

  describe('tripIdOfDestination', () => {
    it('resolves the trip a destination belongs to', async () => {
      repository.findTripIdByDestination.mockResolvedValue(tripId);

      await expect(service.tripIdOfDestination('d')).resolves.toBe(tripId);
    });

    it('throws NotFoundException for an unknown destination', async () => {
      repository.findTripIdByDestination.mockResolvedValue(null);

      await expect(service.tripIdOfDestination('d')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('tripIdOfActivity', () => {
    it('resolves the trip an activity belongs to', async () => {
      repository.findTripIdByActivity.mockResolvedValue(tripId);

      await expect(service.tripIdOfActivity('a')).resolves.toBe(tripId);
    });

    it('throws NotFoundException for an unknown activity', async () => {
      repository.findTripIdByActivity.mockResolvedValue(null);

      await expect(service.tripIdOfActivity('a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
