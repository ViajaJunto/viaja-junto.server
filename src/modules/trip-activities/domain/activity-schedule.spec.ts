import { describe, expect, it } from 'vitest';
import { validateActivityDateTime } from './activity-schedule.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const stay = { arrival: day('2026-07-01'), departure: day('2026-07-03') };

describe('validateActivityDateTime', () => {
  it.each([
    ['before the arrival', '2026-06-30T23:00:00.000Z'],
    ['after the departure day', '2026-07-04T00:00:00.000Z'],
  ])('rejects an activity %s, naming the stay', (_name, instant) => {
    expect(validateActivityDateTime(new Date(instant), stay)).toEqual([
      'dateTime must be within the destination stay (2026-07-01 to 2026-07-03)',
    ]);
  });

  it.each([
    ['the arrival day', '2026-07-01T08:00:00.000Z'],
    ['the whole departure day', '2026-07-03T23:30:00.000Z'],
  ])('accepts an activity on %s', (_name, instant) => {
    expect(validateActivityDateTime(new Date(instant), stay)).toEqual([]);
  });

  it('accepts an activity without a date', () => {
    expect(validateActivityDateTime(undefined, stay)).toEqual([]);
  });

  it('accepts anything when the destination has no dates', () => {
    expect(validateActivityDateTime(new Date('2030-01-01'), {})).toEqual([]);
  });

  it('describes a stay with only an arrival', () => {
    expect(
      validateActivityDateTime(new Date('2026-06-01'), {
        arrival: day('2026-07-01'),
      }),
    ).toEqual([
      'dateTime must be within the destination stay (from 2026-07-01)',
    ]);
  });

  it('describes a stay with only a departure', () => {
    expect(
      validateActivityDateTime(new Date('2026-08-01'), {
        departure: day('2026-07-03'),
      }),
    ).toEqual([
      'dateTime must be within the destination stay (until 2026-07-03)',
    ]);
  });
});
