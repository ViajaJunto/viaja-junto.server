import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Trip activities (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let editor: Account;
  let viewer: Account;
  let outsider: Account;
  let stopId: string;
  let activityCatalogId: string;

  beforeAll(async () => {
    t = await startApp();
    [owner, editor, viewer, outsider] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);
    const trip = await t.data.trip(owner);
    await t.data.member(trip.id, editor, 'EDITOR');
    await t.data.member(trip.id, viewer, 'VIEWER');
    const place = await t.data.destination();
    stopId = (
      await t.prisma.tripDestination.create({
        data: {
          tripId: trip.id,
          destinationCatalogId: place.id,
          arrival: new Date('2026-07-01'),
          departure: new Date('2026-07-10'),
        },
      })
    ).id;
    activityCatalogId = (await t.data.activity()).id;
  });

  afterAll(() => t.close());

  const plan = (user: Account, body: object = {}) =>
    t.as(user).post('/trip-activities', {
      tripDestinationId: stopId,
      activityCatalogId,
      ...body,
    });

  describe('planning', () => {
    it('lets the creator and an editor plan an activity, with the defaults', async () => {
      const { body } = await plan(owner, {
        dateTime: '2026-07-03T10:00:00Z',
        durationMinutes: 120,
        expectedCost: 45.5,
      }).expect(201);

      expect(body).toMatchObject({
        tripDestinationId: stopId,
        activityCatalogId,
        durationMinutes: 120,
        expectedCost: 45.5,
        status: 'PENDING',
      });
      await plan(editor).expect(201);
    });

    it('forbids viewers and hides the trip from outsiders', async () => {
      await plan(viewer).expect(403);
      await plan(outsider).expect(404);
    });

    it('answers 404 for a stop or a catalog activity that does not exist', async () => {
      await plan(owner, { tripDestinationId: randomUUID() }).expect(404);
      await plan(owner, { activityCatalogId: randomUUID() }).expect(404);
    });

    it.each([
      ['a negative cost', { expectedCost: -1 }],
      ['a cost with three decimals', { expectedCost: 1.234 }],
      ['a zero duration', { durationMinutes: 0 }],
      ['a duration above a week', { durationMinutes: 10081 }],
      ['an unknown status', { status: 'DONE' }],
      ['a date outside the stay', { dateTime: '2026-08-01T10:00:00Z' }],
    ])('rejects %s with 422', async (_name, overrides) => {
      await plan(owner, overrides).expect(422);
    });
  });

  describe('listing', () => {
    let listStop: string;

    beforeAll(async () => {
      const trip = await t.data.trip(owner);
      const place = await t.data.destination();
      listStop = (
        await t.prisma.tripDestination.create({
          data: { tripId: trip.id, destinationCatalogId: place.id },
        })
      ).id;
      const dates = [
        new Date('2026-07-03T09:00:00Z'),
        null,
        new Date('2026-07-01T09:00:00Z'),
        new Date('2026-07-02T09:00:00Z'),
      ];
      for (const dateTime of dates) {
        await t.prisma.tripActivity.create({
          data: { tripDestinationId: listStop, activityCatalogId, dateTime },
        });
      }
    });

    it('lists the plan in chronological order, undated activities last', async () => {
      const { body } = await t
        .as(owner)
        .get(`/trip-activities?tripDestinationId=${listStop}`)
        .expect(200);

      expect(
        body.data.map((a: { dateTime: string | null }) => a.dateTime),
      ).toEqual([
        '2026-07-01T09:00:00.000Z',
        '2026-07-02T09:00:00.000Z',
        '2026-07-03T09:00:00.000Z',
        null,
      ]);
      expectPage(body, { page: 1, limit: 20, total: 4 });
    });

    it('paginates in the same order', async () => {
      const { body } = await t
        .as(owner)
        .get(`/trip-activities?tripDestinationId=${listStop}&limit=3&page=2`)
        .expect(200);

      expect(
        body.data.map((a: { dateTime: string | null }) => a.dateTime),
      ).toEqual([null]);
      expectPage(body, { page: 2, limit: 3, total: 4 });
    });

    it('is scoped to stops the caller can see', async () => {
      await t
        .as(outsider)
        .get(`/trip-activities?tripDestinationId=${listStop}`)
        .expect(404);
      await t
        .as(outsider)
        .get(`/trip-activities?tripDestinationId=${randomUUID()}`)
        .expect(404);
    });
  });

  describe('reading, changing and removing', () => {
    let id: string;

    beforeEach(async () => {
      id = (await plan(owner).expect(201)).body.id;
    });

    it('reads one activity, for members only', async () => {
      await t.as(viewer).get(`/trip-activities/${id}`).expect(200);
      await t.as(outsider).get(`/trip-activities/${id}`).expect(404);
      await t.as(owner).get(`/trip-activities/${randomUUID()}`).expect(404);
      await t.as(owner).get('/trip-activities/not-a-uuid').expect(400);
    });

    it('lets editors change it, but not where or what it is', async () => {
      const { body } = await t
        .as(editor)
        .patch(`/trip-activities/${id}`, {
          status: 'CONFIRMED',
          expectedCost: 10,
        })
        .expect(200);

      expect(body).toMatchObject({ status: 'CONFIRMED', expectedCost: 10 });
      await t
        .as(editor)
        .patch(`/trip-activities/${id}`, { tripDestinationId: randomUUID() })
        .expect(422);
      await t
        .as(editor)
        .patch(`/trip-activities/${id}`, { activityCatalogId: randomUUID() })
        .expect(422);
      await t
        .as(viewer)
        .patch(`/trip-activities/${id}`, { status: 'COMPLETED' })
        .expect(403);
    });

    it('lets editors delete it', async () => {
      await t.as(viewer).delete(`/trip-activities/${id}`).expect(403);
      await t.as(editor).delete(`/trip-activities/${id}`).expect(204);

      await t.as(owner).get(`/trip-activities/${id}`).expect(404);
    });
  });
});
