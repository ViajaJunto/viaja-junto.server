import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '../domain/trip.entity.js';
import type { TripRepository } from '../domain/trip.repository.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { TripMembersService } from '../../trip-members/application/trip-members.service.js';
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
  inviteCode: 'K7M2QX9P',
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
  let members: { addMember: ReturnType<typeof vi.fn> };
  let service: TripsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findByInviteCode: vi.fn(),
    };
    access = {
      assertCanRead: vi.fn().mockResolvedValue('CREATOR'),
      assertCanEdit: vi.fn().mockResolvedValue('CREATOR'),
      assertIsCreator: vi.fn().mockResolvedValue('CREATOR'),
      tripIdOfDestination: vi.fn(),
      tripIdOfActivity: vi.fn(),
    };
    members = { addMember: vi.fn().mockResolvedValue({}) };
    service = new TripsService(
      repository as unknown as TripRepository,
      access as unknown as TripAccessService,
      members as unknown as TripMembersService,
    );
  });

  describe('findAll', () => {
    it('lists only the trips of the caller, in a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 3, limit: 15 }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        user.id,
        { status: undefined },
      );
    });

    it('falls back to the default window when the query is empty', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({}, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
        { status: undefined },
      );
    });

    it('filters by planning stage', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ status: 'CONFIRMED' }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
        { status: 'CONFIRMED' },
      );
    });

    it('returns the role the caller holds on each trip', async () => {
      repository.findAll.mockResolvedValue({
        items: [
          { ...entity(), role: 'OWNER' },
          { ...entity({ id: 'other' }), role: 'VIEWER' },
        ],
        total: 2,
      });

      const result = await service.findAll({}, user);

      expect(result.data.map((trip) => trip.role)).toEqual(['OWNER', 'VIEWER']);
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({
        items: [{ ...entity(), role: 'OWNER' }],
        total: 41,
      });

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

    it.each([
      ['CREATOR', 'OWNER'],
      ['EDITOR', 'EDITOR'],
      ['VIEWER', 'VIEWER'],
    ])('reports the %s access as the %s role', async (granted, role) => {
      repository.findById.mockResolvedValue(entity());
      access.assertCanRead.mockResolvedValue(granted);

      const result = await service.findOne(base.id, user);

      expect(result.role).toBe(role);
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
      repository.findById.mockResolvedValue(entity());
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

  describe('date rules', () => {
    const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

    it('rejects a trip that ends before it starts with 422', async () => {
      await expect(
        service.create(
          {
            name: 'Eurotrip',
            startDate: day('2026-07-10'),
            endDate: day('2026-07-01'),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { message: ['endDate must not be earlier than startDate'] },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('checks an update against the dates already stored', async () => {
      repository.findById.mockResolvedValue(
        entity({ startDate: day('2026-07-10'), endDate: day('2026-07-20') }),
      );

      await expect(
        service.update(base.id, { endDate: day('2026-07-05') }, user),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('accepts an update that moves both dates together', async () => {
      repository.findById.mockResolvedValue(
        entity({ startDate: day('2026-07-10'), endDate: day('2026-07-20') }),
      );
      repository.update.mockResolvedValue(entity());

      await service.update(
        base.id,
        { startDate: day('2026-08-01'), endDate: day('2026-08-10') },
        user,
      );

      expect(repository.update).toHaveBeenCalled();
    });

    it('does not load the trip when the caller is not the creator', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(
        service.update(base.id, { endDate: day('2026-07-05') }, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe('invite code', () => {
    it('gives every new trip a well-formed invite code', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create({ name: 'Eurotrip 2026' }, user);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inviteCode: expect.stringMatching(/^[A-HJKMNP-Z2-9]{8}$/),
        }),
      );
    });

    it('does not expose the code in the trip response', async () => {
      repository.findById.mockResolvedValue(entity());

      const result = await service.findOne(base.id, user);

      expect(result).not.toHaveProperty('inviteCode');
    });

    it('shows the code to the creator', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(service.getInviteCode(base.id, user)).resolves.toEqual({
        code: 'K7M2QX9P',
      });
      expect(access.assertIsCreator).toHaveBeenCalledWith(base.id, user.id);
    });

    it('hides the code from everyone but the creator', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(service.getInviteCode(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('regenerates the code, so the previous one stops working', async () => {
      repository.update.mockImplementation((_id, data) =>
        Promise.resolve(entity({ inviteCode: data.inviteCode })),
      );

      const { code } = await service.regenerateInviteCode(base.id, user);

      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        inviteCode: code,
      });
    });

    it('lets only the creator regenerate', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenException());

      await expect(
        service.regenerateInviteCode(base.id, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('join', () => {
    const joiner = {
      id: '99999999-9999-4999-8999-999999999999',
      email: 'eve@example.com',
    };

    it('adds the caller as a VIEWER and returns the trip', async () => {
      repository.findByInviteCode.mockResolvedValue(entity());

      const result = await service.join({ code: 'K7M2QX9P' }, joiner);

      expect(members.addMember).toHaveBeenCalledWith(
        base.id,
        joiner.id,
        'VIEWER',
      );
      expect(result).toMatchObject({ id: base.id, role: 'VIEWER' });
    });

    it('accepts the code in any case and with stray spaces', async () => {
      repository.findByInviteCode.mockResolvedValue(entity());

      await service.join({ code: '  k7m2qx9p ' }, joiner);

      expect(repository.findByInviteCode).toHaveBeenCalledWith('K7M2QX9P');
    });

    it('answers 404 for an unknown code', async () => {
      repository.findByInviteCode.mockResolvedValue(null);

      await expect(
        service.join({ code: 'AAAAAAAA' }, joiner),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(members.addMember).not.toHaveBeenCalled();
    });

    it('answers 409 when the creator tries to join their own trip', async () => {
      repository.findByInviteCode.mockResolvedValue(entity());

      await expect(
        service.join({ code: 'K7M2QX9P' }, user),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(members.addMember).not.toHaveBeenCalled();
    });

    it('lets a conflict from an existing membership through', async () => {
      repository.findByInviteCode.mockResolvedValue(entity());
      members.addMember.mockRejectedValue(new ConflictException());

      await expect(
        service.join({ code: 'K7M2QX9P' }, joiner),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
