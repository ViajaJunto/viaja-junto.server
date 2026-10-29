/**
 * Shared expenses: split costs, keep balances, work out who owes whom.
 *
 * A framework-free library — no Nest, no Prisma, no network. It is imported
 * only through this file so it can be moved into its own package later.
 *
 * - Money is an integer in minor units plus an ISO 4217 code.
 * - Splits: equal, exact amounts, or proportional to weights; rounding is the
 *   largest remainder method, so shares always add up to the expense.
 * - Currencies are converted through caller-supplied `ExchangeRates`.
 * - Every operation returns a new ledger; nothing is mutated.
 */
export {
  addExpense,
  calculateSummary,
  createLedger,
  settleBalance,
} from './ledger.js';
export { convert, minorUnitDigits, money } from './currency.js';
export { allocate, sharesOf, type Share } from './allocation.js';
export { planTransfers } from './settlement.js';
export { ExpenseError, type ExpenseErrorCode } from './errors.js';
export type {
  Balance,
  ExchangeRates,
  Expense,
  Ledger,
  Money,
  ParticipantId,
  Settlement,
  Split,
  Summary,
  Transfer,
} from './types.js';
