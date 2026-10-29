import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { inviteCode } from './helpers.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

type Account = { id: string; email: string };

describe('Visited countries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let traveller: Account;
  let guest: Account;
  let admin: Account;
  const catalogIds: string[] = [];

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string, role: 'USER' | 'ADMIN' = 'USER') =>
    prisma.user.create({
      data: { name, email: `${name}-${run}@example.com`, role },
    });

  const place = async (country: string | null, countryCode: string | null) => {
    const catalog = await prisma.destinationCatalog.create({
      data: { name: `Place ${run} ${catalogIds.length}`, country, countryCode },
    });
    catalogIds.push(catalog.id);
    return catalog.id;
  };

  const trip = async (
    createdBy: string,
    status: 'PLANNING' | 'COMPLETED',
    catalogs: string[],
  ) => {
    const created = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Trip ${run}`,
        createdBy,
        status,
      },
    });
    for (const destinationCatalogId of catalogs) {
      await prisma.tripDestination.create({
        data: { tripId: created.id, destinationCatalogId },
      });
    }
    return created.id;
  };

  const visited = (user?: Account) => {
    const req = request(app.getHttpServer()).get(
      '/api/users/me/visited-countries',
    );
    return user ? req.set('Authorization', bearer(user)) : req;
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    [traveller, guest, admin] = await Promise.all([
      account('traveller'),
      account('guest'),
      account('admin', 'ADMIN'),
    ]);

    const paris = await place('França', 'FR');
    const lyon = await place('França', 'FR');
    const lisbon = await place('Portugal', 'PT');
    const oslo = await place('Noruega', 'NO');
    const nowhere = await place(null, null);

    await trip(traveller.id, 'COMPLETED', [paris, lyon, lisbon, nowhere]);
    await trip(traveller.id, 'COMPLETED', [paris]);
    // Not completed yet: Norway must not show up.
    await trip(traveller.id, 'PLANNING', [oslo]);
    // Someone else's completed trip the guest was invited to.
    const shared = await trip(traveller.id, 'COMPLETED', [lisbon]);
    await prisma.tripMember.create({
      data: { tripId: shared, userId: guest.id, permission: 'VIEWER' },
    });
  });

  afterAll(async () => {
    const users = [traveller.id, guest.id, admin.id];
    await prisma.trip.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.destinationCatalog.deleteMany({
      where: { id: { in: catalogIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  it('lists the distinct countries of the completed trips, with their trip count', async () => {
    const { body } = await visited(traveller).expect(200);

    expect(body).toEqual([
      { country: 'França', countryCode: 'FR', tripCount: 2 },
      { country: 'Portugal', countryCode: 'PT', tripCount: 2 },
    ]);
  });

  it('leaves out countries of trips that are not completed', async () => {
    const { body } = await visited(traveller).expect(200);

    expect(
      body.map((c: { countryCode: string }) => c.countryCode),
    ).not.toContain('NO');
  });

  it('includes trips the user was invited to', async () => {
    const { body } = await visited(guest).expect(200);

    expect(body).toEqual([
      { country: 'Portugal', countryCode: 'PT', tripCount: 1 },
    ]);
  });

  it('is empty for a user without completed trips', async () => {
    const { body } = await visited(admin).expect(200);

    expect(body).toEqual([]);
  });

  it('requires a token', async () => {
    await visited().expect(401);
  });

  describe('country code in the catalog', () => {
    const create = (body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/api/destination-catalog')
        .set('Authorization', bearer(admin))
        .send(body);

    it('is stored upper-case and returned', async () => {
      const { body } = await create({
        name: `Kyoto ${run}`,
        country: 'Japão',
        countryCode: 'jp',
      }).expect(201);
      catalogIds.push(body.id);

      expect(body.countryCode).toBe('JP');
    });

    it('rejects a code that is not an ISO 3166-1 alpha-2 country', async () => {
      await create({ name: `Nowhere ${run}`, countryCode: 'ZZZ' }).expect(422);
    });
  });
});
