import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PlacesProviderError } from './../src/modules/places/domain/places.provider.js';
import {
  PointsOfInterestProvider,
  type NearbySearch,
} from './../src/modules/places/domain/points-of-interest.provider.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';
import { tokenFor } from './support/test-app.js';
import { TestData, type Account } from './support/test-data.js';

describe('Activities of a destination (e2e)', () => {
  let app: Awaited<
    ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>
  >;
  let nest: ReturnType<typeof app.createNestApplication>;
  let data: TestData;
  let prisma: PrismaService;
  let user: Account;
  const run = randomUUID().replace(/\D/g, '').slice(0, 9).padStart(9, '5');

  let calls: NearbySearch[] = [];
  let failure: PlacesProviderError | null = null;
  // Each test gets its own places: the external id is unique across the catalog.
  let batch = 0;
  const place = (n: number) => ({
    externalId: `google:8${run}${batch}${n}`,
    name: `Attraction ${run} ${n}`,
    displayName: `Attraction ${n}`,
    kind: 'google',
    subtype: 'museum',
    source: 'GOOGLE' as const,
    googlePlaceId: `g${run}${batch}${n}`,
    photoUrl: `https://lh3.example/${n}.jpg`,
    city: null,
    country: null,
    countryCode: null,
    latitude: 48.86,
    longitude: 2.33,
  });
  const fake = {
    findNear: (search: NearbySearch) => {
      calls.push(search);
      if (failure) return Promise.reject(failure);
      return Promise.resolve([place(1), place(2), place(3)]);
    },
  };

  const get = (path: string, who: Account | null = user) => {
    const req = request(nest.getHttpServer()).get(`/api${path}`);
    return who ? req.set('Authorization', `Bearer ${tokenFor(who)}`) : req;
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PointsOfInterestProvider)
      .useValue(fake)
      .compile();
    nest = app.createNestApplication();
    nest.setGlobalPrefix('api');
    nest.useGlobalPipes(buildValidationPipe());
    await nest.init();
    prisma = nest.get(PrismaService);
    data = new TestData(prisma);
    user = await data.user();
  });

  beforeEach(() => {
    calls = [];
    failure = null;
    batch += 1;
  });

  afterAll(async () => {
    await prisma.activityCatalog.deleteMany({
      where: { externalId: { startsWith: `google:8${run}` } },
    });
    await data.dispose();
    await nest.close();
  });

  const paris = async () => {
    const destination = await data.destination();
    await prisma.destinationCatalog.update({
      where: { id: destination.id },
      data: { latitude: 48.85, longitude: 2.35, country: 'França' },
    });
    return destination;
  };

  it('fetches from OpenStreetMap when the catalog is empty, stores it, then answers from the database', async () => {
    const destination = await paris();

    const first = await get(
      `/destination-catalog/${destination.id}/activities?limit=3`,
    ).expect(200);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      latitude: 48.85,
      longitude: 2.35,
      category: 'TOUR',
    });
    expect(first.body).toMatchObject({
      imported: 3,
      attribution: 'Powered by Google',
    });
    expect(first.body.data).toHaveLength(3);
    expect(first.body.data[0]).toMatchObject({
      destinationId: destination.id,
      type: 'TOUR',
      country: 'França',
      source: 'GOOGLE',
      googlePlaceId: expect.any(String),
      photoUrl: expect.stringContaining('https://lh3.example/'),
    });

    const second = await get(
      `/destination-catalog/${destination.id}/activities?limit=3`,
    ).expect(200);

    expect(calls).toHaveLength(1);
    expect(second.body.imported).toBe(0);
    expect(second.body.data).toHaveLength(3);

    // The activities are now regular catalog entries of that destination.
    const listed = await get(
      `/activity-catalog?destinationId=${destination.id}`,
      null,
    ).expect(200);
    expect(listed.body.meta.total).toBe(3);
  });

  it('does not duplicate places already in the catalog, and links the unlinked ones', async () => {
    const destination = await paris();
    await prisma.activityCatalog.create({
      data: {
        name: 'Already here',
        type: 'TOUR',
        externalId: place(1).externalId,
        source: 'OSM',
      },
    });

    const { body } = await get(
      `/destination-catalog/${destination.id}/activities?limit=5`,
    ).expect(200);

    expect(body.imported).toBe(2);
    expect(body.data.map((a: { name: string }) => a.name)).toContain(
      'Already here',
    );
    expect(
      await prisma.activityCatalog.count({
        where: { externalId: place(1).externalId },
      }),
    ).toBe(1);
  });

  it('answers 502 when OpenStreetMap fails and the catalog has nothing', async () => {
    failure = new PlacesProviderError('unavailable', 'down');
    const destination = await paris();

    await get(`/destination-catalog/${destination.id}/activities`).expect(502);
  });

  it('does not search for a destination without coordinates', async () => {
    const destination = await data.destination();

    const { body } = await get(
      `/destination-catalog/${destination.id}/activities`,
    ).expect(200);

    expect(calls).toHaveLength(0);
    expect(body.data).toEqual([]);
  });

  it('requires a token, validates the query and answers 404 for an unknown destination', async () => {
    const destination = await paris();

    await get(`/destination-catalog/${destination.id}/activities`, null).expect(
      401,
    );
    await get(
      `/destination-catalog/${destination.id}/activities?type=OTHER`,
    ).expect(422);
    await get(
      `/destination-catalog/${destination.id}/activities?limit=21`,
    ).expect(422);
    await get(`/destination-catalog/${randomUUID()}/activities`).expect(404);
  });
});
