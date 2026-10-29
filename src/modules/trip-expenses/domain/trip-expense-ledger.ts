// Adapts trip expenses to the shared expenses library. Pure: no framework, no ORM.
import {
  addExpense,
  calculateSummary,
  convert,
  createLedger,
  ExpenseError,
  type Expense,
  type Split,
  type Summary,
} from '../../../shared/expenses/index.js';
import type { TripExpense } from './trip-expense.entity.js';

/** The shape the validations need: a stored expense without its bookkeeping. */
export type ExpenseInput = Omit<TripExpense, 'id' | 'createdBy' | 'createdAt'>;

/**
 * Converts one expense to the trip currency with **its own** rate: two
 * expenses in euros may have been paid at different rates, so the library's
 * one-rate-per-pair `ExchangeRates` is not the right tool here.
 *
 * An `exact` split is stated in the original currency, and converting each
 * share separately would break the sum. It becomes a proportional split with
 * the shares as weights instead, which always adds up to the converted amount.
 */
export function toLedgerExpense(
  expense: ExpenseInput & { id: string },
  tripCurrency: string,
): Expense {
  if (expense.currency === tripCurrency) {
    return {
      id: expense.id,
      payer: expense.payerId,
      amount: { amount: expense.amount, currency: tripCurrency },
      split: expense.split,
      description: expense.description ?? undefined,
    };
  }

  const amount = convert(
    { amount: expense.amount, currency: expense.currency },
    tripCurrency,
    { rate: () => expense.exchangeRate ?? undefined },
  );

  return {
    id: expense.id,
    payer: expense.payerId,
    amount: { amount, currency: tripCurrency },
    split: convertSplit(expense.split),
    description: expense.description ?? undefined,
  };
}

function convertSplit(split: Split): Split {
  if (split.type !== 'exact') return split;

  return {
    type: 'proportional',
    weights: split.shares
      .filter(({ amount }) => amount > 0)
      .map(({ participant, amount }) => ({ participant, weight: amount })),
  };
}

/** Everything that must hold for an expense to be recorded; throws `ExpenseError`. */
export function assertValidExpense(
  expense: ExpenseInput,
  tripCurrency: string,
): void {
  if (expense.currency === tripCurrency) {
    if (expense.exchangeRate !== null) {
      throw new ExpenseError(
        'missing_exchange_rate',
        `The expense is already in ${tripCurrency}: leave the exchange rate out`,
      );
    }
  } else if (expense.exchangeRate === null) {
    throw new ExpenseError(
      'missing_exchange_rate',
      `The expense is in ${expense.currency} but the trip is in ${tripCurrency}: say the exchange rate`,
    );
  }

  // The library validates the amount, the currency, the payer and the split.
  addExpense(
    createLedger(tripCurrency),
    toLedgerExpense({ ...expense, id: 'candidate' }, tripCurrency),
  );
}

/** Who owes whom on a trip, from all of its expenses. */
export function summarizeTripExpenses(
  expenses: TripExpense[],
  tripCurrency: string,
): Summary {
  let ledger = createLedger(tripCurrency);

  for (const expense of expenses) {
    ledger = addExpense(ledger, toLedgerExpense(expense, tripCurrency));
  }

  return calculateSummary(ledger);
}

/** The people an expense involves: the payer and everyone in the split. */
export function involvedParticipants(expense: ExpenseInput): string[] {
  const split = expense.split;
  const inSplit =
    split.type === 'equal'
      ? split.participants
      : split.type === 'exact'
        ? split.shares.map(({ participant }) => participant)
        : split.weights.map(({ participant }) => participant);

  return [...new Set([expense.payerId, ...inSplit])];
}
