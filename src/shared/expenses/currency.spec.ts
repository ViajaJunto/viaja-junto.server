import { describe, expect, it } from 'vitest';
import { assertCurrency, convert, minorUnitDigits, money } from './currency.js';
import { ExpenseError } from './errors.js';

const rates = (table: Record<string, number>) => ({
  rate: (from: string, to: string) => table[`${from}>${to}`],
});

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as ExpenseError).code;
  }
  return null;
};

describe('assertCurrency', () => {
  it.each(['BRL', 'USD', 'EUR', 'JPY', 'KWD'])('accepts %s', (code) => {
    expect(() => assertCurrency(code)).not.toThrow();
  });

  it.each(['brl', 'BR', 'BRLL', 'XYZ1', '', 'R$', '€€€'])(
    'rejects %j',
    (code) => {
      expect(codeOf(() => assertCurrency(code))).toBe('invalid_currency');
    },
  );
});

describe('minorUnitDigits', () => {
  it.each([
    ['BRL', 2],
    ['USD', 2],
    ['EUR', 2],
    ['JPY', 0],
    ['KRW', 0],
    ['KWD', 3],
  ])('%s has %d digits', (currency, digits) => {
    expect(minorUnitDigits(currency)).toBe(digits);
  });
});

describe('money', () => {
  it('builds a validated amount', () => {
    expect(money(1999, 'BRL')).toEqual({ amount: 1999, currency: 'BRL' });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60])(
    'rejects the amount %s',
    (amount) => {
      expect(codeOf(() => money(amount, 'BRL'))).toBe('invalid_amount');
    },
  );

  it('rejects an unknown currency', () => {
    expect(codeOf(() => money(100, 'bad'))).toBe('invalid_currency');
  });
});

describe('convert', () => {
  it('leaves an amount alone when the currency is the target', () => {
    expect(convert({ amount: 1234, currency: 'BRL' }, 'BRL')).toBe(1234);
  });

  it('converts between currencies with the same number of digits', () => {
    // 10.00 EUR at 5.5 = 55.00 BRL.
    expect(
      convert(
        { amount: 1000, currency: 'EUR' },
        'BRL',
        rates({ 'EUR>BRL': 5.5 }),
      ),
    ).toBe(5500);
  });

  it('accounts for currencies without cents', () => {
    // 1000 JPY at 0.035 = 35.00 BRL = 3500 cents.
    expect(
      convert(
        { amount: 1000, currency: 'JPY' },
        'BRL',
        rates({ 'JPY>BRL': 0.035 }),
      ),
    ).toBe(3500);
    // 35.00 BRL at 28 = 980 JPY.
    expect(
      convert(
        { amount: 3500, currency: 'BRL' },
        'JPY',
        rates({ 'BRL>JPY': 28 }),
      ),
    ).toBe(980);
  });

  it('accounts for currencies with three digits', () => {
    // 1.000 KWD at 16 = 16.00 BRL.
    expect(
      convert(
        { amount: 1000, currency: 'KWD' },
        'BRL',
        rates({ 'KWD>BRL': 16 }),
      ),
    ).toBe(1600);
  });

  it('rounds to the nearest minor unit, halves up', () => {
    // 0.01 EUR at 5.5 = 0.055 BRL → 5.5 cents → 6.
    expect(
      convert({ amount: 1, currency: 'EUR' }, 'BRL', rates({ 'EUR>BRL': 5.5 })),
    ).toBe(6);
    // 0.01 EUR at 5.4 = 5.4 cents → 5.
    expect(
      convert({ amount: 1, currency: 'EUR' }, 'BRL', rates({ 'EUR>BRL': 5.4 })),
    ).toBe(5);
  });

  it.each([
    ['no rates at all', undefined],
    ['no rate for the pair', rates({})],
    ['a zero rate', rates({ 'EUR>BRL': 0 })],
    ['a negative rate', rates({ 'EUR>BRL': -5 })],
    ['a rate that is not a number', rates({ 'EUR>BRL': Number.NaN })],
  ])('fails loudly with %s', (_name, table) => {
    expect(
      codeOf(() => convert({ amount: 100, currency: 'EUR' }, 'BRL', table)),
    ).toBe('missing_exchange_rate');
  });

  it('does not use the inverse of a rate it was not given', () => {
    expect(
      codeOf(() =>
        convert(
          { amount: 100, currency: 'BRL' },
          'EUR',
          rates({ 'EUR>BRL': 5.5 }),
        ),
      ),
    ).toBe('missing_exchange_rate');
  });
});
