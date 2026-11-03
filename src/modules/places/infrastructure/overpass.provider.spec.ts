import { describe, expect, it, vi } from 'vitest';
import { PlacesProviderError } from '../domain/places.provider.js';
import { MinIntervalLimiter } from './min-interval-limiter.js';
import { OverpassProvider, rankPlaces, toPlace } from './overpass.provider.js';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

const element = (
  id: number,
  name: string,
  tags: Record<string, string> = {},
  extra: Record<string, unknown> = {},
) => ({
  type: 'node',
  id,
  lat: 48.86,
  lon: 2.33,
  tags: { name, tourism: 'museum', ...tags },
  ...extra,
});

const search = {
  latitude: 48.85,
  longitude: 2.35,
  radiusMeters: 10000,
  category: 'TOUR' as const,
  limit: 2,
};

const PRIMARY = 'https://overpass.example.org/api/interpreter';
const MIRROR = 'https://mirror.example.org/api/interpreter';

const build = (
  fetchImpl: ReturnType<typeof vi.fn>,
  urls: string[] = [PRIMARY],
) =>
  new OverpassProvider({
    urls: urls,
    userAgent: 'ViajaJunto/1.0 (test@example.com)',
    timeoutMs: 10000,
    fetch: fetchImpl as unknown as typeof fetch,
    limiter: new MinIntervalLimiter(0),
  });

describe('OverpassProvider', () => {
  it('posts the query with an identifying User-Agent and returns the best places', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        elements: [
          element(1, 'Zeta'),
          element(2, 'Alpha'),
          element(3, 'Notable', { wikidata: 'Q1' }),
        ],
      }),
    );

    const places = await build(fetchMock).findNear(search);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(PRIMARY);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(
      'ViajaJunto/1.0 (test@example.com)',
    );
    expect((init.body as URLSearchParams).get('data')).toContain(
      '(around:10000,48.85,2.35)',
    );
    // The notable one first, then by name, cut to the limit.
    expect(places.map((p) => p.name)).toEqual(['Notable', 'Alpha']);
  });

  it('answers the same search from the cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ elements: [element(1, 'Louvre')] }));
    const provider = build(fetchMock);

    await provider.findNear(search);
    await provider.findNear(search);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [429, 'rate_limited'],
    [504, 'timeout'],
    [500, 'unavailable'],
  ] as const)('maps HTTP %s to %s', async (status, failure) => {
    const provider = build(
      vi.fn().mockResolvedValue(new Response('', { status })),
    );

    await expect(provider.findNear(search)).rejects.toMatchObject({
      name: 'PlacesProviderError',
      failure,
    });
  });

  it('maps an aborted call to timeout and a network error to unavailable', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });

    await expect(
      build(vi.fn().mockRejectedValue(timeout)).findNear(search),
    ).rejects.toMatchObject({ failure: 'timeout' });
    await expect(
      build(vi.fn().mockRejectedValue(new Error('down'))).findNear(search),
    ).rejects.toBeInstanceOf(PlacesProviderError);
  });

  it('rejects a body that is not JSON or has no elements', async () => {
    await expect(
      build(vi.fn().mockResolvedValue(new Response('<html>'))).findNear(search),
    ).rejects.toMatchObject({ failure: 'unavailable' });
    await expect(
      build(vi.fn().mockResolvedValue(json({ remark: 'oops' }))).findNear(
        search,
      ),
    ).rejects.toMatchObject({ failure: 'unavailable' });
  });
});

describe('OverpassProvider with several servers', () => {
  const ok = () => json({ elements: [element(1, 'Louvre')] });

  it.each([
    ['at capacity (502)', new Response('', { status: 502 })],
    ['rate limiting (429)', new Response('', { status: 429 })],
  ])('asks the next server when the first is %s', async (_label, refusal) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(refusal)
      .mockResolvedValueOnce(ok());

    const places = await build(fetchMock, [PRIMARY, MIRROR]).findNear(search);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([PRIMARY, MIRROR]);
    expect(places.map((p) => p.name)).toEqual(['Louvre']);
  });

  it('asks the next server when the first cannot be reached', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(ok());

    await build(fetchMock, [PRIMARY, MIRROR]).findNear(search);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not ask another server after a timeout: the query itself is heavy', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    const fetchMock = vi.fn().mockRejectedValue(timeout);

    await expect(
      build(fetchMock, [PRIMARY, MIRROR]).findNear(search),
    ).rejects.toMatchObject({ failure: 'timeout' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails with the last error when every server refuses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }));

    await expect(
      build(fetchMock, [PRIMARY, MIRROR]).findNear(search),
    ).rejects.toMatchObject({ failure: 'rate_limited' });
  });
});

describe('toPlace', () => {
  it('maps a node, namespacing its id and reading kind and subtype from the tags', () => {
    expect(
      toPlace(
        element(7, 'Louvre', {
          'addr:street': 'Rue de Rivoli',
          'addr:city': 'Paris',
        }),
      ),
    ).toEqual({
      externalId: 'osm:node:7',
      name: 'Louvre',
      displayName: 'Louvre, Rue de Rivoli, Paris',
      kind: 'tourism',
      subtype: 'museum',
      city: 'Paris',
      country: null,
      countryCode: null,
      latitude: 48.86,
      longitude: 2.33,
    });
  });

  it('uses the centre of a way', () => {
    const way = {
      type: 'way',
      id: 9,
      center: { lat: 1, lon: 2 },
      tags: { name: 'Castle', historic: 'castle' },
    };

    expect(toPlace(way)).toMatchObject({
      externalId: 'osm:way:9',
      kind: 'historic',
      latitude: 1,
      longitude: 2,
    });
  });

  it.each([
    ['without a name', { type: 'node', id: 1, lat: 1, lon: 1, tags: {} }],
    [
      'with an unknown type',
      { type: 'area', id: 1, lat: 1, lon: 1, tags: { name: 'x' } },
    ],
    ['without an id', { type: 'node', lat: 1, lon: 1, tags: { name: 'x' } }],
    ['without coordinates', { type: 'node', id: 1, tags: { name: 'x' } }],
  ])('drops an element %s', (_label, bad) => {
    expect(toPlace(bad)).toBeNull();
  });
});

describe('rankPlaces', () => {
  it('puts Wikipedia/Wikidata first, then websites, then the rest by name', () => {
    const ranked = rankPlaces([
      element(1, 'B plain'),
      element(2, 'A plain'),
      element(3, 'Site', { website: 'https://x.org' }),
      element(4, 'Wiki', { wikipedia: 'fr:Wiki' }),
      { type: 'node', id: 5, tags: {} },
    ]);

    expect(ranked.map((p) => p.name)).toEqual([
      'Wiki',
      'Site',
      'A plain',
      'B plain',
    ]);
  });
});
