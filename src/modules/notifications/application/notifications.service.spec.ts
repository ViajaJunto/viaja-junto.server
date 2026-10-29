import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripEvent } from '../../../shared/events/trip-events.js';
import type { Notification } from '../domain/notification.entity.js';
import type { NotificationRepository } from '../domain/notification.repository.js';
import { NotificationsService } from './notifications.service.js';

const user = { id: 'bia', email: 'bia@example.com' };

const notification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  userId: 'bia',
  tripId: 't',
  actorId: 'ana',
  type: 'DESTINATION_ADDED',
  payload: { tripName: 'Eurotrip', actorName: 'Ana' },
  readAt: null,
  createdAt: new Date('2026-07-01T10:00:00.000Z'),
  ...overrides,
});

type RepoMock = {
  [K in keyof NotificationRepository]: ReturnType<typeof vi.fn>;
};

describe('NotificationsService', () => {
  let repository: RepoMock;
  let service: NotificationsService;

  beforeEach(() => {
    repository = {
      createMany: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn(),
      countUnread: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      findTripPeople: vi.fn().mockResolvedValue(['ana', 'bia', 'caio']),
      findNames: vi
        .fn()
        .mockResolvedValue({ tripName: 'Eurotrip', actorName: 'Ana' }),
    };
    service = new NotificationsService(
      repository as unknown as NotificationRepository,
    );
  });

  describe('notify', () => {
    const event: TripEvent = {
      type: 'DESTINATION_ADDED',
      tripId: 't',
      actorId: 'ana',
      subjectId: 'd1',
    };

    it('creates one notification for everyone on the trip except the actor', async () => {
      await service.notify(event);

      expect(repository.createMany).toHaveBeenCalledWith([
        {
          userId: 'bia',
          tripId: 't',
          actorId: 'ana',
          type: 'DESTINATION_ADDED',
          payload: { tripName: 'Eurotrip', actorName: 'Ana', subjectId: 'd1' },
        },
        {
          userId: 'caio',
          tripId: 't',
          actorId: 'ana',
          type: 'DESTINATION_ADDED',
          payload: { tripName: 'Eurotrip', actorName: 'Ana', subjectId: 'd1' },
        },
      ]);
    });

    it('includes a member who was just removed', async () => {
      repository.findTripPeople.mockResolvedValue(['ana', 'bia']);

      await service.notify({
        type: 'MEMBER_REMOVED',
        tripId: 't',
        actorId: 'ana',
        subjectId: 'dani',
        alsoNotify: ['dani'],
      });

      const created = repository.createMany.mock.calls[0][0] as {
        userId: string;
      }[];
      expect(created.map(({ userId }) => userId)).toEqual(['bia', 'dani']);
    });

    it('writes nothing when there is nobody to tell', async () => {
      repository.findTripPeople.mockResolvedValue(['ana']);

      await service.notify(event);

      expect(repository.createMany).not.toHaveBeenCalled();
      expect(repository.findNames).not.toHaveBeenCalled();
    });

    it('writes nothing for a trip that no longer exists', async () => {
      repository.findTripPeople.mockResolvedValue([]);

      await service.notify(event);

      expect(repository.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('maps the page and reports whether each is read', async () => {
      repository.findAll.mockResolvedValue({
        items: [
          notification(),
          notification({
            id: 'n2',
            readAt: new Date('2026-07-02T00:00:00.000Z'),
          }),
        ],
        total: 41,
      });

      const result = await service.findAll({ page: 2, limit: 20 }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 20, take: 20 },
        'bia',
      );
      expect(result.data.map(({ read }) => read)).toEqual([false, true]);
      expect(result.meta).toMatchObject({ page: 2, total: 41, totalPages: 3 });
    });

    it('uses the default window for an empty query', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({}, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        'bia',
      );
    });
  });

  it('counts the unread notifications of the caller', async () => {
    repository.countUnread.mockResolvedValue(3);

    await expect(service.unreadCount(user)).resolves.toEqual({ unread: 3 });
    expect(repository.countUnread).toHaveBeenCalledWith('bia');
  });

  describe('markRead', () => {
    it('marks one of the caller’s notifications', async () => {
      repository.markRead.mockResolvedValue(
        notification({ readAt: new Date('2026-07-02T00:00:00.000Z') }),
      );

      const result = await service.markRead('n1', user);

      expect(repository.markRead).toHaveBeenCalledWith('n1', 'bia');
      expect(result.read).toBe(true);
    });

    it('answers 404 for one that is not theirs, so its existence is not revealed', async () => {
      repository.markRead.mockResolvedValue(null);

      await expect(service.markRead('n1', user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('marks everything as read and says how many were unread', async () => {
    repository.markAllRead.mockResolvedValue(4);

    await expect(service.markAllRead(user)).resolves.toEqual({ updated: 4 });
    expect(repository.markAllRead).toHaveBeenCalledWith('bia');
  });
});
