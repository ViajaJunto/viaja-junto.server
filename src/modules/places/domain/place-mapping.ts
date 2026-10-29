import type { ExternalPlace } from './places.provider.js';

export type ActivityType = 'TOUR' | 'FOOD' | 'LODGING' | 'TRANSPORT' | 'OTHER';
export type DestinationCategory = 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL';

const FOOD_AMENITIES = new Set([
  'restaurant',
  'cafe',
  'fast_food',
  'bar',
  'pub',
  'food_court',
  'ice_cream',
  'biergarten',
]);
const TRANSPORT_AMENITIES = new Set([
  'bus_station',
  'ferry_terminal',
  'taxi',
  'car_rental',
]);
const LODGING_TOURISM = new Set([
  'hotel',
  'hostel',
  'motel',
  'guest_house',
  'apartment',
  'camp_site',
  'chalet',
  'resort',
]);
const SIGHT_TOURISM = new Set([
  'attraction',
  'museum',
  'gallery',
  'viewpoint',
  'zoo',
  'theme_park',
  'aquarium',
  'artwork',
]);
const CITY_PLACES = new Set([
  'city',
  'town',
  'village',
  'municipality',
  'suburb',
  'borough',
]);

/**
 * Guesses what kind of activity an OpenStreetMap place is. Anything the rules
 * do not recognise is OTHER, so an admin can fix it before it is used.
 */
export function inferActivityType(place: ExternalPlace): ActivityType {
  const { kind, subtype } = place;

  if (kind === 'amenity' && subtype && FOOD_AMENITIES.has(subtype))
    return 'FOOD';
  if (kind === 'amenity' && subtype && TRANSPORT_AMENITIES.has(subtype)) {
    return 'TRANSPORT';
  }
  if (kind === 'tourism' && subtype && LODGING_TOURISM.has(subtype)) {
    return 'LODGING';
  }
  if (kind === 'tourism' && subtype && SIGHT_TOURISM.has(subtype))
    return 'TOUR';
  if (kind === 'historic' || kind === 'leisure') return 'TOUR';
  if (kind === 'railway' || kind === 'aeroway') return 'TRANSPORT';

  return 'OTHER';
}

/** Guesses the discovery category of an OpenStreetMap place, or null when unsure. */
export function inferDestinationCategory(
  place: ExternalPlace,
): DestinationCategory | null {
  const { kind, subtype } = place;

  if (kind === 'natural' && (subtype === 'beach' || subtype === 'bay')) {
    return 'BEACH';
  }
  if (kind === 'place' && subtype && CITY_PLACES.has(subtype)) return 'CITY';
  if (kind === 'boundary' && subtype === 'administrative') return 'CITY';
  if (kind === 'boundary' && subtype === 'national_park') return 'NATURE';
  if (kind === 'natural' || kind === 'leisure') return 'NATURE';
  if (kind === 'historic' || kind === 'tourism') return 'CULTURAL';

  return null;
}

const OSM_ID = /^osm:(node|way|relation):[1-9]\d{0,17}$/;

/** `true` for ids of the form `osm:node:123`. */
export function isOsmExternalId(value: string): boolean {
  return OSM_ID.test(value);
}
