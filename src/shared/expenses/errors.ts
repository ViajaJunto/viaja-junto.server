export type ExpenseErrorCode =
  | 'invalid_amount'
  | 'invalid_currency'
  | 'invalid_participant'
  | 'invalid_split'
  | 'duplicate_expense'
  | 'missing_exchange_rate'
  | 'invalid_settlement';

/**
 * Everything the library rejects. `code` is stable and meant for callers to
 * switch on (an HTTP layer maps them all to 422); `message` is for people.
 */
export class ExpenseError extends Error {
  constructor(
    readonly code: ExpenseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExpenseError';
  }
}
