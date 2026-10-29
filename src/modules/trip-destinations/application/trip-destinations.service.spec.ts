import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripDestination } from '../domain/trip-destination.entity.js';
import type { TripDestinationRepository } from '../domain/trip-destination.repository.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { TripEventPublisher } from '../../../shared/events/trip-events.js';
import type { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripDestinationsService } from './trip-destinations.service.js';

const base: TripDestination = {
  id: '55555555-5555-4555-8555-555555555555',
  tripId: '22222222-2222-4222-8222-222222222222',
  destinationCatalogId: '44444444-4444-4444-8444-444444444444',
  arrival: null,
  departure: null,
  description: null,
  order: 1,
};

const entity = (overrides: Partial<TripDestination> = {}): TripDestination => ({
  ...base,
  ...overrides,
});

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
};
const tripId = '22222222-2222-4222-8222-222222222222';

type RepoMock = {
  [K in keyof TripDestinationRepository]: ReturnType<typeof vi.fn>;
};
type AccessMock = {
  [K in keyof TripAccessService]: ReturnType<typeof vi.fn>;
};

describe('TripDestinationsService', () => {
  let repository: RepoMock;
  let access: AccessMock;
  let events: { publish: ReturnType<typeof vi.fn> };
  let service: TripDestinationsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findByTrip: vi.fn(),
      findTripDates: vi.fn().mockResolvedValue({}),
      reorder: vi.fn(),
    };
    access = {
      assertCanRead: vi.fn().mockResolvedValue('CREATOR'),
      assertCanEdit: vi.fn().mockResolvedValue('CREATOR'),
      assertIsCreator: vi.fn().mockResolvedValue('CREATOR'),
      tripIdOfDestination: vi.fn().mockResolvedValue(tripId),
      tripIdOfActivity: vi.fn().mockResolvedValue(tripId),
    } as AccessMock;
    events = { publish: vi.fn() };
    service = new TripDestinationsService(
      repository as unknown as TripDestinationRepository,
      access as unknown as TripAccessService,
      events as unknown as TripEventPublisher,
    );
  });

  describe('findAll', () => {
    it('scopes the page to the caller and turns page and limit into a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 3, limit: 15 }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        user.id,
        { tripId: undefined },
      );
    });

    it('falls back to the default window when the query is empty', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({}, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
        { tripId: undefined },
      );
    });

    it('lists one trip only after checking the caller can read it', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ tripId }, user);

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
        { tripId },
      );
    });

    it('answers 404 for a trip the caller has no access to', async () => {
      access.assertCanRead.mockRejectedValue(new NotFoundException());

      await expect(service.findAll({ tripId }, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findAll).not.toHaveBeenCalled();
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
    it('returns the mapped response after checking read access', async () => {
      repository.findById.mockResolvedValue(entity());

      const result = await service.findOne(base.id, user);

      expect(result.id).toBe(base.id);
      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, user.id);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('hides the record from someone with no access to the trip', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertCanRead.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('checks the assertCanEdit permission on the trip, then forwards the payload', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        { tripId, destinationCatalogId: base.destinationCatalogId },
        user,
      );

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tripId }),
      );
    });

    it('does not create when the caller lacks permission', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create(
          { tripId, destinationCatalogId: base.destinationCatalogId },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing record after checking the assertCanEdit permission', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {}, user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.update).toHaveBeenCalledWith(base.id, {});
    });

    it('does not touch the repository when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not update when the caller lacks permission', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing record after checking the assertCanEdit permission', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('does not delete when the caller lacks permission', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('date rules', () => {
    const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

    beforeEach(() => {
      repository.findTripDates.mockResolvedValue({
        startDate: day('2026-07-01'),
        endDate: day('2026-07-15'),
      });
      repository.create.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());
    });

    const create = (arrival?: Date, departure?: Date) =>
      service.create(
        {
          tripId,
          destinationCatalogId: base.destinationCatalogId,
          arrival,
          departure,
        },
        user,
      );

    it('creates a destination inside the trip dates', async () => {
      await create(day('2026-07-02'), day('2026-07-04'));

      expect(repository.findTripDates).toHaveBeenCalledWith(tripId);
      expect(repository.create).toHaveBeenCalled();
    });

    it('rejects a departure before the arrival with 422', async () => {
      await expect(
        create(day('2026-07-05'), day('2026-07-04')),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects dates outside the trip with 422', async () => {
      await expect(create(day('2026-08-01'))).rejects.toMatchObject({
        response: {
          message: [
            'arrival must be within the trip dates (2026-07-01 to 2026-07-15)',
          ],
        },
      });
    });

    it('checks an update against the dates already stored', async () => {
      repository.findById.mockResolvedValue(
        entity({ arrival: day('2026-07-05'), departure: day('2026-07-08') }),
      );

      await expect(
        service.update(base.id, { departure: day('2026-07-03') }, user),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('accepts an update that keeps the destination consistent', async () => {
      repository.findById.mockResolvedValue(
        entity({ arrival: day('2026-07-05'), departure: day('2026-07-08') }),
      );

      await service.update(base.id, { departure: day('2026-07-10') }, user);

      expect(repository.update).toHaveBeenCalled();
    });

    it('does not check the dates when the caller may not edit the trip', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(
        create(day('2026-07-05'), day('2026-07-04')),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findTripDates).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    const first = entity({ id: '11111111-1111-4111-8111-aaaaaaaaaaaa' });
    const second = entity({ id: '22222222-2222-4222-8222-bbbbbbbbbbbb' });

    beforeEach(() => {
      repository.findByTrip.mockResolvedValue([first, second]);
      repository.reorder.mockResolvedValue([second, first]);
    });

    it('checks the caller may edit the trip, then rewrites the order', async () => {
      const result = await service.reorder(
        tripId,
        { destinationIds: [second.id, first.id] },
        user,
      );

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.reorder).toHaveBeenCalledWith(tripId, [
        second.id,
        first.id,
      ]);
      expect(result.map((item) => item.id)).toEqual([second.id, first.id]);
    });

    it('does nothing for a viewer', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(
        service.reorder(
          tripId,
          { destinationIds: [first.id, second.id] },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.reorder).not.toHaveBeenCalled();
    });

    it.each([
      ['a destination is missing', [first.id]],
      ['a destination is repeated', [first.id, first.id]],
      ['an id from another trip is mixed in', [first.id, 'not-in-this-trip']],
      ['there are extra ids', [first.id, second.id, 'extra']],
    ])('rejects the request when %s', async (_name, destinationIds) => {
      await expect(
        service.reorder(tripId, { destinationIds }, user),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.reorder).not.toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('announces a destination that is added', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        { tripId, destinationCatalogId: base.destinationCatalogId },
        user,
      );

      expect(events.publish).toHaveBeenCalledWith({
        type: 'DESTINATION_ADDED',
        tripId,
        actorId: user.id,
        subjectId: base.id,
      });
    });

    it('announces an edit and a removal', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.update(base.id, { description: 'x' }, user);
      await service.remove(base.id, user);

      expect(events.publish).toHaveBeenNthCalledWith(1, {
        type: 'DESTINATION_UPDATED',
        tripId: base.tripId,
        actorId: user.id,
        subjectId: base.id,
      });
      expect(events.publish).toHaveBeenNthCalledWith(2, {
        type: 'DESTINATION_REMOVED',
        tripId: base.tripId,
        actorId: user.id,
        subjectId: base.id,
      });
    });

    it('announces a new itinerary order as an edit', async () => {
      const first = entity({ id: '11111111-1111-4111-8111-aaaaaaaaaaaa' });
      repository.findByTrip.mockResolvedValue([first]);
      repository.reorder.mockResolvedValue([first]);

      await service.reorder(tripId, { destinationIds: [first.id] }, user);

      expect(events.publish).toHaveBeenCalledWith({
        type: 'DESTINATION_UPDATED',
        tripId,
        actorId: user.id,
        details: { action: 'reordered' },
      });
    });

    it('says nothing when the caller may not edit the trip', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create(
          { tripId, destinationCatalogId: base.destinationCatalogId },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(events.publish).not.toHaveBeenCalled();
    });
  });
});
