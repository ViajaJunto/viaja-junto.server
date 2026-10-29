import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Trip destinations (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let editor: Account;
  let viewer: Account;
  let outsider: Account;
  let tripId: string;
  let catalogId: string;

  beforeAll(async () => {
    t = await startApp();
    [owner, editor, viewer, outsider] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);
    tripId = (await t.data.trip(owner)).id;
    await t.data.member(tripId, editor, 'EDITOR');
    await t.data.member(tripId, viewer, 'VIEWER');
    catalogId = (await t.data.destination()).id;
  });

  afterAll(() => t.close());

  const add = (user: Account, body: object = {}) =>
    t.as(user).post('/trip-destinations', {
      tripId,
      destinationCatalogId: catalogId,
      ...body,
    });

  describe('adding', () => {
    it('lets the creator and an editor add a stop to the itinerary', async () => {
      const first = await add(owner, {
        order: 1,
        arrival: '2026-07-02',
        departure: '2026-07-05',
        description: 'Primeira parada',
      }).expect(201);
      await add(editor).expect(201);

      expect(first.body).toMatchObject({
        tripId,
        destinationCatalogId: catalogId,
        order: 1,
        description: 'Primeira parada',
        arrival: '2026-07-02T00:00:00.000Z',
      });
    });

    it('forbids viewers and hides the trip from outsiders', async () => {
      await add(viewer).expect(403);
      await add(outsider).expect(404);
    });

    it('answers 404 for a catalog destination that does not exist', async () => {
      await add(owner, { destinationCatalogId: randomUUID() }).expect(404);
    });

    it.each([
      ['a negative order', { order: -1 }],
      ['a fractional order', { order: 1.5 }],
      ['a malformed date', { arrival: 'soon' }],
      [
        'a departure before the arrival',
        { arrival: '2026-07-05', departure: '2026-07-01' },
      ],
      ['no catalog destination', { destinationCatalogId: undefined }],
    ])('rejects %s with 422', async (_name, overrides) => {
      await add(owner, overrides).expect(422);
    });
  });

  describe('listing', () => {
    let listTrip: string;

    beforeAll(async () => {
      listTrip = (await t.data.trip(owner)).id;
      const place = await t.data.destination();
      // Inserted out of itinerary order, one without a position.
      for (const order of [3, null, 1, 2]) {
        await t.prisma.tripDestination.create({
          data: { tripId: listTrip, destinationCatalogId: place.id, order },
        });
      }
    });

    it('lists the itinerary in order, stops without a position last', async () => {
      const { body } = await t
        .as(owner)
        .get(`/trip-destinations?tripId=${listTrip}`)
        .expect(200);

      expect(body.data.map((d: { order: number | null }) => d.order)).toEqual([
        1,
        2,
        3,
        null,
      ]);
      expectPage(body, { page: 1, limit: 20, total: 4 });
    });

    it('paginates in the same order', async () => {
      const page2 = await t
        .as(owner)
        .get(`/trip-destinations?tripId=${listTrip}&limit=3&page=2`)
        .expect(200);

      expect(
        page2.body.data.map((d: { order: number | null }) => d.order),
      ).toEqual([null]);
      expectPage(page2.body, { page: 2, limit: 3, total: 4 });
    });

    it('is scoped to trips the caller can see', async () => {
      await t
        .as(outsider)
        .get(`/trip-destinations?tripId=${listTrip}`)
        .expect(404);
      const { body } = await t
        .as(outsider)
        .get('/trip-destinations')
        .expect(200);
      expect(
        body.data.every((d: { tripId: string }) => d.tripId !== listTrip),
      ).toBe(true);
    });
  });

  describe('reading, changing and removing', () => {
    let id: string;

    beforeEach(async () => {
      id = (await add(owner, { order: 9 }).expect(201)).body.id;
    });

    it('reads one stop, for members only', async () => {
      await t.as(viewer).get(`/trip-destinations/${id}`).expect(200);
      await t.as(outsider).get(`/trip-destinations/${id}`).expect(404);
      await t.as(owner).get(`/trip-destinations/${randomUUID()}`).expect(404);
      await t.as(owner).get('/trip-destinations/not-a-uuid').expect(400);
    });

    it('lets editors change it, but not which trip or which catalog entry it is', async () => {
      const { body } = await t
        .as(editor)
        .patch(`/trip-destinations/${id}`, { description: 'Mudou', order: 2 })
        .expect(200);

      expect(body).toMatchObject({ description: 'Mudou', order: 2 });
      await t
        .as(editor)
        .patch(`/trip-destinations/${id}`, { tripId: randomUUID() })
        .expect(422);
      await t
        .as(editor)
        .patch(`/trip-destinations/${id}`, {
          destinationCatalogId: randomUUID(),
        })
        .expect(422);
      await t
        .as(viewer)
        .patch(`/trip-destinations/${id}`, { description: 'x' })
        .expect(403);
    });

    it('lets editors delete it, taking its planned activities along', async () => {
      const activity = await t.data.activity();
      await t.prisma.tripActivity.create({
        data: { tripDestinationId: id, activityCatalogId: activity.id },
      });

      await t.as(viewer).delete(`/trip-destinations/${id}`).expect(403);
      await t.as(editor).delete(`/trip-destinations/${id}`).expect(204);

      await t.as(owner).get(`/trip-destinations/${id}`).expect(404);
      expect(
        await t.prisma.tripActivity.count({ where: { tripDestinationId: id } }),
      ).toBe(0);
    });
  });
});
