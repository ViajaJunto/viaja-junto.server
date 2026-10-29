import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { inviteCode } from './helpers.js';
import { AppModule } from './../src/app.module.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';

type Account = { id: string; email: string };

describe('Dashboard and scoped lists (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let owner: Account;
  let editor: Account;
  let viewer: Account;
  let stranger: Account;
  let tripId: string;
  let otherTripId: string;
  let catalogId: string;
  let activityId: string;
  const destinationIds: string[] = [];

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string) =>
    prisma.user.create({
      data: { name, email: `${name}-${run}@example.com` },
    });

  const get = (path: string, user?: Account) => {
    const req = request(app.getHttpServer()).get(`/api${path}`);
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

    [owner, editor, viewer, stranger] = await Promise.all([
      account('owner'),
      account('editor'),
      account('viewer'),
      account('stranger'),
    ]);

    // Created one after the other so "newest first" is deterministic.
    const older = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Older ${run}`,
        createdBy: owner.id,
        status: 'COMPLETED',
      },
    });
    const newer = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Newer ${run}`,
        createdBy: owner.id,
        status: 'PLANNING',
      },
    });
    tripId = newer.id;
    const foreign = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Foreign ${run}`,
        createdBy: stranger.id,
      },
    });
    otherTripId = foreign.id;
    await prisma.trip.update({
      where: { id: older.id },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });

    await prisma.tripMember.createMany({
      data: [
        { tripId, userId: editor.id, permission: 'EDITOR' },
        { tripId, userId: viewer.id, permission: 'VIEWER' },
        { tripId: foreign.id, userId: owner.id, permission: 'VIEWER' },
      ],
    });

    const catalog = await prisma.destinationCatalog.create({
      data: { name: `City ${run}` },
    });
    catalogId = catalog.id;
    // Inserted out of itinerary order on purpose.
    for (const order of [2, 0, 1]) {
      const destination = await prisma.tripDestination.create({
        data: { tripId, destinationCatalogId: catalogId, order },
      });
      destinationIds.push(destination.id);
    }
    await prisma.tripDestination.create({
      data: { tripId: foreign.id, destinationCatalogId: catalogId, order: 0 },
    });

    const activity = await prisma.activityCatalog.create({
      data: { name: `Tour ${run}` },
    });
    activityId = activity.id;
    await prisma.tripActivity.createMany({
      data: [
        { tripDestinationId: destinationIds[0], activityCatalogId: activityId },
        {
          tripDestinationId: destinationIds[1],
          activityCatalogId: activityId,
          dateTime: new Date('2026-07-02T10:00:00Z'),
        },
      ],
    });
    await prisma.review.createMany({
      data: [
        {
          userId: owner.id,
          activityId,
          rating: 4,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          userId: editor.id,
          activityId,
          rating: 5,
          createdAt: new Date('2026-02-01T00:00:00Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    const users = [owner.id, editor.id, viewer.id, stranger.id];
    await prisma.trip.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.activityCatalog.delete({ where: { id: activityId } });
    await prisma.destinationCatalog.delete({ where: { id: catalogId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  describe('GET /trips (dashboard)', () => {
    it('lists the caller’s own and joined trips, newest first, with their role', async () => {
      const { body } = await get('/trips', owner).expect(200);

      expect(body.data.map((t: { name: string }) => t.name)).toEqual([
        `Foreign ${run}`,
        `Newer ${run}`,
        `Older ${run}`,
      ]);
      const roles = Object.fromEntries(
        body.data.map((t: { name: string; role: string }) => [t.name, t.role]),
      );
      expect(roles).toEqual({
        [`Foreign ${run}`]: 'VIEWER',
        [`Newer ${run}`]: 'OWNER',
        [`Older ${run}`]: 'OWNER',
      });
    });

    it('reports the permission an invited member holds', async () => {
      const { body } = await get('/trips', editor).expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({ id: tripId, role: 'EDITOR' });
    });

    it('filters by planning stage', async () => {
      const { body } = await get('/trips?status=COMPLETED', owner).expect(200);

      expect(body.data.map((t: { name: string }) => t.name)).toEqual([
        `Older ${run}`,
      ]);
      expect(body.meta.total).toBe(1);
    });

    it('rejects an unknown status with 422', async () => {
      await get('/trips?status=NOPE', owner).expect(422);
    });

    it('returns nothing to someone with no trips', async () => {
      const lone = await account('lone');
      const { body } = await get('/trips', lone).expect(200);
      await prisma.user.delete({ where: { id: lone.id } });

      expect(body.data).toEqual([]);
    });

    it('includes the role on a single trip too', async () => {
      const { body } = await get(`/trips/${tripId}`, viewer).expect(200);

      expect(body.role).toBe('VIEWER');
    });
  });

  describe('lists scoped to a parent', () => {
    it('lists the destinations of a trip in itinerary order', async () => {
      const { body } = await get(
        `/trip-destinations?tripId=${tripId}`,
        editor,
      ).expect(200);

      expect(body.data.map((d: { order: number }) => d.order)).toEqual([
        0, 1, 2,
      ]);
      expect(body.meta.total).toBe(3);
    });

    it('answers 404 for the destinations of a trip the caller cannot see', async () => {
      await get(`/trip-destinations?tripId=${tripId}`, stranger).expect(404);
    });

    it('lists the members of a trip', async () => {
      const { body } = await get(
        `/trip-members?tripId=${tripId}`,
        viewer,
      ).expect(200);

      expect(body.meta.total).toBe(2);
      await get(`/trip-members?tripId=${tripId}`, stranger).expect(404);
    });

    it('lists the planned activities of a destination in chronological order', async () => {
      const { body } = await get(
        `/trip-activities?tripDestinationId=${destinationIds[1]}`,
        owner,
      ).expect(200);

      expect(body.meta.total).toBe(1);
      await get(
        `/trip-activities?tripDestinationId=${destinationIds[1]}`,
        stranger,
      ).expect(404);
    });

    it('rejects a malformed parent id with 422', async () => {
      await get('/trip-destinations?tripId=nope', owner).expect(422);
    });

    it('lists the reviews of an activity, newest first, without a token', async () => {
      const { body } = await get(`/reviews?activityId=${activityId}`).expect(
        200,
      );

      expect(body.data.map((r: { rating: number }) => r.rating)).toEqual([
        5, 4,
      ]);
    });
  });

  describe('PUT /trips/:id/destinations/order', () => {
    const put = (user: Account, id: string, ids: string[]) =>
      request(app.getHttpServer())
        .put(`/api/trips/${id}/destinations/order`)
        .set('Authorization', bearer(user))
        .send({ destinationIds: ids });

    it('rewrites the order as 0..n-1 and returns the new itinerary', async () => {
      const current = await get(`/trip-destinations?tripId=${tripId}`, owner);
      const reversed: string[] = current.body.data
        .map((d: { id: string }) => d.id)
        .reverse();

      const { body } = await put(editor, tripId, reversed).expect(200);

      expect(body.map((d: { id: string }) => d.id)).toEqual(reversed);
      expect(body.map((d: { order: number }) => d.order)).toEqual([0, 1, 2]);
    });

    it('rejects ids that are not exactly the trip’s destinations', async () => {
      await put(owner, tripId, [destinationIds[0]]).expect(422);
      await put(owner, tripId, [
        destinationIds[0],
        destinationIds[0],
        destinationIds[1],
      ]).expect(422);
      await put(owner, tripId, [...destinationIds, randomUUID()]).expect(422);
    });

    it('forbids a viewer', async () => {
      await put(viewer, tripId, destinationIds).expect(403);
    });

    it('answers 404 for a trip the caller cannot see', async () => {
      await put(stranger, tripId, destinationIds).expect(404);
    });

    it('does not let someone reorder another trip’s destinations', async () => {
      await put(owner, otherTripId, destinationIds).expect(403);
    });
  });
});
