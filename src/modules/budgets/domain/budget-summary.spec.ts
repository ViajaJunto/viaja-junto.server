import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TYPES,
  summarizeBudget,
  type PaidExpense,
  type PlannedActivity,
} from './budget-summary.js';

const activity = (
  type: PlannedActivity['type'],
  expectedCost: number | null,
): PlannedActivity => ({ type, expectedCost });

const summarize = (
  totalValue: number | null,
  activities: PlannedActivity[],
  currency = 'BRL',
  expenses: PaidExpense[] = [],
) => summarizeBudget({ currency, totalValue, activities, expenses });

describe('summarizeBudget', () => {
  it('sums the expected cost and subtracts it from the budget', () => {
    const summary = summarize(1000, [
      activity('FOOD', 120.5),
      activity('TOUR', 300),
    ]);

    expect(summary).toMatchObject({
      totalValue: 1000,
      planned: 420.5,
      remaining: 579.5,
      overBudget: false,
      activityCount: 2,
      unpricedActivities: 0,
    });
  });

  it('carries the currency of the trip', () => {
    expect(summarize(100, [], 'EUR').currency).toBe('EUR');
  });

  it('groups consumption by activity type, always listing every type', () => {
    const { byCategory } = summarize(1000, [
      activity('FOOD', 50),
      activity('FOOD', 25.25),
      activity('LODGING', 400),
    ]);

    expect(byCategory.map((category) => category.type)).toEqual([
      ...ACTIVITY_TYPES,
    ]);
    expect(byCategory.find((c) => c.type === 'FOOD')).toEqual({
      type: 'FOOD',
      planned: 75.25,
      count: 2,
    });
    expect(byCategory.find((c) => c.type === 'TOUR')).toEqual({
      type: 'TOUR',
      planned: 0,
      count: 0,
    });
  });

  it('flags a plan that exceeds the budget and reports a negative balance', () => {
    const summary = summarize(100, [
      activity('TOUR', 80),
      activity('FOOD', 45),
    ]);

    expect(summary.overBudget).toBe(true);
    expect(summary.remaining).toBe(-25);
  });

  it('is not over budget when the plan matches the budget exactly', () => {
    const summary = summarize(100, [activity('TOUR', 100)]);

    expect(summary.overBudget).toBe(false);
    expect(summary.remaining).toBe(0);
  });

  describe('activities without a cost', () => {
    it('weigh nothing but are counted', () => {
      const summary = summarize(100, [
        activity('TOUR', 40),
        activity('FOOD', null),
        activity('OTHER', null),
      ]);

      expect(summary.planned).toBe(40);
      expect(summary.activityCount).toBe(3);
      expect(summary.unpricedActivities).toBe(2);
      expect(summary.byCategory.find((c) => c.type === 'FOOD')).toEqual({
        type: 'FOOD',
        planned: 0,
        count: 1,
      });
    });

    it('differ from an activity that costs 0', () => {
      const summary = summarize(100, [activity('FOOD', 0)]);

      expect(summary.unpricedActivities).toBe(0);
    });
  });

  describe('a trip without a budget', () => {
    it('still reports what is planned, with no total and no balance', () => {
      const summary = summarize(null, [activity('TOUR', 60)]);

      expect(summary).toMatchObject({
        totalValue: null,
        planned: 60,
        remaining: null,
        overBudget: false,
      });
    });
  });

  it('handles a trip with no activities', () => {
    expect(summarize(500, [])).toMatchObject({
      planned: 0,
      remaining: 500,
      overBudget: false,
      activityCount: 0,
      unpricedActivities: 0,
    });
  });

  it('adds money without floating point noise', () => {
    const summary = summarize(1, [
      activity('FOOD', 0.1),
      activity('FOOD', 0.2),
    ]);

    expect(summary.planned).toBe(0.3);
    expect(summary.remaining).toBe(0.7);
  });

  describe('what was actually spent', () => {
    const paid = (
      amount: number,
      currency = 'BRL',
      exchangeRate: number | null = null,
    ): PaidExpense => ({ amount, currency, exchangeRate });

    it('is zero when nothing was spent', () => {
      expect(summarize(100, [])).toMatchObject({
        spent: 0,
        remainingAfterSpent: 100,
      });
    });

    it('adds up the expenses and subtracts them from the budget', () => {
      const summary = summarize(1000, [], 'BRL', [paid(12050), paid(3000)]);

      expect(summary.spent).toBe(150.5);
      expect(summary.remainingAfterSpent).toBe(849.5);
    });

    it('converts each expense with the rate it was paid at', () => {
      // 10.00 EUR at 5.5 = 55.00 BRL and 10.00 EUR at 6 = 60.00 BRL.
      const summary = summarize(1000, [], 'BRL', [
        paid(1000, 'EUR', 5.5),
        paid(1000, 'EUR', 6),
      ]);

      expect(summary.spent).toBe(115);
    });

    it('goes negative when more was spent than budgeted', () => {
      const summary = summarize(100, [], 'BRL', [paid(15000)]);

      expect(summary.remainingAfterSpent).toBe(-50);
    });

    it('is independent of what was planned', () => {
      const summary = summarize(1000, [activity('TOUR', 400)], 'BRL', [
        paid(10000),
      ]);

      expect(summary).toMatchObject({ planned: 400, spent: 100 });
    });

    it('has no remaining balance without a budget', () => {
      const summary = summarize(null, [], 'BRL', [paid(5000)]);

      expect(summary).toMatchObject({ spent: 50, remainingAfterSpent: null });
    });

    it('fails loudly if a foreign expense has no rate', () => {
      expect(() =>
        summarize(100, [], 'BRL', [paid(1000, 'EUR', null)]),
      ).toThrow(/exchange rate/i);
    });
  });
});
