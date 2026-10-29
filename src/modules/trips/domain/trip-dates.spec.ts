import { describe, expect, it } from 'vitest';
import { validateTripDates } from './trip-dates.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('validateTripDates', () => {
  it('rejects an end date earlier than the start date', () => {
    expect(
      validateTripDates({
        startDate: day('2026-07-10'),
        endDate: day('2026-07-01'),
      }),
    ).toEqual(['endDate must not be earlier than startDate']);
  });

  it.each([
    ['a one-day trip', day('2026-07-10'), day('2026-07-10')],
    ['an ordinary range', day('2026-07-01'), day('2026-07-15')],
    ['only a start', day('2026-07-01'), undefined],
    ['only an end', undefined, day('2026-07-15')],
    ['no dates', undefined, null],
  ])('accepts %s', (_name, startDate, endDate) => {
    expect(validateTripDates({ startDate, endDate })).toEqual([]);
  });
});
