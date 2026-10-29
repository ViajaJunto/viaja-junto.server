import {
  PlacesProvider,
  PlacesProviderError,
  type ExternalPlace,
} from '../domain/places.provider.js';
import { MinIntervalLimiter } from './min-interval-limiter.js';
import { TtlCache } from './ttl-cache.js';

export interface NominatimOptions {
  baseUrl: string;
  /** Required by the usage policy: it must identify the application. */
  userAgent: string;
  timeoutMs: number;
  fetch?: typeof fetch;
  limiter?: MinIntervalLimiter;
  cache?: {
    search: TtlCache<ExternalPlace[]>;
    lookup: TtlCache<ExternalPlace | null>;
  };
}

interface NominatimItem {
  osm_type?: string;
  osm_id?: number | string;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

const OSM_TYPES = ['node', 'way', 'relation'] as const;
const OSM_LETTER = { node: 'N', way: 'W', relation: 'R' } as const;
const CITY_KEYS = ['city', 'town', 'village', 'municipality'] as const;

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * OpenStreetMap through Nominatim (https://nominatim.org/release-docs/latest/api/Overview/).
 *
 * It follows the public usage policy: an identifying User-Agent, at most one
 * request per second, and results cached so the same query is not repeated.
 */
export class NominatimProvider implements PlacesProvider {
  private readonly http: typeof fetch;
  private readonly limiter: MinIntervalLimiter;
  private readonly cache: NonNullable<NominatimOptions['cache']>;

  constructor(private readonly options: NominatimOptions) {
    this.http = options.fetch ?? fetch;
    this.limiter = options.limiter ?? new MinIntervalLimiter(1000);
    this.cache = options.cache ?? {
      search: new TtlCache(ONE_HOUR_MS, 200),
      lookup: new TtlCache(ONE_HOUR_MS, 500),
    };
  }

  async search(query: string, limit: number): Promise<ExternalPlace[]> {
    const key = `${limit}:${query.trim().toLowerCase()}`;
    const cached = this.cache.search.get(key);
    if (cached) return cached;

    const items = await this.request('search', {
      q: query,
      limit: String(limit),
    });
    const places = items.flatMap((item) => toPlace(item) ?? []);
    this.cache.search.set(key, places);

    return places;
  }

  async lookup(externalId: string): Promise<ExternalPlace | null> {
    const cached = this.cache.lookup.get(externalId);
    if (cached !== undefined) return cached;

    const [, type, id] = externalId.split(':');
    const letter = OSM_LETTER[type as keyof typeof OSM_LETTER];
    if (!letter || !id) return null;

    const items = await this.request('lookup', { osm_ids: `${letter}${id}` });
    const place = items.flatMap((item) => toPlace(item) ?? [])[0] ?? null;
    this.cache.lookup.set(externalId, place);

    return place;
  }

  private async request(
    endpoint: 'search' | 'lookup',
    params: Record<string, string>,
  ): Promise<NominatimItem[]> {
    const url = new URL(
      endpoint,
      `${this.options.baseUrl.replace(/\/+$/, '')}/`,
    );
    for (const [name, value] of Object.entries({
      ...params,
      format: 'jsonv2',
      addressdetails: '1',
      'accept-language': 'pt-BR,pt,en',
    })) {
      url.searchParams.set(name, value);
    }

    await this.limiter.wait();

    let response: Response;
    try {
      response = await this.http(url, {
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new PlacesProviderError(
          'timeout',
          `The places provider did not answer within ${this.options.timeoutMs} ms`,
        );
      }
      throw new PlacesProviderError(
        'unavailable',
        'The places provider could not be reached',
      );
    }

    if (response.status === 429) {
      throw new PlacesProviderError(
        'rate_limited',
        'The places provider is limiting our requests',
      );
    }
    if (!response.ok) {
      throw new PlacesProviderError(
        'unavailable',
        `The places provider answered ${response.status}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PlacesProviderError(
        'unavailable',
        'The places provider answered something that is not JSON',
      );
    }
    if (!Array.isArray(body)) {
      throw new PlacesProviderError(
        'unavailable',
        'The places provider answered an unexpected payload',
      );
    }

    return body as NominatimItem[];
  }
}

/** One Nominatim result as an `ExternalPlace`, or null when it is unusable. */
export function toPlace(item: NominatimItem): ExternalPlace | null {
  const type = OSM_TYPES.find((osmType) => osmType === item.osm_type);
  const id = Number(item.osm_id);
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);

  if (!type || !Number.isSafeInteger(id) || id <= 0) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const address = item.address ?? {};
  const displayName = item.display_name?.trim() ?? '';
  const name = item.name?.trim() || displayName.split(',')[0]?.trim();
  if (!name) return null;

  return {
    externalId: `osm:${type}:${id}`,
    name,
    displayName: displayName || name,
    kind: item.category ?? null,
    subtype: item.type ?? null,
    city: CITY_KEYS.map((key) => address[key]).find(Boolean) ?? null,
    country: address.country ?? null,
    countryCode: address.country_code?.toUpperCase() ?? null,
    latitude,
    longitude,
  };
}
