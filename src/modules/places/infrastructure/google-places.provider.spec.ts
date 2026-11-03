import { describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_MAX_RADIUS_METERS,
  GOOGLE_MAX_RESULTS,
  GooglePlacesProvider,
  toPlace,
} from './google-places.provider.js';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

const louvre = {
  id: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
  displayName: { text: 'Musée du Louvre' },
  formattedAddress: 'Rue de Rivoli, 75001 Paris, França',
  location: { latitude: 48.8606, longitude: 2.3376 },
  primaryType: 'museum',
  googleMapsUri: 'https://maps.google.com/?cid=42',
  photos: [{ name: 'places/ChIJLU7/photos/AUc7' }],
};
const orsay = {
  ...louvre,
  id: 'ChIJorsay',
  displayName: { text: "Musée d'Orsay" },
  photos: [],
};

const search = {
  latitude: 48.85,
  longitude: 2.35,
  radiusMeters: 10000,
  category: 'TOUR' as const,
  limit: 5,
};

/** Answers the nearby search with `places` and every photo request with `photoUri`. */
const google = (
  places: unknown[],
  photoUri = 'https://lh3.example/photo.jpg',
) =>
  vi.fn((url: string) =>
    Promise.resolve(
      url.includes('/media') ? json({ photoUri }) : json({ places }),
    ),
  );

const build = (fetchImpl: ReturnType<typeof vi.fn>) =>
  new GooglePlacesProvider({
    apiKey: 'secret-key',
    baseUrl: 'https://places.example.com/',
    timeoutMs: 1000,
    fetch: fetchImpl as unknown as typeof fetch,
  });

describe('GooglePlacesProvider', () => {
  it('searches nearby with the key in a header, a field mask and popularity ranking', async () => {
    const fetchMock = google([louvre]);

    await build(fetchMock).findNear(search);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://places.example.com/v1/places:searchNearby');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Goog-Api-Key']).toBe('secret-key');
    expect(headers['X-Goog-FieldMask']).toContain('places.displayName');
    expect(JSON.parse(init.body as string)).toEqual({
      // Tours match any type of the place; food and lodging only its main type.
      includedTypes: expect.arrayContaining(['museum', 'tourist_attraction']),
      maxResultCount: 5,
      rankPreference: 'POPULARITY',
      languageCode: 'pt-BR',
      locationRestriction: {
        circle: { center: { latitude: 48.85, longitude: 2.35 }, radius: 10000 },
      },
    });
  });

  it('asks for the maps link', async () => {
    const fetchMock = google([louvre]);

    await build(fetchMock).findNear(search);

    const init = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect(
      (init.headers as Record<string, string>)['X-Goog-FieldMask'],
    ).toContain('places.googleMapsUri');
  });

  it('never puts the key in a URL, so it cannot reach a stored photo link', async () => {
    const fetchMock = google([louvre]);

    await build(fetchMock).findNear(search);

    for (const [url] of fetchMock.mock.calls as unknown as [string][]) {
      expect(url).not.toContain('secret-key');
    }
  });

  it('maps the places, with their first photo and Google ids', async () => {
    const places = await build(google([louvre, orsay])).findNear(search);

    expect(places).toEqual([
      {
        externalId: 'google:ChIJLU7jZClu5kcR4PcOOO6p3I0',
        name: 'Musée du Louvre',
        displayName: 'Rue de Rivoli, 75001 Paris, França',
        kind: 'google',
        subtype: 'museum',
        city: null,
        country: null,
        countryCode: null,
        latitude: 48.8606,
        longitude: 2.3376,
        source: 'GOOGLE',
        googlePlaceId: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
        photoUrl: 'https://lh3.example/photo.jpg',
        mapsUrl: 'https://maps.google.com/?cid=42',
      },
      expect.objectContaining({ name: "Musée d'Orsay", photoUrl: null }),
    ]);
  });

  it('asks for the photo of the first photo only, at a fixed width, without following the redirect', async () => {
    const fetchMock = google([louvre]);

    await build(fetchMock).findNear(search);

    const photoCalls = (fetchMock.mock.calls as unknown as [string][]).filter(
      ([url]) => url.includes('/media'),
    );
    expect(photoCalls).toHaveLength(1);
    expect(photoCalls[0][0]).toBe(
      'https://places.example.com/v1/places/ChIJLU7/photos/AUc7/media?maxWidthPx=800&skipHttpRedirect=true',
    );
  });

  it('keeps the place, without a photo, when the photo cannot be fetched', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.includes('/media')
          ? new Response('', { status: 500 })
          : json({ places: [louvre] }),
      ),
    );

    const places = await build(fetchMock).findNear(search);

    expect(places).toHaveLength(1);
    expect(places[0].photoUrl).toBeNull();
  });

  it('limits the request to what the API accepts', async () => {
    const fetchMock = google([]);

    await build(fetchMock).findNear({
      ...search,
      limit: 99,
      radiusMeters: 999999,
    });

    const sent = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    );
    expect(sent.maxResultCount).toBe(GOOGLE_MAX_RESULTS);
    expect(sent.locationRestriction.circle.radius).toBe(
      GOOGLE_MAX_RADIUS_METERS,
    );
  });

  it.each([
    ['FOOD', 'restaurant'],
    ['LODGING', 'hotel'],
  ] as const)('searches the right types for %s', async (category, type) => {
    const fetchMock = google([]);

    await build(fetchMock).findNear({ ...search, category });

    const sent = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    );
    expect(sent.includedPrimaryTypes).toContain(type);
    expect(sent.includedTypes).toBeUndefined();
  });

  it('answers an empty list when Google finds nothing (the body has no places)', async () => {
    await expect(
      build(vi.fn().mockResolvedValue(json({}))).findNear(search),
    ).resolves.toEqual([]);
  });

  it.each([
    [429, 'rate_limited'],
    [403, 'unavailable'],
    [500, 'unavailable'],
  ] as const)('maps HTTP %s to %s', async (status, failure) => {
    const provider = build(
      vi.fn().mockResolvedValue(new Response('{}', { status })),
    );

    await expect(provider.findNear(search)).rejects.toMatchObject({
      name: 'PlacesProviderError',
      failure,
    });
  });

  it("includes Google's own reason (e.g. billing off), but never the key", async () => {
    const provider = build(
      vi
        .fn()
        .mockResolvedValue(
          json(
            { error: { message: 'Billing has not been enabled' } },
            { status: 403 },
          ),
        ),
    );

    const error = await provider.findNear(search).catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Google Places answered 403: Billing has not been enabled',
    );
    expect((error as Error).message).not.toContain('secret-key');
  });

  it('maps an aborted call to timeout and a network error to unavailable, with its cause', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    const refused = new TypeError('fetch failed', {
      cause: { code: 'ECONNREFUSED' },
    });

    await expect(
      build(vi.fn().mockRejectedValue(timeout)).findNear(search),
    ).rejects.toMatchObject({ failure: 'timeout' });
    await expect(
      build(vi.fn().mockRejectedValue(refused)).findNear(search),
    ).rejects.toMatchObject({
      failure: 'unavailable',
      message: 'Google Places could not be reached (ECONNREFUSED)',
    });
  });

  it('rejects a body that is not JSON', async () => {
    await expect(
      build(vi.fn().mockResolvedValue(new Response('<html>'))).findNear(search),
    ).rejects.toMatchObject({ failure: 'unavailable' });
  });
});

describe('toPlace', () => {
  it.each([
    ['without an id', { ...louvre, id: undefined }],
    ['without a name', { ...louvre, displayName: { text: ' ' } }],
    ['without a location', { ...louvre, location: undefined }],
  ])('drops a place %s', (_label, place) => {
    expect(toPlace(place)).toBeNull();
  });

  it('uses the maps link Google gives, or builds the documented one from the place id', () => {
    expect(toPlace(louvre)?.mapsUrl).toBe('https://maps.google.com/?cid=42');
    expect(toPlace({ ...louvre, googleMapsUri: undefined })?.mapsUrl).toBe(
      'https://www.google.com/maps/search/?api=1&query=Google&query_place_id=ChIJLU7jZClu5kcR4PcOOO6p3I0',
    );
  });

  it('uses the name when there is no address', () => {
    expect(
      toPlace({ ...louvre, formattedAddress: undefined })?.displayName,
    ).toBe('Musée du Louvre');
  });
});
