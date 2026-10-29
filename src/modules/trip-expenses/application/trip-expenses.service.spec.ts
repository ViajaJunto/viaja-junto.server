import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import type { TripExpense } from '../domain/trip-expense.entity.js';
import type { TripExpenseRepository } from '../domain/trip-expense.repository.js';
import { TripExpensesService } from './trip-expenses.service.js';

const ana = '11111111-1111-4111-8111-111111111111';
const bia = '22222222-2222-4222-8222-222222222222';
const caio = '33333333-3333-4333-8333-333333333333';
const stranger = '99999999-9999-4999-8999-999999999999';
const tripId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const user = { id: ana, email: 'ana@example.com' };

const base: TripExpense = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  tripId,
  payerId: ana,
  amount: 9000,
  currency: 'BRL',
  exchangeRate: null,
  description: 'Jantar',
  spentOn: null,
  split: { type: 'equal', participants: [ana, bia, caio] },
  createdBy: ana,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
};
const expense = (overrides: Partial<TripExpense> = {}): TripExpense => ({
  ...base,
  ...overrides,
});

const createDto = (overrides: Record<string, unknown> = {}) => ({
  tripId,
  payerId: ana,
  amount: 9000,
  split: { type: 'equal' as const, participants: [ana, bia, caio] },
  ...overrides,
});

type RepoMock = {
  [K in keyof TripExpenseRepository]: ReturnType<typeof vi.fn>;
};
type AccessMock = {
  [K in keyof TripAccessService]: ReturnType<typeof vi.fn>;
};

describe('TripExpensesService', () => {
  let repository: RepoMock;
  let access: AccessMock;
  let service: TripExpensesService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByTrip: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findTripCurrency: vi.fn().mockResolvedValue('BRL'),
      findTripPeople: vi.fn().mockResolvedValue([ana, bia, caio]),
    };
    access = {
      assertCanRead: vi.fn().mockResolvedValue('CREATOR'),
      assertCanEdit: vi.fn().mockResolvedValue('CREATOR'),
      assertIsCreator: vi.fn().mockResolvedValue('CREATOR'),
      tripIdOfDestination: vi.fn(),
      tripIdOfActivity: vi.fn(),
    };
    service = new TripExpensesService(
      repository as unknown as TripExpenseRepository,
      access as unknown as TripAccessService,
    );
  });

  describe('findAll', () => {
    it('lists the caller’s expenses in a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [expense()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 20, take: 20 },
        ana,
        {
          tripId: undefined,
        },
      );
      expect(result.meta).toMatchObject({ page: 2, total: 41, totalPages: 3 });
      expect(access.assertCanRead).not.toHaveBeenCalled();
    });

    it('checks access before filtering by trip', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ tripId }, user);

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, ana);
      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        ana,
        {
          tripId,
        },
      );
    });

    it('answers 404 for a trip the caller cannot see', async () => {
      access.assertCanRead.mockRejectedValue(new NotFoundException());

      await expect(service.findAll({ tripId }, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the expense to someone who can read its trip', async () => {
      repository.findById.mockResolvedValue(expense());

      const result = await service.findOne(base.id, user);

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, ana);
      expect(result).toMatchObject({ id: base.id, split: { type: 'equal' } });
    });

    it('answers 404 for an unknown expense', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('hides it from someone with no access to the trip', async () => {
      repository.findById.mockResolvedValue(expense());
      access.assertCanRead.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('records an expense in the trip currency by default, noting who recorded it', async () => {
      repository.create.mockResolvedValue(expense());

      await service.create(createDto({ description: 'Jantar' }), user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, ana);
      expect(repository.create).toHaveBeenCalledWith({
        tripId,
        payerId: ana,
        amount: 9000,
        currency: 'BRL',
        exchangeRate: null,
        description: 'Jantar',
        spentOn: null,
        split: { type: 'equal', participants: [ana, bia, caio] },
        createdBy: ana,
      });
    });

    it('does not let a viewer record anything', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(service.create(createDto(), user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('answers 404 when the trip does not exist', async () => {
      repository.findTripCurrency.mockResolvedValue(null);

      await expect(service.create(createDto(), user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('accepts an expense in another currency that states its rate', async () => {
      repository.create.mockResolvedValue(expense());

      await service.create(
        createDto({ currency: 'EUR', exchangeRate: 5.5 }),
        user,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'EUR', exchangeRate: 5.5 }),
      );
    });

    it.each([
      ['a foreign currency without a rate', { currency: 'EUR' }],
      ['a rate on an expense in the trip currency', { exchangeRate: 5.5 }],
      [
        'shares that do not add up',
        { split: { type: 'exact', shares: [{ participant: ana, amount: 1 }] } },
      ],
      ['a payer who is not on the trip', { payerId: stranger }],
      [
        'a split with someone who is not on the trip',
        { split: { type: 'equal', participants: [ana, stranger] } },
      ],
    ])('rejects %s with 422', async (_name, overrides) => {
      await expect(
        service.create(createDto(overrides), user),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('names who is not on the trip', async () => {
      await expect(
        service.create(createDto({ payerId: stranger }), user),
      ).rejects.toThrow(stranger);
    });

    it('explains the library’s rejections in the 422', async () => {
      await expect(
        service.create(createDto({ currency: 'EUR' }), user),
      ).rejects.toThrow(/exchange rate/i);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(expense());
      repository.update.mockResolvedValue(expense());
    });

    it('changes only what was sent and keeps the rest', async () => {
      await service.update(base.id, { description: 'Almoço' }, user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, ana);
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        payerId: ana,
        amount: 9000,
        currency: 'BRL',
        exchangeRate: null,
        description: 'Almoço',
        spentOn: null,
        split: base.split,
      });
    });

    it('checks the whole expense again: a new amount must still match exact shares', async () => {
      repository.findById.mockResolvedValue(
        expense({
          split: {
            type: 'exact',
            shares: [
              { participant: ana, amount: 4000 },
              { participant: bia, amount: 5000 },
            ],
          },
        }),
      );

      await expect(
        service.update(base.id, { amount: 10000 }, user),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('drops the stored rate when the expense moves to the trip currency', async () => {
      repository.findById.mockResolvedValue(
        expense({ currency: 'EUR', exchangeRate: 5.5 }),
      );

      await service.update(base.id, { currency: 'BRL' }, user);

      expect(repository.update).toHaveBeenCalledWith(
        base.id,
        expect.objectContaining({ currency: 'BRL', exchangeRate: null }),
      );
    });

    it('requires a rate when the expense moves to a foreign currency', async () => {
      await expect(
        service.update(base.id, { currency: 'EUR' }, user),
      ).rejects.toThrow(/exchange rate/i);
    });

    it('lets the rate change on its own', async () => {
      repository.findById.mockResolvedValue(
        expense({ currency: 'EUR', exchangeRate: 5.5 }),
      );

      await service.update(base.id, { exchangeRate: 6 }, user);

      expect(repository.update).toHaveBeenCalledWith(
        base.id,
        expect.objectContaining({ exchangeRate: 6 }),
      );
    });

    it('replaces the split when a new one is sent', async () => {
      await service.update(
        base.id,
        { split: { type: 'equal', participants: [ana, bia] } },
        user,
      );

      expect(repository.update).toHaveBeenCalledWith(
        base.id,
        expect.objectContaining({
          split: { type: 'equal', participants: [ana, bia] },
        }),
      );
    });

    it('does not let a viewer change anything', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(
        service.update(base.id, { description: 'x' }, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown expense', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update(base.id, { description: 'x' }, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes an expense for someone who may edit the trip', async () => {
      repository.findById.mockResolvedValue(expense());

      await service.remove(base.id, user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, ana);
      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete for a viewer', async () => {
      repository.findById.mockResolvedValue(expense());
      access.assertCanEdit.mockRejectedValue(new ForbiddenException());

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown expense', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('summarize', () => {
    it('works out who owes whom, in the trip currency', async () => {
      repository.findByTrip.mockResolvedValue([expense()]);

      const summary = await service.summarize(tripId, user);

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, ana);
      expect(summary.currency).toBe('BRL');
      expect(summary.transfers).toEqual([
        { from: bia, to: ana, amount: 3000 },
        { from: caio, to: ana, amount: 3000 },
      ]);
    });

    it('is empty for a trip without expenses', async () => {
      await expect(service.summarize(tripId, user)).resolves.toMatchObject({
        total: 0,
        balances: [],
        transfers: [],
      });
    });

    it('hides it from someone with no access', async () => {
      access.assertCanRead.mockRejectedValue(new NotFoundException());

      await expect(service.summarize(tripId, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findByTrip).not.toHaveBeenCalled();
    });

    it('answers 404 when the trip does not exist', async () => {
      repository.findTripCurrency.mockResolvedValue(null);

      await expect(service.summarize(tripId, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('turns a corrupt stored expense into a 422 instead of a 500', async () => {
      repository.findByTrip.mockResolvedValue([
        expense({ currency: 'EUR', exchangeRate: null }),
      ]);

      await expect(service.summarize(tripId, user)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });
});
