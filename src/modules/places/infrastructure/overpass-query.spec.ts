import { describe, expect, it } from 'vitest';
import { buildOverpassQuery } from './overpass-query.js';

describe('buildOverpassQuery', () => {
  it('searches named places around the point, with the server timeout', () => {
    const query = buildOverpassQuery('TOUR', 48.85, 2.35, 10000, 20);

    expect(query).toContain('[out:json][timeout:20];');
    expect(query).toContain('(around:10000,48.85,2.35)');
    expect(query).toContain('["name"]');
    expect(query).toContain('out center');
  });

  it.each([
    ['TOUR', '"tourism"~"^(attraction|museum'],
    ['FOOD', '"amenity"~"^(restaurant|cafe'],
    ['LODGING', '"tourism"~"^(hotel|hostel'],
  ] as const)('filters %s by the matching tags', (category, tag) => {
    expect(buildOverpassQuery(category, 0, 0, 500, 10)).toContain(tag);
  });

  it('also takes historic places for tours', () => {
    const query = buildOverpassQuery('TOUR', 0, 0, 500, 10);

    expect(query).toContain('"historic"~"^(castle|monument');
    expect(query).not.toContain('memorial');
  });

  it('rounds the radius', () => {
    expect(buildOverpassQuery('FOOD', 0, 0, 999.6, 10)).toContain(
      'around:1000',
    );
  });

  it.each([NaN, Infinity])(
    'refuses %s as a coordinate, so nothing odd reaches the query',
    (bad) => {
      expect(() => buildOverpassQuery('TOUR', bad, 0, 500, 10)).toThrow(
        TypeError,
      );
      expect(() => buildOverpassQuery('TOUR', 0, bad, 500, 10)).toThrow(
        TypeError,
      );
      expect(() => buildOverpassQuery('TOUR', 0, 0, bad, 10)).toThrow(
        TypeError,
      );
    },
  );
});
