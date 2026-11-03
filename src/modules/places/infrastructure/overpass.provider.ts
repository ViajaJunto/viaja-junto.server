import type { ExternalPlace } from '../domain/places.provider.js';
import { PlacesProviderError } from '../domain/places.provider.js';
import {
  PointsOfInterestProvider,
  type NearbySearch,
} from '../domain/points-of-interest.provider.js';
import { causeOf } from './network-error.js';
import { MinIntervalLimiter } from './min-interval-limiter.js';
import { buildOverpassQuery } from './overpass-query.js';
import { TtlCache } from './ttl-cache.js';

export interface OverpassOptions {
  /**
   * Interpreter endpoints, tried in order: the next one is used when a server
   * is at capacity, rate limiting or unreachable.
   */
  urls: string[];
  /** Identifies the application to the public servers. */
  userAgent: string;
  /** Give up on the HTTP call after this long. */
  timeoutMs: number;
  fetch?: typeof fetch;
  limiter?: MinIntervalLimiter;
  cache?: TtlCache<ExternalPlace[]>;
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
}

const OSM_TYPES = new Set(['node', 'way', 'relation']);
const KIND_KEYS = ['tourism', 'historic', 'amenity', 'leisure'] as const;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
/** The server stops its own work a little before our HTTP timeout. */
const SERVER_TIMEOUT_MARGIN_MS = 3000;

/**
 * Points of interest from OpenStreetMap through the Overpass API
 * (https://wiki.openstreetmap.org/wiki/Overpass_API). It identifies itself,
 * spaces its calls and caches the answers, as the public servers ask.
 */
export class OverpassProvider implements PointsOfInterestProvider {
  private readonly http: typeof fetch;
  private readonly limiter: MinIntervalLimiter;
  private readonly cache: TtlCache<ExternalPlace[]>;

  constructor(private readonly options: OverpassOptions) {
    this.http = options.fetch ?? fetch;
    this.limiter = options.limiter ?? new MinIntervalLimiter(1000);
    this.cache = options.cache ?? new TtlCache(SIX_HOURS_MS, 200);
  }

  async findNear(search: NearbySearch): Promise<ExternalPlace[]> {
    const { latitude, longitude, radiusMeters, category, limit } = search;
    const key = [
      category,
      latitude.toFixed(3),
      longitude.toFixed(3),
      radiusMeters,
      limit,
    ].join(':');
    const cached = this.cache.get(key);
    if (cached) return cached;

    const serverTimeout = Math.max(
      5,
      Math.floor((this.options.timeoutMs - SERVER_TIMEOUT_MARGIN_MS) / 1000),
    );
    const query = buildOverpassQuery(
      category,
      latitude,
      longitude,
      radiusMeters,
      serverTimeout,
    );
    const elements = await this.request(query);
    const places = pickBest(elements, limit);
    this.cache.set(key, places);

    return places;
  }

  private async request(query: string): Promise<OverpassElement[]> {
    let last: unknown;

    for (const url of this.options.urls) {
      try {
        return await this.requestTo(url, query);
      } catch (error) {
        // A timeout means the query itself is heavy, so another server would be as slow.
        if (
          !(error instanceof PlacesProviderError) ||
          error.failure === 'timeout'
        ) {
          throw error;
        }
        last = error;
      }
    }

    throw last;
  }

  private async requestTo(
    url: string,
    query: string,
  ): Promise<OverpassElement[]> {
    await this.limiter.wait();

    let response: Response;
    try {
      response = await this.http(url, {
        method: 'POST',
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new PlacesProviderError(
          'timeout',
          `Overpass did not answer within ${this.options.timeoutMs} ms`,
        );
      }
      throw new PlacesProviderError(
        'unavailable',
        `Overpass could not be reached${causeOf(error)}`,
      );
    }

    if (response.status === 429) {
      throw new PlacesProviderError(
        'rate_limited',
        'Overpass is limiting our requests',
      );
    }
    if (response.status === 504) {
      throw new PlacesProviderError(
        'timeout',
        'Overpass timed out on the query',
      );
    }
    if (!response.ok) {
      throw new PlacesProviderError(
        'unavailable',
        `Overpass answered ${response.status}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PlacesProviderError(
        'unavailable',
        'Overpass answered something that is not JSON',
      );
    }
    // When the server gives up on a query it still answers 200, with a remark.
    const remark = (body as { remark?: unknown } | null)?.remark;
    if (typeof remark === 'string' && /runtime error/i.test(remark)) {
      throw new PlacesProviderError(
        /timed out/i.test(remark) ? 'timeout' : 'unavailable',
        `Overpass could not run the query: ${remark}`,
      );
    }
    const elements = (body as { elements?: unknown } | null)?.elements;
    if (!Array.isArray(elements)) {
      throw new PlacesProviderError(
        'unavailable',
        'Overpass answered an unexpected payload',
      );
    }

    return elements as OverpassElement[];
  }
}

/** One Overpass element as an `ExternalPlace`, or null when it is unusable. */
export function toPlace(element: OverpassElement): ExternalPlace | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  if (!name || !element.type || !OSM_TYPES.has(element.type)) return null;
  if (!Number.isSafeInteger(element.id) || (element.id ?? 0) <= 0) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const kind = KIND_KEYS.find((key) => tags[key]);
  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ');

  return {
    externalId: `osm:${element.type}:${element.id}`,
    name,
    displayName: [name, street, tags['addr:city']].filter(Boolean).join(', '),
    kind: kind ?? null,
    subtype: kind ? (tags[kind] ?? null) : null,
    city: tags['addr:city'] ?? null,
    country: null,
    countryCode: tags['addr:country']?.toUpperCase() ?? null,
    latitude: latitude as number,
    longitude: longitude as number,
  };
}

/** A place with a Wikipedia/Wikidata entry is one people have heard of. */
const isNotable = (tags: Record<string, string | undefined> = {}) =>
  Boolean(tags.wikidata || tags.wikipedia);

/**
 * Notable places first (a Wikipedia/Wikidata entry), then the ones with a
 * website. Ties break by name and id, so the order is stable.
 */
export function rankPlaces(
  elements: OverpassElement[],
): { place: ExternalPlace; notable: boolean }[] {
  const score = (tags: Record<string, string | undefined> = {}) =>
    (isNotable(tags) ? 2 : 0) +
    (tags.website || tags['contact:website'] ? 1 : 0);

  return elements
    .flatMap((element) => {
      const place = toPlace(element);

      return place
        ? [
            {
              place,
              notable: isNotable(element.tags),
              score: score(element.tags),
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.place.name.localeCompare(b.place.name) ||
        a.place.externalId.localeCompare(b.place.externalId),
    )
    .map(({ place, notable }) => ({ place, notable }));
}

/**
 * The best `limit` places: only the notable ones when there are enough of
 * them, so what is stored is worth showing; otherwise they are completed with
 * the best of the rest.
 */
export function pickBest(
  elements: OverpassElement[],
  limit: number,
): ExternalPlace[] {
  const ranked = rankPlaces(elements);
  const notable = ranked.filter(({ notable: yes }) => yes);

  return (notable.length >= limit ? notable : ranked)
    .slice(0, limit)
    .map(({ place }) => place);
}
