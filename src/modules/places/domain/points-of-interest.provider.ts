import type { ExternalPlace } from './places.provider.js';

/** The kinds of place worth discovering around a destination. */
export type PoiCategory = 'TOUR' | 'FOOD' | 'LODGING';

export const POI_CATEGORIES: readonly PoiCategory[] = [
  'TOUR',
  'FOOD',
  'LODGING',
];

export interface NearbySearch {
  latitude: number;
  longitude: number;
  /** Search radius around the point, in metres. */
  radiusMeters: number;
  category: PoiCategory;
  /** At most this many places, most notable first. */
  limit: number;
}

/**
 * Port to a service that lists points of interest around a coordinate
 * (Google Places today). Unlike `PlacesProvider`, which
 * looks a named place up, this one answers "what is there to do around here".
 */
export abstract class PointsOfInterestProvider {
  abstract findNear(search: NearbySearch): Promise<ExternalPlace[]>;
}
