import { assertAmount, assertCurrency, convert } from './currency.js';
import { ExpenseError } from './errors.js';
import { sharesOf } from './allocation.js';
import { planTransfers } from './settlement.js';
import type {
  Balance,
  ExchangeRates,
  Expense,
  Ledger,
  ParticipantId,
  Settlement,
  Summary,
} from './types.js';

/** An empty ledger whose balances are kept in `currency`. */
export function createLedger(currency: string): Ledger {
  assertCurrency(currency);

  return { currency, expenses: [], settlements: [] };
}

function assertParticipant(participant: ParticipantId): void {
  if (typeof participant !== 'string' || participant.trim() === '') {
    throw new ExpenseError(
      'invalid_participant',
      'A participant id must be a non-empty string',
    );
  }
}

/**
 * Records an expense and returns a **new** ledger (the old one is untouched).
 * Everything is validated up front — amount, currency, payer, split, a rate to
 * the ledger currency — so a ledger never holds an expense it cannot summarize.
 */
export function addExpense(
  ledger: Ledger,
  expense: Expense,
  rates?: ExchangeRates,
): Ledger {
  assertParticipant(expense.payer);
  assertCurrency(expense.amount.currency);
  assertAmount(expense.amount.amount);

  if (ledger.expenses.some(({ id }) => id === expense.id)) {
    throw new ExpenseError(
      'duplicate_expense',
      `There is already an expense "${expense.id}"`,
    );
  }

  // Splitting happens in the ledger currency, so check that it works now.
  sharesOf(convert(expense.amount, ledger.currency, rates), expense.split);

  return { ...ledger, expenses: [...ledger.expenses, expense] };
}

/**
 * Records that `from` paid `to` (all or part of what they owed) and returns a
 * new ledger. A settlement moves money between two different people.
 */
export function settleBalance(
  ledger: Ledger,
  settlement: Settlement,
  rates?: ExchangeRates,
): Ledger {
  assertParticipant(settlement.from);
  assertParticipant(settlement.to);
  assertCurrency(settlement.amount.currency);
  assertAmount(settlement.amount.amount);

  if (settlement.from === settlement.to) {
    throw new ExpenseError(
      'invalid_settlement',
      'Someone cannot settle a balance with themselves',
    );
  }
  // Fail now if it cannot be expressed in the ledger currency.
  convert(settlement.amount, ledger.currency, rates);

  return { ...ledger, settlements: [...ledger.settlements, settlement] };
}

/**
 * Who paid what, who owes what and how to even it out. Every amount is in
 * the ledger currency (minor units) and the balances always add up to zero.
 */
export function calculateSummary(
  ledger: Ledger,
  rates?: ExchangeRates,
): Summary {
  const books = new Map<ParticipantId, Omit<Balance, 'participant' | 'net'>>();
  const book = (participant: ParticipantId) => {
    let entry = books.get(participant);
    if (!entry) {
      entry = { paid: 0, owed: 0, settled: 0 };
      books.set(participant, entry);
    }
    return entry;
  };

  let total = 0;

  for (const expense of ledger.expenses) {
    const amount = convert(expense.amount, ledger.currency, rates);
    total += amount;
    book(expense.payer).paid += amount;

    for (const { participant, amount: share } of sharesOf(
      amount,
      expense.split,
    )) {
      book(participant).owed += share;
    }
  }

  for (const settlement of ledger.settlements) {
    const amount = convert(settlement.amount, ledger.currency, rates);
    book(settlement.from).settled += amount;
    book(settlement.to).settled -= amount;
  }

  const balances: Balance[] = [...books.entries()]
    .map(([participant, { paid, owed, settled }]) => ({
      participant,
      paid,
      owed,
      settled,
      net: paid - owed + settled,
    }))
    .sort((a, b) => a.participant.localeCompare(b.participant));

  return {
    currency: ledger.currency,
    total,
    balances,
    transfers: planTransfers(balances),
  };
}
