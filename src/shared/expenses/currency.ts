import { ExpenseError } from './errors.js';
import type { ExchangeRates, Money } from './types.js';

const CODE = /^[A-Z]{3}$/;

/** Throws unless `code` is three upper-case letters that ICU knows as a currency. */
export function assertCurrency(code: string): void {
  if (!CODE.test(code) || !isKnownCurrency(code)) {
    throw new ExpenseError(
      'invalid_currency',
      `"${code}" is not an ISO 4217 currency code`,
    );
  }
}

function isKnownCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

/** Digits after the decimal point: 2 for BRL, 0 for JPY, 3 for KWD. */
export function minorUnitDigits(currency: string): number {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits as number;
}

/** A validated amount in minor units. */
export function money(amount: number, currency: string): Money {
  assertCurrency(currency);
  assertAmount(amount);

  return { amount, currency };
}

export function assertAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ExpenseError(
      'invalid_amount',
      `An amount must be a positive whole number of minor units, got ${amount}`,
    );
  }
}

/**
 * Converts to another currency, rounding to the nearest minor unit (halves
 * up). Same currency: untouched. A missing rate is an error, never a guess.
 */
export function convert(
  value: Money,
  to: string,
  rates?: ExchangeRates,
): number {
  if (value.currency === to) return value.amount;

  const rate = rates?.rate(value.currency, to);
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) {
    throw new ExpenseError(
      'missing_exchange_rate',
      `No exchange rate from ${value.currency} to ${to}`,
    );
  }

  const major = value.amount / 10 ** minorUnitDigits(value.currency);

  return Math.round(major * rate * 10 ** minorUnitDigits(to));
}
