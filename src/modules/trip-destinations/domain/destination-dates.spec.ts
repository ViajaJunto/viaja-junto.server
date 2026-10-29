import { describe, expect, it } from 'vitest';
import { validateDestinationDates } from './destination-dates.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const trip = { startDate: day('2026-07-01'), endDate: day('2026-07-15') };

describe('validateDestinationDates', () => {
  it('rejects a departure earlier than the arrival', () => {
    expect(
      validateDestinationDates(
        { arrival: day('2026-07-05'), departure: day('2026-07-04') },
        trip,
      ),
    ).toEqual(['departure must not be earlier than arrival']);
  });

  it('rejects dates outside the trip, naming its dates', () => {
    expect(
      validateDestinationDates(
        { arrival: day('2026-06-30'), departure: day('2026-07-16') },
        trip,
      ),
    ).toEqual([
      'arrival must be within the trip dates (2026-07-01 to 2026-07-15)',
      'departure must be within the trip dates (2026-07-01 to 2026-07-15)',
    ]);
  });

  it('reports every violated rule at once', () => {
    expect(
      validateDestinationDates(
        { arrival: day('2026-07-20'), departure: day('2026-07-18') },
        trip,
      ),
    ).toHaveLength(3);
  });

  it.each([
    ['exactly the trip', { arrival: trip.startDate, departure: trip.endDate }],
    [
      'a stay inside',
      { arrival: day('2026-07-03'), departure: day('2026-07-05') },
    ],
    ['one day', { arrival: day('2026-07-03'), departure: day('2026-07-03') }],
    ['no dates', {}],
    ['only an arrival', { arrival: day('2026-07-03') }],
  ])('accepts %s', (_name, dates) => {
    expect(validateDestinationDates(dates, trip)).toEqual([]);
  });

  describe('when the trip has no dates', () => {
    it('only checks that the destination dates are ordered', () => {
      expect(
        validateDestinationDates(
          { arrival: day('2030-01-05'), departure: day('2030-01-06') },
          {},
        ),
      ).toEqual([]);
    });
  });

  describe('when the trip has only one date', () => {
    it('describes a trip with only a start', () => {
      expect(
        validateDestinationDates(
          { arrival: day('2026-06-01') },
          { startDate: day('2026-07-01') },
        ),
      ).toEqual(['arrival must be within the trip dates (from 2026-07-01)']);
    });

    it('describes a trip with only an end', () => {
      expect(
        validateDestinationDates(
          { departure: day('2026-08-01') },
          { endDate: day('2026-07-15') },
        ),
      ).toEqual(['departure must be within the trip dates (until 2026-07-15)']);
    });
  });
});
