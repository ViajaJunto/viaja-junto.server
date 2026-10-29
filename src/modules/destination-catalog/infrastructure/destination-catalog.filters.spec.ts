import { describe, expect, it } from 'vitest';
import { buildDestinationWhere } from './destination-catalog.filters.js';

describe('buildDestinationWhere', () => {
  it('adds no condition when nothing is filtered', () => {
    expect(buildDestinationWhere({})).toEqual({});
  });

  it('matches the name case-insensitively as a substring', () => {
    expect(buildDestinationWhere({ text: 'par' })).toEqual({
      AND: [{ name: { contains: 'par', mode: 'insensitive' } }],
    });
  });

  it('matches the country by name or by ISO code, case-insensitively', () => {
    expect(buildDestinationWhere({ country: 'fr' })).toEqual({
      AND: [
        {
          OR: [
            { country: { equals: 'fr', mode: 'insensitive' } },
            { countryCode: { equals: 'fr', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('filters by category', () => {
    expect(buildDestinationWhere({ category: 'BEACH' })).toEqual({
      AND: [{ category: 'BEACH' }],
    });
  });

  it('combines every filter with AND', () => {
    const where = buildDestinationWhere({
      text: 'a',
      country: 'Brasil',
      category: 'CITY',
    });

    expect(where.AND).toHaveLength(3);
  });

  it('matches wildcards literally, because ILIKE would not', () => {
    expect(buildDestinationWhere({ text: '100%', country: 'Fran_a' })).toEqual({
      AND: [
        { name: { contains: '100\\%', mode: 'insensitive' } },
        {
          OR: [
            { country: { equals: 'Fran\\_a', mode: 'insensitive' } },
            { countryCode: { equals: 'Fran\\_a', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });
});
