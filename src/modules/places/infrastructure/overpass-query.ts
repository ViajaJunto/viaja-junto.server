import type { PoiCategory } from '../domain/points-of-interest.provider.js';

/** Overpass QL tag filters per category; every value is a constant. */
const FILTERS: Record<PoiCategory, string[]> = {
  TOUR: [
    '["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|aquarium)$"]',
    // Not memorials, markers or wayside crosses: there are thousands and few are visits.
    '["historic"~"^(castle|monument|ruins|archaeological_site|palace|fort|manor|city_gate|cathedral)$"]',
  ],
  FOOD: ['["amenity"~"^(restaurant|cafe|bar|pub|fast_food)$"]'],
  LODGING: [
    '["tourism"~"^(hotel|hostel|guest_house|apartment|resort|motel)$"]',
  ],
};

/** Upper bound on what Overpass returns; the best ones are picked afterwards. */
export const OVERPASS_FETCH_LIMIT = 200;

/**
 * The Overpass QL for the named places of a category around a point.
 * `serverTimeoutSeconds` is how long the Overpass server may work on it.
 */
export function buildOverpassQuery(
  category: PoiCategory,
  latitude: number,
  longitude: number,
  radiusMeters: number,
  serverTimeoutSeconds: number,
): string {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusMeters)
  ) {
    throw new TypeError('Coordinates and radius must be finite numbers');
  }

  const around = `(around:${Math.round(radiusMeters)},${latitude},${longitude})`;
  const statements = FILTERS[category]
    .map((filter) => `  nwr${filter}["name"]${around};`)
    .join('\n');

  return `[out:json][timeout:${serverTimeoutSeconds}];\n(\n${statements}\n);\nout center ${OVERPASS_FETCH_LIMIT};`;
}
