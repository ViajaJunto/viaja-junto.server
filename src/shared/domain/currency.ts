// Currency rules shared by trips, budgets and (later) expenses.
// No framework and no ORM dependency.

/** ISO 4217 code used when a trip does not say otherwise. */
export const DEFAULT_CURRENCY = 'BRL';

/** Codes are stored and compared upper-case. */
export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}
