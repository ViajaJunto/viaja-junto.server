import { describe, expect, it } from 'vitest';
import { allocate, sharesOf } from './allocation.js';
import type { ExpenseError } from './errors.js';
import type { Split } from './types.js';
import { seededRandom } from './test-helpers.js';

const amounts = (shares: { amount: number }[]) =>
  shares.map(({ amount }) => amount);
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as ExpenseError).code;
  }
  return null;
};
const even = (...ids: string[]) =>
  ids.map((participant) => ({ participant, weight: 1 }));

describe('allocate (largest remainder)', () => {
  it('splits evenly when it divides exactly', () => {
    expect(amounts(allocate(900, even('a', 'b', 'c')))).toEqual([
      300, 300, 300,
    ]);
  });

  it('gives the leftover cents to the first people listed', () => {
    expect(amounts(allocate(100, even('a', 'b', 'c')))).toEqual([34, 33, 33]);
    expect(amounts(allocate(101, even('a', 'b', 'c')))).toEqual([34, 34, 33]);
    expect(amounts(allocate(2, even('a', 'b', 'c')))).toEqual([1, 1, 0]);
  });

  it('is deterministic: the same input always gives the same shares', () => {
    const first = allocate(1000, even('x', 'y', 'z'));
    const second = allocate(1000, even('x', 'y', 'z'));

    expect(first).toEqual(second);
  });

  it('gives one person everything', () => {
    expect(allocate(777, even('solo'))).toEqual([
      { participant: 'solo', amount: 777 },
    ]);
  });

  it('shares in proportion to the weights', () => {
    expect(
      amounts(
        allocate(1000, [
          { participant: 'a', weight: 50 },
          { participant: 'b', weight: 30 },
          { participant: 'c', weight: 20 },
        ]),
      ),
    ).toEqual([500, 300, 200]);
  });

  it('hands the leftover to the biggest remainder, not just the first person', () => {
    // 1001 split 50/30/20: exact 500.5, 300.3, 200.2 → the extra cent goes to a (.5).
    expect(
      amounts(
        allocate(1001, [
          { participant: 'a', weight: 50 },
          { participant: 'b', weight: 30 },
          { participant: 'c', weight: 20 },
        ]),
      ),
    ).toEqual([501, 300, 200]);
    // 100 split 1/1/2: exact 25, 25, 50, no remainder at all.
    expect(
      amounts(
        allocate(100, [
          { participant: 'a', weight: 1 },
          { participant: 'b', weight: 1 },
          { participant: 'c', weight: 2 },
        ]),
      ),
    ).toEqual([25, 25, 50]);
    // 10 split 1/2: exact 3.33, 6.67 → the extra cent goes to b (.67 > .33).
    expect(
      amounts(
        allocate(10, [
          { participant: 'a', weight: 1 },
          { participant: 'b', weight: 2 },
        ]),
      ),
    ).toEqual([3, 7]);
  });

  it('accepts fractional weights such as 33.3 / 33.3 / 33.4 percent', () => {
    const shares = allocate(1000, [
      { participant: 'a', weight: 33.3 },
      { participant: 'b', weight: 33.3 },
      { participant: 'c', weight: 33.4 },
    ]);

    expect(amounts(shares)).toEqual([333, 333, 334]);
  });

  it('can give a person nothing when the amount is tiny', () => {
    expect(amounts(allocate(1, even('a', 'b', 'c')))).toEqual([1, 0, 0]);
  });

  it('always adds up to the total, whatever the weights (fuzz)', () => {
    const random = seededRandom(42);

    for (let run = 0; run < 2000; run++) {
      const people = 1 + Math.floor(random() * 8);
      const weights = Array.from({ length: people }, (_, i) => ({
        participant: `p${i}`,
        weight:
          random() < 0.5 ? 1 + Math.floor(random() * 10) : 0.1 + random() * 10,
      }));
      const total = 1 + Math.floor(random() * 1_000_000);

      const shares = allocate(total, weights);

      expect(shares.reduce((sum, { amount }) => sum + amount, 0)).toBe(total);
      expect(
        shares.every(({ amount }) => Number.isInteger(amount) && amount >= 0),
      ).toBe(true);
    }
  });

  it('never gives anyone more than one cent off their exact share (fuzz)', () => {
    const random = seededRandom(7);

    for (let run = 0; run < 1000; run++) {
      const weights = Array.from(
        { length: 1 + Math.floor(random() * 6) },
        (_, i) => ({
          participant: `p${i}`,
          weight: 1 + Math.floor(random() * 20),
        }),
      );
      const total = 1 + Math.floor(random() * 100_000);
      const weightSum = weights.reduce((sum, { weight }) => sum + weight, 0);

      allocate(total, weights).forEach(({ amount }, i) => {
        expect(
          Math.abs(amount - (total * weights[i].weight) / weightSum),
        ).toBeLessThan(1);
      });
    }
  });

  it('still adds up exactly at the largest safe amount', () => {
    const total = Number.MAX_SAFE_INTEGER;
    const shares = allocate(total, even('a', 'b', 'c', 'd', 'e', 'f', 'g'));

    expect(shares.reduce((sum, { amount }) => sum + amount, 0)).toBe(total);
  });

  it.each([
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
  ])(
    'refuses %s weights instead of returning shares that do not add up',
    (_name, weight) => {
      expect(
        codeOf(() =>
          allocate(100, [
            { participant: 'a', weight },
            { participant: 'b', weight: 1 },
          ]),
        ),
      ).toBe('invalid_split');
    },
  );
});

describe('sharesOf', () => {
  it('splits equally', () => {
    expect(
      amounts(sharesOf(100, { type: 'equal', participants: ['a', 'b', 'c'] })),
    ).toEqual([34, 33, 33]);
  });

  it('splits proportionally', () => {
    expect(
      amounts(
        sharesOf(1000, {
          type: 'proportional',
          weights: [
            { participant: 'a', weight: 3 },
            { participant: 'b', weight: 1 },
          ],
        }),
      ),
    ).toEqual([750, 250]);
  });

  it('uses exact amounts as they are, uneven or with someone owing nothing', () => {
    expect(
      sharesOf(1000, {
        type: 'exact',
        shares: [
          { participant: 'a', amount: 700 },
          { participant: 'b', amount: 300 },
          { participant: 'c', amount: 0 },
        ],
      }),
    ).toEqual([
      { participant: 'a', amount: 700 },
      { participant: 'b', amount: 300 },
      { participant: 'c', amount: 0 },
    ]);
  });

  const invalid: [string, Split, string][] = [
    [
      'an equal split with nobody',
      { type: 'equal', participants: [] },
      'invalid_split',
    ],
    [
      'someone listed twice',
      { type: 'equal', participants: ['a', 'a'] },
      'invalid_split',
    ],
    [
      'a blank participant',
      { type: 'equal', participants: ['a', ' '] },
      'invalid_participant',
    ],
    [
      'a zero weight',
      { type: 'proportional', weights: [{ participant: 'a', weight: 0 }] },
      'invalid_split',
    ],
    [
      'a negative weight',
      { type: 'proportional', weights: [{ participant: 'a', weight: -1 }] },
      'invalid_split',
    ],
    [
      'a weight that is not a number',
      {
        type: 'proportional',
        weights: [{ participant: 'a', weight: Number.NaN }],
      },
      'invalid_split',
    ],
    [
      'exact shares that fall short',
      { type: 'exact', shares: [{ participant: 'a', amount: 900 }] },
      'invalid_split',
    ],
    [
      'exact shares that overshoot',
      {
        type: 'exact',
        shares: [
          { participant: 'a', amount: 600 },
          { participant: 'b', amount: 600 },
        ],
      },
      'invalid_split',
    ],
    [
      'a negative exact share',
      {
        type: 'exact',
        shares: [
          { participant: 'a', amount: 1100 },
          { participant: 'b', amount: -100 },
        ],
      },
      'invalid_split',
    ],
    [
      'a fractional exact share',
      {
        type: 'exact',
        shares: [
          { participant: 'a', amount: 500.5 },
          { participant: 'b', amount: 499.5 },
        ],
      },
      'invalid_split',
    ],
  ];

  it.each(invalid)('rejects %s', (_name, split, code) => {
    expect(codeOf(() => sharesOf(1000, split))).toBe(code);
  });
});
