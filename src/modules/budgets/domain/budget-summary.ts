// Pure budget arithmetic. No framework and no ORM dependency.

export const ACTIVITY_TYPES = [
  'TOUR',
  'FOOD',
  'LODGING',
  'TRANSPORT',
  'OTHER',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** What the summary needs to know about one planned activity. */
export interface PlannedActivity {
  type: ActivityType;
  /** Null when no cost was entered for the activity. */
  expectedCost: number | null;
}

export interface CategoryConsumption {
  type: ActivityType;
  planned: number;
  count: number;
}

export interface BudgetSummary {
  currency: string;
  /** Null when the trip has no budget yet. */
  totalValue: number | null;
  /** Sum of the expected cost of the trip's activities. */
  planned: number;
  /** `totalValue - planned`; negative when over budget, null without a budget. */
  remaining: number | null;
  /** `true` when what is planned exceeds the total budget. */
  overBudget: boolean;
  activityCount: number;
  /** Activities that have no expected cost, so they weigh 0 in `planned`. */
  unpricedActivities: number;
  /** Every activity type, in a fixed order, even when nothing is planned in it. */
  byCategory: CategoryConsumption[];
}

const toCents = (amount: number): number => Math.round(amount * 100);
const fromCents = (cents: number): number => cents / 100;

/**
 * Totals are summed in integer cents, so adding 0.1 + 0.2 never produces
 * 0.30000000000000004 in an amount shown to the user.
 */
export function summarizeBudget(input: {
  currency: string;
  totalValue: number | null;
  activities: PlannedActivity[];
}): BudgetSummary {
  const centsByType = new Map<ActivityType, number>();
  const countByType = new Map<ActivityType, number>();
  let plannedCents = 0;
  let unpriced = 0;

  for (const { type, expectedCost } of input.activities) {
    countByType.set(type, (countByType.get(type) ?? 0) + 1);

    if (expectedCost === null) {
      unpriced += 1;
      continue;
    }

    const cents = toCents(expectedCost);
    plannedCents += cents;
    centsByType.set(type, (centsByType.get(type) ?? 0) + cents);
  }

  const totalCents =
    input.totalValue === null ? null : toCents(input.totalValue);

  return {
    currency: input.currency,
    totalValue: input.totalValue,
    planned: fromCents(plannedCents),
    remaining:
      totalCents === null ? null : fromCents(totalCents - plannedCents),
    overBudget: totalCents !== null && plannedCents > totalCents,
    activityCount: input.activities.length,
    unpricedActivities: unpriced,
    byCategory: ACTIVITY_TYPES.map((type) => ({
      type,
      planned: fromCents(centsByType.get(type) ?? 0),
      count: countByType.get(type) ?? 0,
    })),
  };
}
