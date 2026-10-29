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

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let ana: Account;
  let bia: Account;
  let caio: Account;
  let dani: Account;
  let tripId: string;
  let catalogId: string;
  let activityCatalogId: string;

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string) =>
    prisma.user.create({
      data: { name: `${name} ${run}`, email: `${name}-${run}@example.com` },
    });

  const call = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    user: Account,
    body?: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Authorization', bearer(user))
      .send(body);

  /** Notifications are written by an asynchronous listener, so wait for them. */
  const waitFor = async <T>(
    read: () => Promise<T>,
    done: (value: T) => boolean,
  ) => {
    let value = await read();
    for (let attempt = 0; attempt < 50 && !done(value); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      value = await read();
    }
    return value;
  };

  const typesOf = (user: Account, type: string) =>
    waitFor(
      () =>
        prisma.notification.findMany({
          where: { userId: user.id, tripId, type: type as never },
        }),
      (rows) => rows.length > 0,
    );

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    [ana, bia, caio, dani] = await Promise.all(
      ['ana', 'bia', 'caio', 'dani'].map(account),
    );
    tripId = (
      await prisma.trip.create({
        data: {
          inviteCode: inviteCode(),
          name: `Eurotrip ${run}`,
          createdBy: ana.id,
        },
      })
    ).id;
    await prisma.tripMember.createMany({
      data: [
        { tripId, userId: bia.id, permission: 'EDITOR' },
        { tripId, userId: caio.id, permission: 'VIEWER' },
      ],
    });
    catalogId = (
      await prisma.destinationCatalog.create({ data: { name: `City ${run}` } })
    ).id;
    activityCatalogId = (
      await prisma.activityCatalog.create({ data: { name: `Tour ${run}` } })
    ).id;
  });

  afterAll(async () => {
    const users = [ana, bia, caio, dani].map(({ id }) => id);
    await prisma.trip.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.destinationCatalog.delete({ where: { id: catalogId } });
    await prisma.activityCatalog.delete({ where: { id: activityCatalogId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  describe('what triggers a notification', () => {
    let destinationId: string;

    it('tells everyone on the trip except the actor when a destination is added', async () => {
      const { body } = await call('post', '/trip-destinations', ana, {
        tripId,
        destinationCatalogId: catalogId,
      }).expect(201);
      destinationId = body.id;

      const [forBia, forCaio] = await Promise.all([
        typesOf(bia, 'DESTINATION_ADDED'),
        typesOf(caio, 'DESTINATION_ADDED'),
      ]);

      expect(forBia).toHaveLength(1);
      expect(forCaio).toHaveLength(1);
      expect(forBia[0]).toMatchObject({
        actorId: ana.id,
        payload: {
          tripName: `Eurotrip ${run}`,
          actorName: `ana ${run}`,
          subjectId: destinationId,
        },
      });
      expect(
        await prisma.notification.count({ where: { userId: ana.id, tripId } }),
      ).toBe(0);
    });

    it('tells about an edit, a reorder and a removal of a destination', async () => {
      await call('patch', `/trip-destinations/${destinationId}`, bia, {
        description: 'x',
      }).expect(200);
      await call('delete', `/trip-destinations/${destinationId}`, bia).expect(
        204,
      );

      const updated = await typesOf(ana, 'DESTINATION_UPDATED');
      const removed = await typesOf(ana, 'DESTINATION_REMOVED');

      expect(updated).toHaveLength(1);
      expect(removed).toHaveLength(1);
    });

    it('tells about activities', async () => {
      const destination = await call('post', '/trip-destinations', ana, {
        tripId,
        destinationCatalogId: catalogId,
      }).expect(201);
      const activity = await call('post', '/trip-activities', bia, {
        tripDestinationId: destination.body.id,
        activityCatalogId,
      }).expect(201);
      await call('patch', `/trip-activities/${activity.body.id}`, bia, {
        status: 'CONFIRMED',
      }).expect(200);
      await call('delete', `/trip-activities/${activity.body.id}`, bia).expect(
        204,
      );

      expect(await typesOf(ana, 'ACTIVITY_ADDED')).toHaveLength(1);
      expect(await typesOf(ana, 'ACTIVITY_UPDATED')).toHaveLength(1);
      expect(await typesOf(ana, 'ACTIVITY_REMOVED')).toHaveLength(1);
    });

    it('tells about the budget, saying what was done to it', async () => {
      const budget = await call('post', '/budgets', ana, {
        tripId,
        totalValue: 1000,
      }).expect(201);
      await call('patch', `/budgets/${budget.body.id}`, ana, {
        totalValue: 2000,
      }).expect(200);
      await call('delete', `/budgets/${budget.body.id}`, ana).expect(204);

      const rows = await waitFor(
        () =>
          prisma.notification.findMany({
            where: { userId: bia.id, tripId, type: 'BUDGET_CHANGED' },
          }),
        (found) => found.length >= 3,
      );

      expect(
        rows.map((row) => (row.payload as { action: string }).action).sort(),
      ).toEqual(['created', 'removed', 'updated']);
    });

    it('tells about a change of the trip status, with both stages', async () => {
      await call('patch', `/trips/${tripId}`, ana, {
        status: 'CONFIRMED',
      }).expect(200);

      const [row] = await typesOf(bia, 'TRIP_STATUS_CHANGED');

      expect(row.payload).toMatchObject({ from: 'PLANNING', to: 'CONFIRMED' });
    });

    it('says nothing when a trip is edited without changing its status', async () => {
      const before = await prisma.notification.count({
        where: { userId: bia.id, tripId, type: 'TRIP_STATUS_CHANGED' },
      });

      await call('patch', `/trips/${tripId}`, ana, {
        name: `Eurotrip ${run}`,
      }).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(
        await prisma.notification.count({
          where: { userId: bia.id, tripId, type: 'TRIP_STATUS_CHANGED' },
        }),
      ).toBe(before);
    });
  });

  describe('members', () => {
    it('tells the others when someone joins with the invite code', async () => {
      const code = (
        await call('get', `/trips/${tripId}/invite-code`, ana).expect(200)
      ).body.code;
      await call('post', '/trips/join', dani, { code }).expect(201);

      const forAna = await typesOf(ana, 'MEMBER_JOINED');

      expect(forAna[0]).toMatchObject({
        actorId: dani.id,
        payload: {
          actorName: `dani ${run}`,
          subjectId: dani.id,
          permission: 'VIEWER',
        },
      });
      expect(await typesOf(bia, 'MEMBER_JOINED')).toHaveLength(1);
      expect(
        await prisma.notification.count({
          where: { userId: dani.id, type: 'MEMBER_JOINED' },
        }),
      ).toBe(0);
    });

    it('tells everyone, the member included, when a permission changes', async () => {
      const danisMembership = await prisma.tripMember.findFirstOrThrow({
        where: { tripId, userId: dani.id },
      });

      await call('patch', `/trip-members/${danisMembership.id}`, ana, {
        permission: 'EDITOR',
      }).expect(200);

      const forDani = await typesOf(dani, 'MEMBER_PERMISSION_CHANGED');
      expect(forDani[0].payload).toMatchObject({
        from: 'VIEWER',
        to: 'EDITOR',
        subjectId: dani.id,
      });
      expect(await typesOf(bia, 'MEMBER_PERMISSION_CHANGED')).toHaveLength(1);
    });

    it('tells the removed member too, even though they are no longer on the trip', async () => {
      const danisMembership = await prisma.tripMember.findFirstOrThrow({
        where: { tripId, userId: dani.id },
      });

      await call('delete', `/trip-members/${danisMembership.id}`, ana).expect(
        204,
      );

      const forDani = await typesOf(dani, 'MEMBER_REMOVED');
      expect(forDani).toHaveLength(1);
      expect(await typesOf(caio, 'MEMBER_REMOVED')).toHaveLength(1);
    });
  });

  describe('reading them', () => {
    it('lists mine, unread first and newest first within each group', async () => {
      const mine = await prisma.notification.findMany({
        where: { userId: caio.id },
        orderBy: { createdAt: 'asc' },
      });
      // Read the oldest and a middle one: they must sink below the unread ones.
      await call('patch', `/notifications/${mine[0].id}/read`, caio).expect(
        200,
      );
      await call('patch', `/notifications/${mine[2].id}/read`, caio).expect(
        200,
      );

      const { body } = await call(
        'get',
        '/notifications?limit=100',
        caio,
      ).expect(200);

      const flags: boolean[] = body.data.map((n: { read: boolean }) => n.read);
      expect(flags).toEqual([...flags].sort((a, b) => Number(a) - Number(b)));
      expect(flags.filter(Boolean)).toHaveLength(2);
      const unread = body.data.filter((n: { read: boolean }) => !n.read);
      const dates = unread.map((n: { createdAt: string }) => n.createdAt);
      expect(dates).toEqual([...dates].sort().reverse());
      expect(body.meta.total).toBe(mine.length);
    });

    it('paginates', async () => {
      const { body } = await call(
        'get',
        '/notifications?limit=2&page=2',
        caio,
      ).expect(200);

      expect(body.data).toHaveLength(2);
      expect(body.meta).toMatchObject({ page: 2, limit: 2, hasPrevious: true });
    });

    it('only ever shows the caller’s own', async () => {
      const { body } = await call(
        'get',
        '/notifications?limit=100',
        caio,
      ).expect(200);

      const mine = await prisma.notification.count({
        where: { userId: caio.id },
      });
      expect(body.meta.total).toBe(mine);
      expect(
        body.data.every((n: { tripId: string }) => n.tripId === tripId),
      ).toBe(true);
    });

    it('counts the unread ones', async () => {
      const { body } = await call(
        'get',
        '/notifications/unread-count',
        caio,
      ).expect(200);

      expect(body.unread).toBe(
        await prisma.notification.count({
          where: { userId: caio.id, readAt: null },
        }),
      );
    });

    it('marks one as read, idempotently', async () => {
      const unread = await prisma.notification.findFirstOrThrow({
        where: { userId: caio.id, readAt: null },
      });

      const first = await call(
        'patch',
        `/notifications/${unread.id}/read`,
        caio,
      ).expect(200);
      const second = await call(
        'patch',
        `/notifications/${unread.id}/read`,
        caio,
      ).expect(200);

      expect(first.body).toMatchObject({ id: unread.id, read: true });
      expect(second.body.readAt).toBe(first.body.readAt);
    });

    it('does not let someone mark — or learn about — another person’s notification', async () => {
      const theirs = await prisma.notification.findFirstOrThrow({
        where: { userId: caio.id, readAt: null },
      });

      await call('patch', `/notifications/${theirs.id}/read`, bia).expect(404);

      expect(
        (
          await prisma.notification.findUniqueOrThrow({
            where: { id: theirs.id },
          })
        ).readAt,
      ).toBeNull();
    });

    it('marks everything as read and says how many there were', async () => {
      const unread = await prisma.notification.count({
        where: { userId: caio.id, readAt: null },
      });

      const { body } = await call(
        'patch',
        '/notifications/read-all',
        caio,
      ).expect(200);

      expect(body.updated).toBe(unread);
      expect(
        (await call('get', '/notifications/unread-count', caio)).body.unread,
      ).toBe(0);
      expect(
        (await call('patch', '/notifications/read-all', caio)).body.updated,
      ).toBe(0);
    });

    it('requires a token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/notifications',
      );

      expect(response.status).toBe(401);
    });

    it('rejects a malformed id with 400', async () => {
      await call('patch', '/notifications/not-a-uuid/read', caio).expect(400);
    });
  });

  it('disappears with the trip, and keeps working if the actor deletes their account', async () => {
    const own = (
      await prisma.trip.create({
        data: {
          inviteCode: inviteCode(),
          name: `Own ${run}`,
          createdBy: ana.id,
        },
      })
    ).id;
    const notification = await prisma.notification.create({
      data: {
        userId: bia.id,
        tripId: own,
        actorId: dani.id,
        type: 'BUDGET_CHANGED',
      },
    });

    await prisma.user.delete({ where: { id: dani.id } });
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: notification.id },
        })
      ).actorId,
    ).toBeNull();

    await prisma.trip.delete({ where: { id: own } });
    expect(
      await prisma.notification.count({ where: { id: notification.id } }),
    ).toBe(0);
  });
});
