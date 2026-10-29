import { describe, expect, it } from 'vitest';
import {
  endsBeforeStart,
  formatDay,
  isOutsideDayRange,
  isOutsideDays,
} from './date-range.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('endsBeforeStart', () => {
  it('flags an end earlier than the start', () => {
    expect(endsBeforeStart(day('2026-07-10'), day('2026-07-09'))).toBe(true);
  });

  it.each([
    ['equal days', day('2026-07-10'), day('2026-07-10')],
    ['an end after the start', day('2026-07-10'), day('2026-07-11')],
    ['no start', undefined, day('2026-07-01')],
    ['no end', day('2026-07-10'), null],
  ])('accepts %s', (_name, start, end) => {
    expect(endsBeforeStart(start, end)).toBe(false);
  });
});

describe('isOutsideDays', () => {
  const start = day('2026-07-01');
  const end = day('2026-07-15');

  it.each([
    ['before the start', day('2026-06-30'), true],
    ['after the end', day('2026-07-16'), true],
    ['on the first day', day('2026-07-01'), false],
    ['on the last day', day('2026-07-15'), false],
    ['in the middle', day('2026-07-08'), false],
  ])('%s', (_name, value, outside) => {
    expect(isOutsideDays(value, start, end)).toBe(outside);
  });

  it('has no limit on a side that is not set', () => {
    expect(isOutsideDays(day('2020-01-01'), null, end)).toBe(false);
    expect(isOutsideDays(day('2030-01-01'), start, undefined)).toBe(false);
  });

  it('accepts a missing value', () => {
    expect(isOutsideDays(undefined, start, end)).toBe(false);
  });
});

describe('isOutsideDayRange', () => {
  const start = day('2026-07-01');
  const end = day('2026-07-03');

  it.each([
    ['the start of the first day', '2026-07-01T00:00:00.000Z', false],
    ['the last millisecond of the last day', '2026-07-03T23:59:59.999Z', false],
    ['just before the first day', '2026-06-30T23:59:59.999Z', true],
    ['the next day after the last', '2026-07-04T00:00:00.000Z', true],
  ])('%s', (_name, instant, outside) => {
    expect(isOutsideDayRange(new Date(instant), start, end)).toBe(outside);
  });

  it('ignores a missing instant and open-ended ranges', () => {
    expect(isOutsideDayRange(null, start, end)).toBe(false);
    expect(isOutsideDayRange(new Date('2030-01-01'), start, null)).toBe(false);
    expect(isOutsideDayRange(new Date('2020-01-01'), null, end)).toBe(false);
  });
});

describe('formatDay', () => {
  it('prints the ISO calendar day', () => {
    expect(formatDay(day('2026-07-01'))).toBe('2026-07-01');
  });
});
