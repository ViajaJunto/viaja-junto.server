import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import {
  PlacesProvider,
  PlacesProviderError,
  type ExternalPlace,
} from './../src/modules/places/domain/places.provider.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

type Account = { id: string; email: string };

const run = randomUUID().replace(/\D/g, '').slice(0, 9).padStart(9, '7');

const louvre: ExternalPlace = {
  externalId: `osm:node:9${run}1`,
  name: `Musée du Louvre ${run}`,
  displayName: `Musée du Louvre, Paris, França ${run}`,
  kind: 'tourism',
  subtype: 'museum',
  city: 'Paris',
  country: 'França',
  countryCode: 'FR',
  latitude: 48.8606,
  longitude: 2.3376,
};
const paris: ExternalPlace = {
  ...louvre,
  externalId: `osm:relation:9${run}2`,
  name: `Paris ${run}`,
  displayName: `Paris, França ${run}`,
  kind: 'boundary',
  subtype: 'administrative',
};

async function boot(provider?: Partial<PlacesProvider>) {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (provider) {
    builder = builder.overrideProvider(PlacesProvider).useValue(provider);
  }
  const app = (await builder.compile()).createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(buildValidationPipe());
  await app.init();

  return app;
}

describe('Places (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Account;
  let member: Account;
  let failure: PlacesProviderError | null = null;

  const fake: Pick<PlacesProvider, 'search' | 'lookup'> = {
    search: (query: string) => {
      if (failure) return Promise.reject(failure);
      return Promise.resolve(query.includes('nothing') ? [] : [louvre, paris]);
    },
    lookup: (externalId: string) => {
      if (failure) return Promise.reject(failure);
      return Promise.resolve(
        [louvre, paris].find((place) => place.externalId === externalId) ??
          null,
      );
    },
  };

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const as = (user: Account) => ({ Authorization: bearer(user) });

  beforeAll(async () => {
    app = await boot(fake);
    prisma = app.get(PrismaService);

    admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: `places-admin-${run}@example.com`,
        role: 'ADMIN',
      },
    });
    member = await prisma.user.create({
      data: { name: 'Member', email: `places-member-${run}@example.com` },
    });
  });

  afterAll(async () => {
    await prisma.activityCatalog.deleteMany({
      where: { externalId: { in: [louvre.externalId, paris.externalId] } },
    });
    await prisma.destinationCatalog.deleteMany({
      where: { externalId: { in: [louvre.externalId, paris.externalId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [admin.id, member.id] } },
    });
    await app.close();
  });

  describe('access', () => {
    it.each([
      ['get', '/places/search?q=louvre'],
      ['post', '/places/import/activities'],
      ['post', '/places/import/destinations'],
    ] as const)('%s %s requires a token', async (method, path) => {
      const response = await request(app.getHttpServer())[method](
        `/api${path}`,
      );

      expect(response.status).toBe(401);
    });

    it('forbids regular users from searching and importing', async () => {
      const server = app.getHttpServer();

      const searched = await request(server)
        .get('/api/places/search?q=louvre')
        .set(as(member));
      const imported = await request(server)
        .post('/api/places/import/activities')
        .set(as(member))
        .send({ externalId: louvre.externalId });

      expect([searched.status, imported.status]).toEqual([403, 403]);
    });
  });

  describe('search', () => {
    it('returns the places with attribution, suggestions and catalog flags', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/places/search?q=louvre')
        .set(as(admin))
        .expect(200);

      expect(body.attribution).toBe('© OpenStreetMap contributors');
      expect(body.results).toHaveLength(2);
      expect(body.results[0]).toMatchObject({
        externalId: louvre.externalId,
        suggestedActivityType: 'TOUR',
        inCatalog: { activity: false, destination: false },
      });
      expect(body.results[1]).toMatchObject({
        suggestedDestinationCategory: 'CITY',
      });
    });

    it('returns an empty list when nothing matches', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/places/search?q=nothing here')
        .set(as(admin))
        .expect(200);

      expect(body.results).toEqual([]);
    });

    it.each(['', 'q=a', 'q=louvre&limit=11', 'q=louvre&limit=0'])(
      'rejects the query "%s" with 422',
      async (query) => {
        const response = await request(app.getHttpServer())
          .get(`/api/places/search?${query}`)
          .set(as(admin));

        expect(response.status).toBe(422);
      },
    );
  });

  describe('import', () => {
    it('imports a place as a catalog activity', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/places/import/activities')
        .set(as(admin))
        .send({ externalId: louvre.externalId })
        .expect(201);

      expect(body).toMatchObject({
        name: louvre.name,
        type: 'TOUR',
        city: 'Paris',
        country: 'França',
        source: 'OSM',
        latitude: 48.8606,
      });
      const stored = await prisma.activityCatalog.findUniqueOrThrow({
        where: { externalId: louvre.externalId },
      });
      expect(stored.id).toBe(body.id);
    });

    it('does not import the same place twice', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/places/import/activities')
        .set(as(admin))
        .send({ externalId: louvre.externalId });

      expect(response.status).toBe(409);
      expect(
        await prisma.activityCatalog.count({
          where: { externalId: louvre.externalId },
        }),
      ).toBe(1);
    });

    it('imports a place as a catalog destination, with its ISO code', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/places/import/destinations')
        .set(as(admin))
        .send({ externalId: paris.externalId })
        .expect(201);

      expect(body).toMatchObject({
        name: paris.name,
        country: 'França',
        countryCode: 'FR',
        category: 'CITY',
      });
    });

    it('keeps the two catalogs apart: the same place can be both', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/places/search?q=louvre')
        .set(as(admin))
        .expect(200);

      expect(
        body.results.map((r: { inCatalog: unknown }) => r.inCatalog),
      ).toEqual([
        { activity: true, destination: false },
        { activity: false, destination: true },
      ]);
    });

    it('answers 404 for a place the provider does not know', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/places/import/activities')
        .set(as(admin))
        .send({ externalId: 'osm:node:1' });

      expect(response.status).toBe(404);
    });

    it.each(['gp:ChIJ123', 'osm:planet:1', '', 5])(
      'rejects the external id %j with 422',
      async (externalId) => {
        const response = await request(app.getHttpServer())
          .post('/api/places/import/destinations')
          .set(as(admin))
          .send({ externalId });

        expect(response.status).toBe(422);
      },
    );
  });

  describe('when the provider fails', () => {
    afterEach(() => {
      failure = null;
    });

    it.each([
      ['timeout', 504],
      ['rate_limited', 503],
      ['unavailable', 502],
    ] as const)('maps %s to %i', async (kind, status) => {
      failure = new PlacesProviderError(kind, 'provider trouble');

      const response = await request(app.getHttpServer())
        .get('/api/places/search?q=louvre')
        .set(as(admin));

      expect(response.status).toBe(status);
      expect(response.body.message).toBe('provider trouble');
    });
  });
});

describe('Places without configuration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Account;

  beforeAll(async () => {
    app = await boot();
    prisma = app.get(PrismaService);
    admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: `places-unconfigured-${run}@example.com`,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: admin.id } });
    await app.close();
  });

  it('answers 503 and says what to set', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/places/search?q=louvre')
      .set(
        'Authorization',
        `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
          sub: admin.id,
          email: admin.email,
        })}`,
      );

    expect(response.status).toBe(503);
    expect(response.body.message).toContain('PLACES_USER_AGENT');
  });
});
