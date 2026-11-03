import { PlacesProviderError } from '../domain/places.provider.js';
import type { ExternalPlace } from '../domain/places.provider.js';
import {
  PointsOfInterestProvider,
  type NearbySearch,
  type PoiCategory,
} from '../domain/points-of-interest.provider.js';
import { causeOf } from './network-error.js';

export interface GooglePlacesOptions {
  apiKey: string;
  /** Defaults to `https://places.googleapis.com`. */
  baseUrl?: string;
  timeoutMs: number;
  fetch?: typeof fetch;
}

/**
 * Table A place types of Places API (New) for each kind of activity. Tours
 * match any of a place's types (a landmark is also a "tourist_attraction");
 * food and lodging match the main type only, or every department store with a
 * café and every hotel with a restaurant would be listed as a restaurant.
 */
const TYPES: Record<PoiCategory, string[]> = {
  TOUR: [
    'tourist_attraction',
    'museum',
    'historical_landmark',
    'art_gallery',
    'zoo',
    'aquarium',
    'amusement_park',
  ],
  FOOD: ['restaurant', 'cafe', 'bar'],
  LODGING: ['hotel', 'hostel', 'bed_and_breakfast', 'resort_hotel'],
};

/** Places API (New) returns at most 20 places per nearby search. */
export const GOOGLE_MAX_RESULTS = 20;
/** The largest search radius the API accepts, in metres. */
export const GOOGLE_MAX_RADIUS_METERS = 50_000;
/** Width of the stored photo; the API scales it. */
const PHOTO_WIDTH_PX = 800;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.photos.name',
].join(',');

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  photos?: { name?: string }[];
}

/**
 * Places near a point from Google Places API (New)
 * (https://developers.google.com/maps/documentation/places/web-service/nearby-search),
 * most popular first, each with the URL of its first photo. The API key is
 * sent in a header, never in a URL, so it cannot end up in a stored photo link.
 */
export class GooglePlacesProvider implements PointsOfInterestProvider {
  private readonly http: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: GooglePlacesOptions) {
    this.http = options.fetch ?? fetch;
    this.baseUrl = (options.baseUrl ?? 'https://places.googleapis.com').replace(
      /\/+$/,
      '',
    );
  }

  async findNear(search: NearbySearch): Promise<ExternalPlace[]> {
    const body = await this.call<{ places?: GooglePlace[] }>(
      'POST',
      '/v1/places:searchNearby',
      {
        'X-Goog-FieldMask': FIELD_MASK,
        'Content-Type': 'application/json',
      },
      JSON.stringify({
        [search.category === 'TOUR' ? 'includedTypes' : 'includedPrimaryTypes']:
          TYPES[search.category],
        maxResultCount: Math.min(search.limit, GOOGLE_MAX_RESULTS),
        rankPreference: 'POPULARITY',
        languageCode: 'pt-BR',
        locationRestriction: {
          circle: {
            center: {
              latitude: search.latitude,
              longitude: search.longitude,
            },
            radius: Math.min(search.radiusMeters, GOOGLE_MAX_RADIUS_METERS),
          },
        },
      }),
    );

    return Promise.all(
      (body.places ?? []).flatMap((place) => {
        const mapped = toPlace(place);

        return mapped ? [this.withPhoto(mapped, place.photos?.[0]?.name)] : [];
      }),
    );
  }

  /**
   * The temporary public URL of a photo. A photo that cannot be fetched is
   * not worth failing the search for, so it just leaves the place without one.
   */
  private async withPhoto(
    place: ExternalPlace,
    photoName: string | undefined,
  ): Promise<ExternalPlace> {
    if (!photoName) return place;

    try {
      const photo = await this.call<{ photoUri?: string }>(
        'GET',
        `/v1/${photoName}/media?maxWidthPx=${PHOTO_WIDTH_PX}&skipHttpRedirect=true`,
      );

      return { ...place, photoUrl: photo.photoUri ?? null };
    } catch {
      return place;
    }
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    headers: Record<string, string> = {},
    body?: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.http(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'X-Goog-Api-Key': this.options.apiKey,
          Accept: 'application/json',
          ...headers,
        },
        body,
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new PlacesProviderError(
          'timeout',
          `Google Places did not answer within ${this.options.timeoutMs} ms`,
        );
      }
      throw new PlacesProviderError(
        'unavailable',
        `Google Places could not be reached${causeOf(error)}`,
      );
    }

    if (response.status === 429) {
      throw new PlacesProviderError(
        'rate_limited',
        'Google Places quota exceeded or too many requests',
      );
    }
    if (!response.ok) {
      throw new PlacesProviderError(
        'unavailable',
        `Google Places answered ${response.status}${await reasonOf(response)}`,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new PlacesProviderError(
        'unavailable',
        'Google Places answered something that is not JSON',
      );
    }
  }
}

/** Google's own explanation of a refusal (e.g. billing not enabled), or empty. */
async function reasonOf(response: Response): Promise<string> {
  try {
    const { error } = (await response.json()) as {
      error?: { message?: unknown };
    };

    return typeof error?.message === 'string' ? `: ${error.message}` : '';
  } catch {
    return '';
  }
}

/** One Google place as an `ExternalPlace` (without photo), or null when unusable. */
export function toPlace(place: GooglePlace): ExternalPlace | null {
  const name = place.displayName?.text?.trim();
  const { latitude, longitude } = place.location ?? {};

  if (!place.id || !name) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    externalId: `google:${place.id}`,
    name,
    displayName: place.formattedAddress?.trim() || name,
    kind: 'google',
    subtype: place.primaryType ?? null,
    city: null,
    country: null,
    countryCode: null,
    latitude: latitude as number,
    longitude: longitude as number,
    source: 'GOOGLE',
    googlePlaceId: place.id,
    photoUrl: null,
  };
}
