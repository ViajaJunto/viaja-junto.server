import { describe, expect, it } from 'vitest';
import {
  groupVisitedCountries,
  type VisitedPlace,
} from './visited-countries.js';

const place = (
  tripId: string,
  country: string | null,
  countryCode: string | null = null,
): VisitedPlace => ({ tripId, country, countryCode });

describe('groupVisitedCountries', () => {
  it('lists each country once, with the number of trips it appears in', () => {
    const result = groupVisitedCountries([
      place('t1', 'França', 'FR'),
      place('t1', 'França', 'FR'),
      place('t2', 'França', 'FR'),
      place('t2', 'Portugal', 'PT'),
    ]);

    expect(result).toEqual([
      { country: 'França', countryCode: 'FR', tripCount: 2 },
      { country: 'Portugal', countryCode: 'PT', tripCount: 1 },
    ]);
  });

  it('counts a trip once however many destinations it has in the country', () => {
    const [france] = groupVisitedCountries([
      place('t1', 'França', 'FR'),
      place('t1', 'França', 'FR'),
      place('t1', 'França', 'FR'),
    ]);

    expect(france.tripCount).toBe(1);
  });

  it('sorts by country name', () => {
    const names = groupVisitedCountries([
      place('t1', 'Portugal', 'PT'),
      place('t1', 'Alemanha', 'DE'),
      place('t1', 'França', 'FR'),
    ]).map((country) => country.country);

    expect(names).toEqual(['Alemanha', 'França', 'Portugal']);
  });

  describe('places without an ISO code', () => {
    it('are grouped by name, ignoring case and spacing', () => {
      const result = groupVisitedCountries([
        place('t1', 'Reino Unido'),
        place('t2', ' reino unido '),
      ]);

      expect(result).toEqual([
        { country: 'Reino Unido', countryCode: null, tripCount: 2 },
      ]);
    });

    it('are unaffected by codes that differ only in case', () => {
      const result = groupVisitedCountries([
        place('t1', 'Reino Unido', 'GB'),
        place('t1', 'Reino Unido', 'gb'),
      ]);

      expect(result).toEqual([
        { country: 'Reino Unido', countryCode: 'GB', tripCount: 1 },
      ]);
    });
  });

  it('upper-cases the code', () => {
    expect(
      groupVisitedCountries([place('t1', 'Japão', 'jp')])[0].countryCode,
    ).toBe('JP');
  });

  it('shows a country known only by its code', () => {
    expect(groupVisitedCountries([place('t1', null, 'IT')])).toEqual([
      { country: null, countryCode: 'IT', tripCount: 1 },
    ]);
  });

  it('skips places that have neither country nor code', () => {
    expect(
      groupVisitedCountries([place('t1', null), place('t1', '  ', '')]),
    ).toEqual([]);
  });

  it('returns nothing for a user who has not completed a trip', () => {
    expect(groupVisitedCountries([])).toEqual([]);
  });
});
