import { describe, expect, it, vi } from 'vitest';
import { PlacesProviderError } from '../domain/places.provider.js';
import { MinIntervalLimiter } from './min-interval-limiter.js';
import { NominatimProvider, toPlace } from './nominatim.provider.js';

const louvre = {
  osm_type: 'node',
  osm_id: 240109189,
  lat: '48.8606111',
  lon: '2.3376',
  category: 'tourism',
  type: 'museum',
  name: 'Musée du Louvre',
  display_name: 'Musée du Louvre, Rue de Rivoli, Paris, França',
  address: { city: 'Paris', country: 'França', country_code: 'fr' },
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

function build(fetchImpl: ReturnType<typeof vi.fn>) {
  const sleeps: number[] = [];
  let now = 0;
  const limiter = new MinIntervalLimiter(
    1000,
    () => now,
    (ms) => {
      sleeps.push(ms);
      now += ms;
      return Promise.resolve();
    },
  );
  const provider = new NominatimProvider({
    baseUrl: 'https://nominatim.example.org/',
    userAgent: 'ViajaJunto/1.0 (test@example.com)',
    timeoutMs: 1000,
    fetch: fetchImpl as unknown as typeof fetch,
    limiter,
  });

  return { provider, sleeps };
}

describe('NominatimProvider', () => {
  describe('search', () => {
    it('asks the provider with an identifying User-Agent and parses the result', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json([louvre]));
      const { provider } = build(fetchMock);

      const places = await provider.search('louvre', 3);

      const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
      expect(url.origin + url.pathname).toBe(
        'https://nominatim.example.org/search',
      );
      expect(url.searchParams.get('q')).toBe('louvre');
      expect(url.searchParams.get('limit')).toBe('3');
      expect(url.searchParams.get('format')).toBe('jsonv2');
      expect(url.searchParams.get('addressdetails')).toBe('1');
      expect((init.headers as Record<string, string>)['User-Agent']).toBe(
        'ViajaJunto/1.0 (test@example.com)',
      );
      expect(places).toEqual([
        {
          externalId: 'osm:node:240109189',
          name: 'Musée du Louvre',
          displayName: 'Musée du Louvre, Rue de Rivoli, Paris, França',
          kind: 'tourism',
          subtype: 'museum',
          city: 'Paris',
          country: 'França',
          countryCode: 'FR',
          latitude: 48.8606111,
          longitude: 2.3376,
        },
      ]);
    });

    it('serves a repeated query from the cache', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json([louvre]));
      const { provider } = build(fetchMock);

      await provider.search('Louvre', 3);
      await provider.search('  louvre ', 3);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not mix up queries that differ in limit', async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() => Promise.resolve(json([louvre])));
      const { provider } = build(fetchMock);

      await provider.search('louvre', 3);
      await provider.search('louvre', 5);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not cache a failure', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json({}, { status: 500 }))
        .mockResolvedValueOnce(json([louvre]));
      const { provider } = build(fetchMock);

      await expect(provider.search('louvre', 3)).rejects.toBeInstanceOf(
        PlacesProviderError,
      );
      await expect(provider.search('louvre', 3)).resolves.toHaveLength(1);
    });

    it('spaces its calls one second apart', async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() => Promise.resolve(json([])));
      const { provider, sleeps } = build(fetchMock);

      await provider.search('one', 1);
      await provider.search('two', 1);
      await provider.search('three', 1);

      expect(sleeps).toEqual([1000, 1000]);
    });

    it('skips results it cannot use', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          json([
            louvre,
            { ...louvre, osm_type: 'planet' },
            { ...louvre, osm_id: 'abc' },
            { ...louvre, lat: 'north' },
            { ...louvre, name: '', display_name: '' },
          ]),
        );
      const { provider } = build(fetchMock);

      await expect(provider.search('louvre', 5)).resolves.toHaveLength(1);
    });
  });

  describe('lookup', () => {
    it('fetches one OSM object by type and id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json([louvre]));
      const { provider } = build(fetchMock);

      const place = await provider.lookup('osm:way:123');

      const [url] = fetchMock.mock.calls[0] as [URL];
      expect(url.pathname).toBe('/lookup');
      expect(url.searchParams.get('osm_ids')).toBe('W123');
      expect(place?.externalId).toBe('osm:node:240109189');
    });

    it('returns null when the provider does not know the place, and remembers it', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json([]));
      const { provider } = build(fetchMock);

      await expect(provider.lookup('osm:node:1')).resolves.toBeNull();
      await expect(provider.lookup('osm:node:1')).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns null for an id it cannot interpret, without calling the provider', async () => {
      const fetchMock = vi.fn();
      const { provider } = build(fetchMock);

      await expect(provider.lookup('gp:ChIJ123')).resolves.toBeNull();
      await expect(provider.lookup('osm:planet:1')).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    const failure = async (fetchMock: ReturnType<typeof vi.fn>) => {
      const { provider } = build(fetchMock);
      return provider.search('x', 1).catch((error: unknown) => error);
    };

    it('reports a timeout', async () => {
      const timeout = Object.assign(new Error('timed out'), {
        name: 'TimeoutError',
      });

      expect(await failure(vi.fn().mockRejectedValue(timeout))).toMatchObject({
        failure: 'timeout',
      });
    });

    it('reports an unreachable provider', async () => {
      expect(
        await failure(vi.fn().mockRejectedValue(new TypeError('fetch failed'))),
      ).toMatchObject({ failure: 'unavailable' });
    });

    it('reports being rate limited on 429', async () => {
      expect(
        await failure(vi.fn().mockResolvedValue(json({}, { status: 429 }))),
      ).toMatchObject({ failure: 'rate_limited' });
    });

    it.each([500, 502, 403, 404])(
      'reports a %s answer as unavailable',
      async (status) => {
        expect(
          await failure(vi.fn().mockResolvedValue(json({}, { status }))),
        ).toMatchObject({ failure: 'unavailable' });
      },
    );

    it('reports an answer that is not JSON', async () => {
      expect(
        await failure(
          vi.fn().mockResolvedValue(new Response('<html>oops</html>')),
        ),
      ).toMatchObject({ failure: 'unavailable' });
    });

    it('reports a JSON answer of the wrong shape', async () => {
      expect(
        await failure(vi.fn().mockResolvedValue(json({ error: 'nope' }))),
      ).toMatchObject({ failure: 'unavailable' });
    });
  });
});

describe('toPlace', () => {
  it('names a place after the first part of its address when it has no name', () => {
    expect(toPlace({ ...louvre, name: undefined })?.name).toBe(
      'Musée du Louvre',
    );
  });

  it.each([
    [{ town: 'Cascais' }, 'Cascais'],
    [{ village: 'Sintra' }, 'Sintra'],
    [{ municipality: 'Oeiras' }, 'Oeiras'],
    [{}, null],
  ])('finds the city in %j', (address, city) => {
    expect(toPlace({ ...louvre, address })?.city).toBe(city);
  });

  it('keeps the country code upper-case, or null when absent', () => {
    expect(
      toPlace({ ...louvre, address: { country_code: 'br' } })?.countryCode,
    ).toBe('BR');
    expect(toPlace({ ...louvre, address: {} })?.countryCode).toBeNull();
  });
});
