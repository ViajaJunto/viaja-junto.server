import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripMember } from '../domain/trip-member.entity.js';
import type { TripMemberRepository } from '../domain/trip-member.repository.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripMembersService } from './trip-members.service.js';

const base: TripMember = {
  id: '33333333-3333-4333-8333-333333333333',
  tripId: '22222222-2222-4222-8222-222222222222',
  userId: '11111111-1111-4111-8111-111111111111',
  permission: 'EDITOR',
  joinedAt: new Date('2026-03-15T09:10:00.000Z'),
};

const entity = (overrides: Partial<TripMember> = {}): TripMember => ({
  ...base,
  ...overrides,
});

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
};
const tripId = '22222222-2222-4222-8222-222222222222';

type RepoMock = {
  [K in keyof TripMemberRepository]: ReturnType<typeof vi.fn>;
};
type AccessMock = {
  [K in keyof TripAccessService]: ReturnType<typeof vi.fn>;
};

describe('TripMembersService', () => {
  let repository: RepoMock;
  let access: AccessMock;
  let service: TripMembersService;

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
      tripIdOfDestination: vi.fn().mockResolvedValue(tripId),
      tripIdOfActivity: vi.fn().mockResolvedValue(tripId),
    } as AccessMock;
    service = new TripMembersService(
      repository as unknown as TripMemberRepository,
      access as unknown as TripAccessService,
    );
  });

  describe('findAll', () => {
    it('scopes the page to the caller and turns page and limit into a skip/take window', async () => {
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
    it('checks the assertIsCreator permission on the trip, then forwards the payload', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        {
          tripId,
          userId: '99999999-9999-4999-8999-999999999999',
          permission: 'VIEWER',
        },
        user,
      );

      expect(access.assertIsCreator).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId,
          userId: '99999999-9999-4999-8999-999999999999',
          permission: 'VIEWER',
        }),
      );
    });

    it('does not create when the caller lacks permission', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create(
          {
            tripId,
            userId: '99999999-9999-4999-8999-999999999999',
            permission: 'VIEWER',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing record after checking the assertIsCreator permission', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {}, user);

      expect(access.assertIsCreator).toHaveBeenCalledWith(tripId, user.id);
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
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing record after checking the assertIsCreator permission', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(access.assertIsCreator).toHaveBeenCalledWith(tripId, user.id);
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
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  it('refuses to add the trip creator as a member', async () => {
    await expect(
      service.create({ tripId, userId: user.id, permission: 'VIEWER' }, user),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
