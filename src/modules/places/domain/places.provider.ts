/** A place as an external provider describes it, independent of any vendor. */
export interface ExternalPlace {
  /** Namespaced id, e.g. `osm:node:240109189`; unique across providers. */
  externalId: string;
  name: string;
  /** One-line address, as the provider prints it. */
  displayName: string;
  /** Raw provider classification (OSM: `tourism`, `amenity`, `place`...). */
  kind: string | null;
  /** Raw provider type within the kind (OSM: `museum`, `restaurant`, `city`...). */
  subtype: string | null;
  city: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2, upper-case. */
  countryCode: string | null;
  latitude: number;
  longitude: number;
}

export type PlacesFailure =
  /** The provider did not answer in time. */
  | 'timeout'
  /** The provider refused because too many requests were made. */
  | 'rate_limited'
  /** The provider is down, unreachable, or answered something unusable. */
  | 'unavailable';

/** What went wrong when talking to the provider; the application maps it to HTTP. */
export class PlacesProviderError extends Error {
  constructor(
    readonly failure: PlacesFailure,
    message: string,
  ) {
    super(message);
    this.name = 'PlacesProviderError';
  }
}

/**
 * Port to an external places service (OpenStreetMap today; Google Places could
 * be a second adapter). Declared as an abstract class so Nest can use it as a
 * DI token.
 */
export abstract class PlacesProvider {
  /** Free-text search, best matches first. */
  abstract search(query: string, limit: number): Promise<ExternalPlace[]>;
  /** One place by its namespaced id, or null when the provider no longer knows it. */
  abstract lookup(externalId: string): Promise<ExternalPlace | null>;
}
