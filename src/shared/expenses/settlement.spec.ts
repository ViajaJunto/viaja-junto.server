import { describe, expect, it } from 'vitest';
import { planTransfers } from './settlement.js';
import { seededRandom } from './test-helpers.js';

const nets = (table: Record<string, number>) =>
  Object.entries(table).map(([participant, net]) => ({ participant, net }));

/** Applies the transfers to the nets; a correct plan leaves everyone at zero. */
const afterPaying = (
  table: Record<string, number>,
  transfers: { from: string; to: string; amount: number }[],
) => {
  const result = { ...table };
  for (const { from, to, amount } of transfers) {
    result[from] += amount;
    result[to] -= amount;
  }
  return result;
};

describe('planTransfers', () => {
  it('needs nothing when everyone is even', () => {
    expect(planTransfers(nets({ a: 0, b: 0 }))).toEqual([]);
    expect(planTransfers([])).toEqual([]);
  });

  it('has the debtor pay the creditor', () => {
    expect(planTransfers(nets({ a: 500, b: -500 }))).toEqual([
      { from: 'b', to: 'a', amount: 500 },
    ]);
  });

  it('pays each creditor from the debtors, biggest first', () => {
    const table = { ana: 3000, bia: -1000, caio: -2000 };

    expect(planTransfers(nets(table))).toEqual([
      { from: 'caio', to: 'ana', amount: 2000 },
      { from: 'bia', to: 'ana', amount: 1000 },
    ]);
  });

  it('settles one debtor across several creditors', () => {
    const table = { a: 700, b: 300, c: -1000 };
    const transfers = planTransfers(nets(table));

    expect(transfers).toEqual([
      { from: 'c', to: 'a', amount: 700 },
      { from: 'c', to: 'b', amount: 300 },
    ]);
    expect(afterPaying(table, transfers)).toEqual({ a: 0, b: 0, c: 0 });
  });

  it('cancels exact matches first, saving payments', () => {
    // Greedy alone would need 3 payments; matching 400↔400 and 600↔600 needs 2.
    const table = { a: 400, b: 600, c: -600, d: -400 };
    const transfers = planTransfers(nets(table));

    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual([
      { from: 'c', to: 'b', amount: 600 },
      { from: 'd', to: 'a', amount: 400 },
    ]);
  });

  it('never asks for more than one payment fewer than the people involved', () => {
    const table = { a: 100, b: 200, c: -150, d: -50, e: -100 };

    expect(planTransfers(nets(table)).length).toBeLessThanOrEqual(4);
  });

  it('gives the same plan whatever order the people come in', () => {
    const table = { a: 250, b: 250, c: -300, d: -200 };
    const forward = planTransfers(nets(table));
    const backward = planTransfers(nets(table).reverse());

    expect(backward).toEqual(forward);
  });

  it('settles every balance to zero, in positive whole amounts (fuzz)', () => {
    const random = seededRandom(2026);

    for (let run = 0; run < 1000; run++) {
      const people = 2 + Math.floor(random() * 7);
      const table: Record<string, number> = {};
      let sum = 0;
      for (let i = 0; i < people - 1; i++) {
        const value = Math.floor(random() * 20001) - 10000;
        table[`p${i}`] = value;
        sum += value;
      }
      table[`p${people - 1}`] = -sum; // the nets of a ledger add up to zero

      const transfers = planTransfers(nets(table));
      const settled = afterPaying(table, transfers);

      expect(Object.values(settled).every((value) => value === 0)).toBe(true);
      expect(
        transfers.every(
          ({ amount, from, to }) =>
            amount > 0 && Number.isInteger(amount) && from !== to,
        ),
      ).toBe(true);
      const involved = Object.values(table).filter(
        (value) => value !== 0,
      ).length;
      expect(transfers.length).toBeLessThanOrEqual(Math.max(involved - 1, 0));
    }
  });
});
