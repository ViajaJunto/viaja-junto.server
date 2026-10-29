export type ParticipantId = string;

/**
 * An amount of money in **minor units** (cents for BRL, whole yen for JPY),
 * always an integer, so no floating point ever touches a balance.
 */
export interface Money {
  amount: number;
  /** ISO 4217 code, upper-case. */
  currency: string;
}

/**
 * Units of `to` that one unit of `from` is worth (1 EUR = 5.5 BRL → rate 5.5),
 * in major units. The library never fetches rates: callers pass what they
 * know, so it runs offline and the numbers stay reproducible.
 */
export interface ExchangeRates {
  rate(from: string, to: string): number | undefined;
}

/** How an expense is shared among the people who benefit from it. */
export type Split =
  /** Everyone listed pays the same share; a leftover cent goes to the first ones listed. */
  | { type: 'equal'; participants: ParticipantId[] }
  /** Each person owes a stated amount (minor units); the amounts must add up to the expense. */
  | { type: 'exact'; shares: { participant: ParticipantId; amount: number }[] }
  /** Shares in proportion to weights (percentages, nights, head-count...). */
  | {
      type: 'proportional';
      weights: { participant: ParticipantId; weight: number }[];
    };

export interface Expense {
  id: string;
  /** Who paid up front. May or may not take part in the split. */
  payer: ParticipantId;
  amount: Money;
  split: Split;
  description?: string;
}

/** `from` paid `to` back (or part of what they owed). */
export interface Settlement {
  from: ParticipantId;
  to: ParticipantId;
  amount: Money;
}

/** Everything that happened in a group, in the currency its balances are kept in. */
export interface Ledger {
  /** The currency of every balance and transfer the summary reports. */
  currency: string;
  expenses: readonly Expense[];
  settlements: readonly Settlement[];
}

export interface Balance {
  participant: ParticipantId;
  /** What the person paid up front, in the ledger currency. */
  paid: number;
  /** What the person's share of every expense adds up to. */
  owed: number;
  /** Settlements the person made (`from`) minus the ones they received (`to`). */
  settled: number;
  /** `paid - owed + settled`: positive = is owed money, negative = owes money. */
  net: number;
}

/** A payment that would settle part of the group's debts. */
export interface Transfer {
  from: ParticipantId;
  to: ParticipantId;
  /** Minor units of the ledger currency, always positive. */
  amount: number;
}

export interface Summary {
  currency: string;
  /** Sum of every expense, in the ledger currency. */
  total: number;
  /** One per person who appears anywhere, sorted by participant id. */
  balances: Balance[];
  /** Payments that bring every balance to zero, biggest first. */
  transfers: Transfer[];
}
