import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inviteCode } from './helpers.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';

type Account = { id: string; email: string };

describe('Catalog permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let member: Account;
  let admin: Account;

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string, role: 'USER' | 'ADMIN' = 'USER') =>
    prisma.user.create({
      data: { name, email: `${name}-${run}@example.com`, role },
    });

  const createdDestinations: string[] = [];
  const createdActivities: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    member = await account('member');
    admin = await account('admin', 'ADMIN');
  });

  afterAll(async () => {
    await prisma.trip.deleteMany({ where: { createdBy: member.id } });
    await prisma.destinationCatalog.deleteMany({
      where: { id: { in: createdDestinations } },
    });
    await prisma.activityCatalog.deleteMany({
      where: { id: { in: createdActivities } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [member.id, admin.id] } },
    });
    await app.close();
  });

  describe.each([
    {
      path: 'destination-catalog',
      payload: { name: `Lisbon ${run}` },
      track: createdDestinations,
    },
    {
      path: 'activity-catalog',
      payload: { name: `Fado night ${run}`, type: 'TOUR' },
      track: createdActivities,
    },
  ])('/$path', ({ path, payload, track }) => {
    let id: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/${path}`)
        .set('Authorization', bearer(admin))
        .send(payload)
        .expect(201);

      id = response.body.id;
      track.push(id);
    });

    it('forbids a regular user from creating an entry', async () => {
      await request(app.getHttpServer())
        .post(`/api/${path}`)
        .set('Authorization', bearer(member))
        .send(payload)
        .expect(403);
    });

    it('forbids a regular user from editing an entry', async () => {
      await request(app.getHttpServer())
        .patch(`/api/${path}/${id}`)
        .set('Authorization', bearer(member))
        .send({ description: 'vandalism' })
        .expect(403);
    });

    it('forbids a regular user from uploading a photo', async () => {
      await request(app.getHttpServer())
        .put(`/api/${path}/${id}/photo`)
        .set('Authorization', bearer(member))
        .attach(
          'file',
          readFileSync('prisma/seed-assets/destinations/london.jpg'),
          {
            filename: 'a.jpg',
            contentType: 'image/jpeg',
          },
        )
        .expect(403);
    });

    it('forbids a regular user from deleting an entry', async () => {
      await request(app.getHttpServer())
        .delete(`/api/${path}/${id}`)
        .set('Authorization', bearer(member))
        .expect(403);
    });

    it('lets an administrator edit an entry', async () => {
      await request(app.getHttpServer())
        .patch(`/api/${path}/${id}`)
        .set('Authorization', bearer(admin))
        .send({ description: 'curated' })
        .expect(200);
    });

    it('keeps reads public', async () => {
      await request(app.getHttpServer()).get(`/api/${path}/${id}`).expect(200);
    });

    it('lets an administrator delete an unused entry', async () => {
      await request(app.getHttpServer())
        .delete(`/api/${path}/${id}`)
        .set('Authorization', bearer(admin))
        .expect(204);
    });
  });

  it('lets a regular user plan a trip with catalog entries they cannot edit', async () => {
    const destination = await prisma.destinationCatalog.create({
      data: { name: `Porto ${run}` },
    });
    createdDestinations.push(destination.id);
    const trip = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Trip ${run}`,
        createdBy: member.id,
      },
    });

    await request(app.getHttpServer())
      .post('/api/trip-destinations')
      .set('Authorization', bearer(member))
      .send({ tripId: trip.id, destinationCatalogId: destination.id })
      .expect(201);
  });

  it('refuses to delete an entry that a trip uses (409)', async () => {
    const [{ id }] = await prisma.destinationCatalog.findMany({
      where: {
        id: { in: createdDestinations },
        tripDestinations: { some: {} },
      },
    });

    const response = await request(app.getHttpServer())
      .delete(`/api/destination-catalog/${id}`)
      .set('Authorization', bearer(admin))
      .expect(409);

    expect(response.body.message).toBe(
      'This entry is used by trips and cannot be deleted',
    );
  });
});
