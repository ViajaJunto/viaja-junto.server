import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import type { Split } from '../../../../shared/expenses/index.js';
import { CreateTripExpenseDto } from './create-trip-expense.dto.js';
import { ExpenseSplitDto } from './expense-split.dto.js';

const id = (n: number) =>
  `${n}`.repeat(8) + '-1111-4111-8111-' + `${n}`.repeat(12);
const [ana, bia] = [id(1), id(2)];

const body = (overrides: Record<string, unknown> = {}) => ({
  tripId: id(3),
  payerId: ana,
  amount: 9000,
  split: { type: 'equal', participants: [ana, bia] },
  ...overrides,
});
const errorsOf = async (overrides: Record<string, unknown> = {}) =>
  validate(plainToInstance(CreateTripExpenseDto, body(overrides)), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('CreateTripExpenseDto', () => {
  it('accepts an equal split', async () => {
    expect(await errorsOf()).toHaveLength(0);
  });

  it('accepts exact and proportional splits', async () => {
    expect(
      await errorsOf({
        split: {
          type: 'exact',
          shares: [
            { participant: ana, amount: 4000 },
            { participant: bia, amount: 5000 },
          ],
        },
      }),
    ).toHaveLength(0);
    expect(
      await errorsOf({
        split: {
          type: 'proportional',
          weights: [
            { participant: ana, weight: 2.5 },
            { participant: bia, weight: 1 },
          ],
        },
      }),
    ).toHaveLength(0);
  });

  it('accepts a foreign currency with a rate, upper-casing the code', async () => {
    const dto = plainToInstance(
      CreateTripExpenseDto,
      body({ currency: 'eur', exchangeRate: 5.5 }),
    );

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.currency).toBe('EUR');
  });

  it.each([
    ['a zero amount', { amount: 0 }],
    ['a fractional amount', { amount: 10.5 }],
    ['an amount above the limit', { amount: 2_000_000_001 }],
    ['a payer that is not a UUID', { payerId: 'ana' }],
    ['an invalid currency', { currency: 'XYZW' }],
    ['a zero exchange rate', { currency: 'EUR', exchangeRate: 0 }],
    ['a negative exchange rate', { currency: 'EUR', exchangeRate: -1 }],
    ['a description that is too long', { description: 'x'.repeat(501) }],
    ['no split', { split: undefined }],
    ['an unknown split type', { split: { type: 'random' } }],
    [
      'an equal split with nobody',
      { split: { type: 'equal', participants: [] } },
    ],
    [
      'an equal split with a repeated person',
      { split: { type: 'equal', participants: [ana, ana] } },
    ],
    [
      'an equal split with a non-UUID',
      { split: { type: 'equal', participants: ['ana'] } },
    ],
    ['an exact split without shares', { split: { type: 'exact' } }],
    [
      'a negative exact share',
      { split: { type: 'exact', shares: [{ participant: ana, amount: -1 }] } },
    ],
    [
      'a zero weight',
      {
        split: {
          type: 'proportional',
          weights: [{ participant: ana, weight: 0 }],
        },
      },
    ],
    [
      'a proportional split without weights',
      { split: { type: 'proportional' } },
    ],
    ['an unknown property', { surprise: true }],
  ])('rejects %s', async (_name, overrides) => {
    expect(await errorsOf(overrides)).not.toHaveLength(0);
  });
});

describe('ExpenseSplitDto mapping', () => {
  const splits: Split[] = [
    { type: 'equal', participants: [ana, bia] },
    { type: 'exact', shares: [{ participant: ana, amount: 100 }] },
    { type: 'proportional', weights: [{ participant: ana, weight: 1 }] },
  ];

  it.each(splits)('round-trips a %o split', (split) => {
    const dto = ExpenseSplitDto.fromSplit(split);

    expect(ExpenseSplitDto.toSplit(dto)).toEqual(split);
  });

  it('carries only the field that goes with the type', () => {
    expect(
      Object.keys(
        ExpenseSplitDto.fromSplit({ type: 'equal', participants: [ana] }),
      ),
    ).toEqual(['type', 'participants']);
  });
});
