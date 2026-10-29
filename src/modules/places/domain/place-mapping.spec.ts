import { describe, expect, it } from 'vitest';
import {
  inferActivityType,
  inferDestinationCategory,
  isOsmExternalId,
} from './place-mapping.js';
import type { ExternalPlace } from './places.provider.js';

const place = (kind: string | null, subtype: string | null): ExternalPlace => ({
  externalId: 'osm:node:1',
  name: 'X',
  displayName: 'X',
  kind,
  subtype,
  city: null,
  country: null,
  countryCode: null,
  latitude: 0,
  longitude: 0,
});

describe('inferActivityType', () => {
  it.each([
    ['tourism', 'museum', 'TOUR'],
    ['tourism', 'attraction', 'TOUR'],
    ['historic', 'castle', 'TOUR'],
    ['leisure', 'park', 'TOUR'],
    ['amenity', 'restaurant', 'FOOD'],
    ['amenity', 'cafe', 'FOOD'],
    ['tourism', 'hotel', 'LODGING'],
    ['tourism', 'hostel', 'LODGING'],
    ['amenity', 'bus_station', 'TRANSPORT'],
    ['railway', 'station', 'TRANSPORT'],
    ['aeroway', 'aerodrome', 'TRANSPORT'],
    ['shop', 'bakery', 'OTHER'],
    ['amenity', 'bank', 'OTHER'],
    [null, null, 'OTHER'],
  ])('%s/%s is %s', (kind, subtype, expected) => {
    expect(inferActivityType(place(kind, subtype))).toBe(expected);
  });
});

describe('inferDestinationCategory', () => {
  it.each([
    ['place', 'city', 'CITY'],
    ['place', 'town', 'CITY'],
    ['boundary', 'administrative', 'CITY'],
    ['natural', 'beach', 'BEACH'],
    ['boundary', 'national_park', 'NATURE'],
    ['natural', 'peak', 'NATURE'],
    ['historic', 'monument', 'CULTURAL'],
    ['tourism', 'attraction', 'CULTURAL'],
    ['shop', 'bakery', null],
    [null, null, null],
  ])('%s/%s is %s', (kind, subtype, expected) => {
    expect(inferDestinationCategory(place(kind, subtype))).toBe(expected);
  });
});

describe('isOsmExternalId', () => {
  it.each(['osm:node:1', 'osm:way:240109189', 'osm:relation:2202162'])(
    'accepts %s',
    (id) => {
      expect(isOsmExternalId(id)).toBe(true);
    },
  );

  it.each([
    'osm:planet:1',
    'osm:node:0',
    'osm:node:-1',
    'osm:node:',
    'gp:1',
    'node:1',
    '',
  ])('rejects %j', (id) => {
    expect(isOsmExternalId(id)).toBe(false);
  });
});
