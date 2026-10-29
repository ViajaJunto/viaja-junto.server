import { ExpenseError } from './errors.js';
import type { ParticipantId, Split } from './types.js';

export interface Share {
  participant: ParticipantId;
  amount: number;
}

/**
 * Splits `total` (minor units) across `weights` with the **largest remainder
 * method**: everyone gets the whole part of their exact share, then the cents
 * left over go, one each, to those with the biggest fractional remainders.
 * Ties go to whoever is listed first, so the result is deterministic and the
 * shares always add up to `total` exactly.
 */
export function allocate(
  total: number,
  weights: { participant: ParticipantId; weight: number }[],
): Share[] {
  const weightSum = weights.reduce((sum, { weight }) => sum + weight, 0);

  const exact = weights.map(({ participant, weight }, index) => {
    const raw = (total * weight) / weightSum;

    return {
      participant,
      index,
      floor: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    };
  });

  let leftover = total - exact.reduce((sum, { floor }) => sum + floor, 0);

  // Not reachable through `sharesOf`, which validates first. It stops a caller
  // of `allocate` itself (NaN or infinite weights, an absurd amount) from
  // getting shares that quietly do not add up.
  if (!(leftover >= 0 && leftover <= weights.length)) {
    throw new ExpenseError(
      'invalid_split',
      'The amount cannot be split exactly with these weights',
    );
  }

  // Floating point can leave a remainder like 0.9999999999 or 1e-13; compare
  // with a tolerance so equal shares really tie.
  const byRemainder = [...exact].sort(
    (a, b) =>
      (Math.abs(b.remainder - a.remainder) < 1e-9
        ? 0
        : b.remainder - a.remainder) || a.index - b.index,
  );
  const extra = new Set<number>();
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    extra.add(index);
    leftover -= 1;
  }

  return exact.map(({ participant, floor, index }) => ({
    participant,
    amount: floor + (extra.has(index) ? 1 : 0),
  }));
}

/** Validates the split and turns it into the amount each person owes. */
export function sharesOf(total: number, split: Split): Share[] {
  switch (split.type) {
    case 'equal': {
      assertDistinct(split.participants.map((participant) => participant));
      return allocate(
        total,
        split.participants.map((participant) => ({ participant, weight: 1 })),
      );
    }
    case 'proportional': {
      assertDistinct(split.weights.map(({ participant }) => participant));
      for (const { participant, weight } of split.weights) {
        if (!Number.isFinite(weight) || weight <= 0) {
          throw new ExpenseError(
            'invalid_split',
            `The weight of "${participant}" must be a positive number`,
          );
        }
      }
      return allocate(total, split.weights);
    }
    case 'exact': {
      assertDistinct(split.shares.map(({ participant }) => participant));
      for (const { participant, amount } of split.shares) {
        if (!Number.isSafeInteger(amount) || amount < 0) {
          throw new ExpenseError(
            'invalid_split',
            `The share of "${participant}" must be a whole number of minor units, not negative`,
          );
        }
      }
      const sum = split.shares.reduce((acc, { amount }) => acc + amount, 0);
      if (sum !== total) {
        throw new ExpenseError(
          'invalid_split',
          `The shares add up to ${sum}, but the expense is ${total}`,
        );
      }
      return split.shares.map(({ participant, amount }) => ({
        participant,
        amount,
      }));
    }
  }
}

function assertDistinct(participants: ParticipantId[]): void {
  if (participants.length === 0) {
    throw new ExpenseError(
      'invalid_split',
      'A split needs at least one participant',
    );
  }
  for (const participant of participants) {
    if (typeof participant !== 'string' || participant.trim() === '') {
      throw new ExpenseError(
        'invalid_participant',
        'A participant id must be a non-empty string',
      );
    }
  }
  if (new Set(participants).size !== participants.length) {
    throw new ExpenseError(
      'invalid_split',
      'A participant appears more than once in the split',
    );
  }
}
