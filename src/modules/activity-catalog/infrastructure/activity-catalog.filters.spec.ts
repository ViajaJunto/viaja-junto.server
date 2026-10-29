import { describe, expect, it } from 'vitest';
import {
  buildActivityOrderBy,
  buildActivityWhere,
} from './activity-catalog.filters.js';

describe('buildActivityWhere', () => {
  it('adds no condition when nothing is filtered', () => {
    expect(buildActivityWhere({})).toEqual({});
  });

  it('matches the name case-insensitively as a substring', () => {
    expect(buildActivityWhere({ text: 'louvre' })).toEqual({
      AND: [{ name: { contains: 'louvre', mode: 'insensitive' } }],
    });
  });

  it('filters by type', () => {
    expect(buildActivityWhere({ type: 'FOOD' })).toEqual({
      AND: [{ type: 'FOOD' }],
    });
  });

  it('filters by a minimum average rating, which leaves unrated activities out', () => {
    expect(buildActivityWhere({ minRating: 4 })).toEqual({
      AND: [{ averageRating: { gte: 4 } }],
    });
  });

  it('keeps a minimum rating of 0', () => {
    expect(buildActivityWhere({ minRating: 0 })).toEqual({
      AND: [{ averageRating: { gte: 0 } }],
    });
  });

  it('matches city and country exactly but case-insensitively', () => {
    expect(buildActivityWhere({ city: 'Paris', country: 'França' })).toEqual({
      AND: [
        { city: { equals: 'Paris', mode: 'insensitive' } },
        { country: { equals: 'França', mode: 'insensitive' } },
      ],
    });
  });

  it('combines every filter with AND', () => {
    const where = buildActivityWhere({
      text: 'a',
      type: 'TOUR',
      minRating: 3,
      city: 'Rome',
      country: 'Itália',
    });

    expect(where.AND).toHaveLength(5);
  });

  it('matches wildcards literally, because ILIKE would not', () => {
    expect(
      buildActivityWhere({ text: '50%', city: 'Sao_Paulo', country: 'B%' }),
    ).toEqual({
      AND: [
        { name: { contains: '50\\%', mode: 'insensitive' } },
        { city: { equals: 'Sao\\_Paulo', mode: 'insensitive' } },
        { country: { equals: 'B\\%', mode: 'insensitive' } },
      ],
    });
  });
});

describe('buildActivityOrderBy', () => {
  it('orders A to Z by default', () => {
    expect(buildActivityOrderBy(undefined)).toEqual([{ name: 'asc' }]);
    expect(buildActivityOrderBy('name')).toEqual([{ name: 'asc' }]);
  });

  it('puts the best rated first, unrated last, and breaks ties by name', () => {
    expect(buildActivityOrderBy('rating')).toEqual([
      { averageRating: { sort: 'desc', nulls: 'last' } },
      { name: 'asc' },
    ]);
  });
});
