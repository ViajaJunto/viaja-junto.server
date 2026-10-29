import { describe, expect, it } from 'vitest';
import type { ExpenseError } from './errors.js';
import {
  addExpense,
  calculateSummary,
  createLedger,
  money,
  settleBalance,
  type ExchangeRates,
  type Expense,
  type Ledger,
} from './index.js';
import { seededRandom } from './test-helpers.js';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as ExpenseError).code;
  }
  return null;
};

const rates: ExchangeRates = {
  rate: (from, to) =>
    (({ 'EUR>BRL': 5.5, 'JPY>BRL': 0.04 }) as Record<string, number>)[
      `${from}>${to}`
    ],
};

const dinner = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'dinner',
  payer: 'ana',
  amount: money(9000, 'BRL'),
  split: { type: 'equal', participants: ['ana', 'bia', 'caio'] },
  ...overrides,
});

const netsOf = (ledger: Ledger, ratesToUse?: ExchangeRates) =>
  Object.fromEntries(
    calculateSummary(ledger, ratesToUse).balances.map(
      ({ participant, net }) => [participant, net],
    ),
  );

describe('createLedger', () => {
  it('starts empty in the given currency', () => {
    expect(createLedger('BRL')).toEqual({
      currency: 'BRL',
      expenses: [],
      settlements: [],
    });
  });

  it('rejects an invalid currency', () => {
    expect(codeOf(() => createLedger('real'))).toBe('invalid_currency');
  });
});

describe('addExpense', () => {
  it('returns a new ledger and leaves the old one alone', () => {
    const empty = createLedger('BRL');

    const next = addExpense(empty, dinner());

    expect(next).not.toBe(empty);
    expect(empty.expenses).toHaveLength(0);
    expect(next.expenses).toHaveLength(1);
  });

  it('keeps expenses in the order they were added', () => {
    let ledger = createLedger('BRL');
    ledger = addExpense(ledger, dinner({ id: 'one' }));
    ledger = addExpense(ledger, dinner({ id: 'two' }));

    expect(ledger.expenses.map(({ id }) => id)).toEqual(['one', 'two']);
  });

  const rejected: [string, Expense, string][] = [
    ['a duplicate id', dinner(), 'duplicate_expense'],
    [
      'a zero amount',
      dinner({ id: 'x', amount: { amount: 0, currency: 'BRL' } }),
      'invalid_amount',
    ],
    [
      'a fractional amount',
      dinner({ id: 'x', amount: { amount: 10.5, currency: 'BRL' } }),
      'invalid_amount',
    ],
    [
      'an unknown currency',
      dinner({ id: 'x', amount: { amount: 100, currency: 'bad' } }),
      'invalid_currency',
    ],
    ['a blank payer', dinner({ id: 'x', payer: '' }), 'invalid_participant'],
    [
      'a split that does not add up',
      dinner({
        id: 'x',
        split: { type: 'exact', shares: [{ participant: 'a', amount: 1 }] },
      }),
      'invalid_split',
    ],
    [
      'a currency with no rate',
      dinner({ id: 'x', amount: money(100, 'USD') }),
      'missing_exchange_rate',
    ],
  ];

  it.each(rejected)('rejects %s', (_name, expense, code) => {
    const ledger = addExpense(createLedger('BRL'), dinner());

    expect(codeOf(() => addExpense(ledger, expense))).toBe(code);
  });

  it('does not change the ledger when an expense is rejected', () => {
    const ledger = addExpense(createLedger('BRL'), dinner());

    expect(
      codeOf(() => addExpense(ledger, dinner({ id: 'bad', payer: '' }))),
    ).not.toBeNull();
    expect(ledger.expenses).toHaveLength(1);
  });
});

describe('calculateSummary', () => {
  it('reports an empty group', () => {
    expect(calculateSummary(createLedger('BRL'))).toEqual({
      currency: 'BRL',
      total: 0,
      balances: [],
      transfers: [],
    });
  });

  it('works out who owes whom for a shared dinner', () => {
    const summary = calculateSummary(addExpense(createLedger('BRL'), dinner()));

    expect(summary.total).toBe(9000);
    expect(summary.balances).toEqual([
      { participant: 'ana', paid: 9000, owed: 3000, settled: 0, net: 6000 },
      { participant: 'bia', paid: 0, owed: 3000, settled: 0, net: -3000 },
      { participant: 'caio', paid: 0, owed: 3000, settled: 0, net: -3000 },
    ]);
    expect(summary.transfers).toEqual([
      { from: 'bia', to: 'ana', amount: 3000 },
      { from: 'caio', to: 'ana', amount: 3000 },
    ]);
  });

  it('handles a payer who is not part of the split', () => {
    const ledger = addExpense(
      createLedger('BRL'),
      dinner({ split: { type: 'equal', participants: ['bia', 'caio'] } }),
    );

    expect(netsOf(ledger)).toEqual({ ana: 9000, bia: -4500, caio: -4500 });
  });

  it('handles uneven (exact) and proportional shares together', () => {
    let ledger = createLedger('BRL');
    ledger = addExpense(
      ledger,
      dinner({
        id: 'taxi',
        amount: money(5000, 'BRL'),
        split: {
          type: 'exact',
          shares: [
            { participant: 'ana', amount: 1000 },
            { participant: 'bia', amount: 4000 },
          ],
        },
      }),
    );
    ledger = addExpense(
      ledger,
      dinner({
        id: 'hotel',
        payer: 'bia',
        amount: money(10000, 'BRL'),
        split: {
          type: 'proportional',
          weights: [
            { participant: 'ana', weight: 2 }, // two nights
            { participant: 'bia', weight: 3 }, // three nights
          ],
        },
      }),
    );

    expect(netsOf(ledger)).toEqual({
      ana: 5000 - 1000 - 4000,
      bia: -4000 + 10000 - 6000,
    });
  });

  it('spreads a leftover cent deterministically', () => {
    const ledger = addExpense(
      createLedger('BRL'),
      dinner({ amount: money(1000, 'BRL') }),
    );
    const { balances } = calculateSummary(ledger);

    expect(balances.map(({ owed }) => owed)).toEqual([334, 333, 333]);
  });

  it('shows someone who pays only for themselves as even', () => {
    const ledger = addExpense(
      createLedger('BRL'),
      dinner({
        payer: 'solo',
        split: { type: 'equal', participants: ['solo'] },
      }),
    );
    const summary = calculateSummary(ledger);

    expect(summary.balances[0].net).toBe(0);
    expect(summary.transfers).toEqual([]);
  });

  it('lists everyone who appears anywhere, sorted by id', () => {
    const ledger = addExpense(
      createLedger('BRL'),
      dinner({
        payer: 'zeca',
        split: { type: 'equal', participants: ['bia', 'ana'] },
      }),
    );

    expect(
      calculateSummary(ledger).balances.map(({ participant }) => participant),
    ).toEqual(['ana', 'bia', 'zeca']);
  });

  describe('with several currencies', () => {
    it('converts each expense to the ledger currency before splitting', () => {
      let ledger = createLedger('BRL');
      ledger = addExpense(
        ledger,
        dinner({ id: 'a', amount: money(1000, 'EUR') }),
        rates,
      );
      ledger = addExpense(
        ledger,
        dinner({ id: 'b', amount: money(5000, 'JPY'), payer: 'bia' }),
        rates,
      );

      const summary = calculateSummary(ledger, rates);

      // 10.00 EUR = 55.00 BRL; 5000 JPY = 200.00 BRL.
      expect(summary.total).toBe(5500 + 20000);
      expect(summary.balances.reduce((sum, { net }) => sum + net, 0)).toBe(0);
    });

    it('fails to summarize when a rate is missing', () => {
      const ledger = addExpense(
        createLedger('BRL'),
        dinner({ amount: money(1000, 'EUR') }),
        rates,
      );

      expect(codeOf(() => calculateSummary(ledger))).toBe(
        'missing_exchange_rate',
      );
    });
  });
});

describe('settleBalance', () => {
  const owed = () => addExpense(createLedger('BRL'), dinner());

  it('returns a new ledger and leaves the old one alone', () => {
    const before = owed();

    const after = settleBalance(before, {
      from: 'bia',
      to: 'ana',
      amount: money(3000, 'BRL'),
    });

    expect(before.settlements).toHaveLength(0);
    expect(after.settlements).toHaveLength(1);
  });

  it('clears a debt that is paid in full', () => {
    const ledger = settleBalance(owed(), {
      from: 'bia',
      to: 'ana',
      amount: money(3000, 'BRL'),
    });
    const summary = calculateSummary(ledger);

    expect(summary.transfers).toEqual([
      { from: 'caio', to: 'ana', amount: 3000 },
    ]);
    expect(netsOf(ledger)).toEqual({ ana: 3000, bia: 0, caio: -3000 });
  });

  it('leaves what remains when a debt is only partly paid', () => {
    const ledger = settleBalance(owed(), {
      from: 'bia',
      to: 'ana',
      amount: money(1000, 'BRL'),
    });

    expect(calculateSummary(ledger).transfers).toEqual([
      { from: 'caio', to: 'ana', amount: 3000 },
      { from: 'bia', to: 'ana', amount: 2000 },
    ]);
  });

  it('shows nothing left once everybody has paid', () => {
    let ledger = owed();
    ledger = settleBalance(ledger, {
      from: 'bia',
      to: 'ana',
      amount: money(3000, 'BRL'),
    });
    ledger = settleBalance(ledger, {
      from: 'caio',
      to: 'ana',
      amount: money(3000, 'BRL'),
    });

    expect(calculateSummary(ledger).transfers).toEqual([]);
    expect(Object.values(netsOf(ledger))).toEqual([0, 0, 0]);
  });

  it('flips the debt when someone overpays', () => {
    const ledger = settleBalance(owed(), {
      from: 'bia',
      to: 'ana',
      amount: money(5000, 'BRL'),
    });

    expect(netsOf(ledger)).toEqual({ ana: 1000, bia: 2000, caio: -3000 });
  });

  it('accepts a payment in another currency, converted at the given rate', () => {
    const ledger = settleBalance(
      owed(),
      { from: 'bia', to: 'ana', amount: money(1000, 'EUR') },
      rates,
    );

    expect(netsOf(ledger, rates).bia).toBe(-3000 + 5500);
  });

  const rejected: [string, Parameters<typeof settleBalance>[1], string][] = [
    [
      'paying yourself',
      { from: 'ana', to: 'ana', amount: money(100, 'BRL') },
      'invalid_settlement',
    ],
    [
      'a blank payer',
      { from: '', to: 'ana', amount: money(100, 'BRL') },
      'invalid_participant',
    ],
    [
      'a blank receiver',
      { from: 'ana', to: ' ', amount: money(100, 'BRL') },
      'invalid_participant',
    ],
    [
      'a zero amount',
      { from: 'bia', to: 'ana', amount: { amount: 0, currency: 'BRL' } },
      'invalid_amount',
    ],
    [
      'an unknown currency',
      { from: 'bia', to: 'ana', amount: { amount: 100, currency: 'x' } },
      'invalid_currency',
    ],
    [
      'a currency with no rate',
      { from: 'bia', to: 'ana', amount: money(100, 'USD') },
      'missing_exchange_rate',
    ],
  ];

  it.each(rejected)('rejects %s', (_name, settlement, code) => {
    expect(codeOf(() => settleBalance(owed(), settlement))).toBe(code);
  });
});

describe('invariants (fuzz)', () => {
  const people = ['ana', 'bia', 'caio', 'dani', 'edu', 'fabi'];

  it('keeps balances at zero and a settle-up plan that really settles everything', () => {
    const random = seededRandom(1234);
    const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

    for (let run = 0; run < 400; run++) {
      let ledger = createLedger('BRL');

      for (let i = 0; i < 1 + Math.floor(random() * 6); i++) {
        const group = people.filter(() => random() < 0.6);
        const participants = group.length > 0 ? group : [pick(people)];
        const kind = random();
        const amount = money(
          1 + Math.floor(random() * 500_000),
          random() < 0.3 ? 'EUR' : 'BRL',
        );
        ledger = addExpense(
          ledger,
          {
            id: `e${i}`,
            payer: pick(people),
            amount,
            split:
              kind < 0.5
                ? { type: 'equal', participants }
                : {
                    type: 'proportional',
                    weights: participants.map((participant) => ({
                      participant,
                      weight: 1 + Math.floor(random() * 5),
                    })),
                  },
          },
          rates,
        );
      }

      const summary = calculateSummary(ledger, rates);

      expect(summary.balances.reduce((sum, { net }) => sum + net, 0)).toBe(0);
      expect(summary.balances.reduce((sum, { paid }) => sum + paid, 0)).toBe(
        summary.total,
      );
      expect(summary.balances.reduce((sum, { owed }) => sum + owed, 0)).toBe(
        summary.total,
      );

      // Paying the suggested transfers must leave nobody owing anything.
      let settled = ledger;
      for (const { from, to, amount } of summary.transfers) {
        settled = settleBalance(settled, {
          from,
          to,
          amount: money(amount, 'BRL'),
        });
      }
      expect(
        calculateSummary(settled, rates).balances.every(({ net }) => net === 0),
      ).toBe(true);
      expect(calculateSummary(settled, rates).transfers).toEqual([]);
    }
  });
});
