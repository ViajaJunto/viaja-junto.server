import { describe, expect, it } from 'vitest';
import { ExpenseError, type Split } from '../../../shared/expenses/index.js';
import {
  assertValidExpense,
  involvedParticipants,
  summarizeTripExpenses,
  toLedgerExpense,
  type ExpenseInput,
} from './trip-expense-ledger.js';
import type { TripExpense } from './trip-expense.entity.js';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof ExpenseError ? error.code : 'other';
  }
  return null;
};

const input = (overrides: Partial<ExpenseInput> = {}): ExpenseInput => ({
  tripId: 't',
  payerId: 'ana',
  amount: 9000,
  currency: 'BRL',
  exchangeRate: null,
  description: null,
  spentOn: null,
  split: { type: 'equal', participants: ['ana', 'bia', 'caio'] },
  ...overrides,
});

const stored = (
  id: string,
  overrides: Partial<ExpenseInput> = {},
): TripExpense => ({
  ...input(overrides),
  id,
  createdBy: 'ana',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
});

describe('toLedgerExpense', () => {
  it('keeps an expense already in the trip currency as it is', () => {
    expect(toLedgerExpense({ ...input(), id: 'e' }, 'BRL')).toEqual({
      id: 'e',
      payer: 'ana',
      amount: { amount: 9000, currency: 'BRL' },
      split: input().split,
      description: undefined,
    });
  });

  it('converts a foreign expense with its own rate', () => {
    const ledger = toLedgerExpense(
      {
        ...input({ amount: 1000, currency: 'EUR', exchangeRate: 5.5 }),
        id: 'e',
      },
      'BRL',
    );

    expect(ledger.amount).toEqual({ amount: 5500, currency: 'BRL' });
  });

  it('turns exact shares of a foreign expense into proportional ones, so they still add up', () => {
    const split: Split = {
      type: 'exact',
      shares: [
        { participant: 'ana', amount: 333 },
        { participant: 'bia', amount: 667 },
        { participant: 'caio', amount: 0 },
      ],
    };

    const ledger = toLedgerExpense(
      {
        ...input({ amount: 1000, currency: 'EUR', exchangeRate: 5.5, split }),
        id: 'e',
      },
      'BRL',
    );

    expect(ledger.split).toEqual({
      type: 'proportional',
      weights: [
        { participant: 'ana', weight: 333 },
        { participant: 'bia', weight: 667 },
      ],
    });
  });

  it('keeps exact shares as they are when the currency is the trip currency', () => {
    const split: Split = {
      type: 'exact',
      shares: [
        { participant: 'ana', amount: 4000 },
        { participant: 'bia', amount: 5000 },
      ],
    };

    expect(toLedgerExpense({ ...input({ split }), id: 'e' }, 'BRL').split).toBe(
      split,
    );
  });
});

describe('assertValidExpense', () => {
  it('accepts an ordinary expense', () => {
    expect(() => assertValidExpense(input(), 'BRL')).not.toThrow();
  });

  it('accepts a foreign expense that states its rate', () => {
    expect(() =>
      assertValidExpense(input({ currency: 'EUR', exchangeRate: 5.5 }), 'BRL'),
    ).not.toThrow();
  });

  it('requires a rate for a foreign expense', () => {
    expect(
      codeOf(() => assertValidExpense(input({ currency: 'EUR' }), 'BRL')),
    ).toBe('missing_exchange_rate');
  });

  it('refuses a rate on an expense that is already in the trip currency', () => {
    expect(
      codeOf(() => assertValidExpense(input({ exchangeRate: 5.5 }), 'BRL')),
    ).toBe('missing_exchange_rate');
  });

  it.each([
    ['a zero amount', { amount: 0 }, 'invalid_amount'],
    ['a blank payer', { payerId: '' }, 'invalid_participant'],
    [
      'shares that do not add up',
      {
        split: {
          type: 'exact',
          shares: [{ participant: 'ana', amount: 1 }],
        } as Split,
      },
      'invalid_split',
    ],
    [
      'a repeated participant',
      { split: { type: 'equal', participants: ['ana', 'ana'] } as Split },
      'invalid_split',
    ],
  ])('rejects %s', (_name, overrides, code) => {
    expect(codeOf(() => assertValidExpense(input(overrides), 'BRL'))).toBe(
      code,
    );
  });
});

describe('summarizeTripExpenses', () => {
  it('is empty without expenses', () => {
    expect(summarizeTripExpenses([], 'BRL')).toEqual({
      currency: 'BRL',
      total: 0,
      balances: [],
      transfers: [],
    });
  });

  it('works out who owes whom', () => {
    const summary = summarizeTripExpenses([stored('e1')], 'BRL');

    expect(summary.transfers).toEqual([
      { from: 'bia', to: 'ana', amount: 3000 },
      { from: 'caio', to: 'ana', amount: 3000 },
    ]);
  });

  it('settles expenses in different currencies, each at its own rate', () => {
    const summary = summarizeTripExpenses(
      [
        stored('e1', {
          amount: 1000,
          currency: 'EUR',
          exchangeRate: 5.5,
          split: { type: 'equal', participants: ['ana', 'bia'] },
        }),
        stored('e2', {
          amount: 1000,
          currency: 'EUR',
          exchangeRate: 6,
          payerId: 'bia',
          split: { type: 'equal', participants: ['ana', 'bia'] },
        }),
      ],
      'BRL',
    );

    // ana paid 55.00, bia paid 60.00, each owes half of 115.00 = 57.50.
    expect(summary.total).toBe(11500);
    expect(
      Object.fromEntries(summary.balances.map((b) => [b.participant, b.net])),
    ).toEqual({
      ana: -250,
      bia: 250,
    });
    expect(summary.transfers).toEqual([
      { from: 'ana', to: 'bia', amount: 250 },
    ]);
  });

  it('adds up to zero however the expenses are split', () => {
    const summary = summarizeTripExpenses(
      [
        stored('e1', {
          amount: 1001,
          split: { type: 'equal', participants: ['ana', 'bia', 'caio'] },
        }),
        stored('e2', {
          amount: 5000,
          payerId: 'bia',
          split: {
            type: 'proportional',
            weights: [
              { participant: 'ana', weight: 2 },
              { participant: 'caio', weight: 3 },
            ],
          },
        }),
      ],
      'BRL',
    );

    expect(summary.balances.reduce((sum, { net }) => sum + net, 0)).toBe(0);
  });
});

describe('involvedParticipants', () => {
  it('lists the payer and the people in an equal split, once each', () => {
    expect(involvedParticipants(input())).toEqual(['ana', 'bia', 'caio']);
  });

  it('includes a payer who is not in the split', () => {
    expect(
      involvedParticipants(
        input({
          payerId: 'zeca',
          split: { type: 'equal', participants: ['ana'] },
        }),
      ),
    ).toEqual(['zeca', 'ana']);
  });

  it('reads exact and proportional splits too', () => {
    expect(
      involvedParticipants(
        input({
          split: {
            type: 'exact',
            shares: [{ participant: 'bia', amount: 9000 }],
          },
        }),
      ),
    ).toEqual(['ana', 'bia']);
    expect(
      involvedParticipants(
        input({
          split: {
            type: 'proportional',
            weights: [{ participant: 'caio', weight: 1 }],
          },
        }),
      ),
    ).toEqual(['ana', 'caio']);
  });
});
