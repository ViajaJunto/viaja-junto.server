import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TYPES,
  summarizeBudget,
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
) => summarizeBudget({ currency, totalValue, activities });

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
});
