import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Trips (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let editor: Account;
  let viewer: Account;
  let outsider: Account;

  beforeAll(async () => {
    t = await startApp();
    [owner, editor, viewer, outsider] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);
  });

  afterAll(() => t.close());

  describe('creating', () => {
    it('makes the caller the owner, defaults the stage and the currency, and hides the invite code', async () => {
      const { body } = await t
        .as(owner)
        .post('/trips', { name: 'Eurotrip 2026' })
        .expect(201);

      expect(body).toMatchObject({
        name: 'Eurotrip 2026',
        status: 'PLANNING',
        currency: 'BRL',
        createdBy: owner.id,
        role: 'OWNER',
        description: null,
        startDate: null,
        endDate: null,
      });
      expect(body).not.toHaveProperty('inviteCode');
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('stores the dates and the stage that were sent', async () => {
      const { body } = await t
        .as(owner)
        .post('/trips', {
          name: 'Dated',
          description: 'Duas semanas',
          startDate: '2026-07-01',
          endDate: '2026-07-15',
          status: 'CONFIRMED',
        })
        .expect(201);

      expect(body).toMatchObject({
        description: 'Duas semanas',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-15T00:00:00.000Z',
        status: 'CONFIRMED',
      });
    });

    it.each([
      ['no name', {}],
      ['a one-letter name', { name: 'x' }],
      ['an unknown stage', { name: 'Trip', status: 'DONE' }],
      [
        'a createdBy that is not allowed',
        { name: 'Trip', createdBy: randomUUID() },
      ],
      ['a malformed date', { name: 'Trip', startDate: 'tomorrow' }],
    ])('rejects %s with 422', async (_name, payload) => {
      await t.as(owner).post('/trips', payload).expect(422);
    });

    it('requires a token', async () => {
      await t.anonymous.post('/trips', { name: 'Trip' }).expect(401);
    });
  });

  describe('listing', () => {
    let reader: Account;
    const names: string[] = [];

    beforeAll(async () => {
      reader = await t.data.user();
      // Created one after the other so "newest first" is unambiguous.
      for (let i = 1; i <= 5; i++) {
        const trip = await t.data.trip(reader, {
          name: `Listed ${t.data.tag} ${i}`,
          createdAt: new Date(Date.UTC(2026, 0, i)),
        });
        names.push(trip.name);
      }
    });

    it('lists the caller’s trips, newest first', async () => {
      const { body } = await t.as(reader).get('/trips').expect(200);

      expect(body.data.map((trip: { name: string }) => trip.name)).toEqual(
        [...names].reverse(),
      );
      expectPage(body, { page: 1, limit: 20, total: 5 });
    });

    it('paginates with a stable order', async () => {
      const page1 = await t.as(reader).get('/trips?limit=2&page=1').expect(200);
      const page2 = await t.as(reader).get('/trips?limit=2&page=2').expect(200);
      const page3 = await t.as(reader).get('/trips?limit=2&page=3').expect(200);

      expectPage(page1.body, { page: 1, limit: 2, total: 5 });
      expectPage(page2.body, { page: 2, limit: 2, total: 5 });
      expectPage(page3.body, { page: 3, limit: 2, total: 5 });
      const seen = [page1, page2, page3].flatMap((r) =>
        r.body.data.map((trip: { name: string }) => trip.name),
      );
      expect(seen).toEqual([...names].reverse());
      expect(page3.body.data).toHaveLength(1);
    });

    it('past the last page is empty but still reports the total', async () => {
      const { body } = await t
        .as(reader)
        .get('/trips?limit=2&page=9')
        .expect(200);

      expect(body.data).toEqual([]);
      expect(body.meta).toMatchObject({
        total: 5,
        hasNext: false,
        hasPrevious: true,
      });
    });

    it('does not show other people’s trips', async () => {
      const { body } = await t.as(outsider).get('/trips').expect(200);

      expect(
        body.data.every((trip: { name: string }) => !names.includes(trip.name)),
      ).toBe(true);
    });
  });

  describe('reading, changing and deleting', () => {
    let tripId: string;

    beforeEach(async () => {
      const trip = await t.data.trip(owner);
      tripId = trip.id;
      await t.data.member(tripId, editor, 'EDITOR');
      await t.data.member(tripId, viewer, 'VIEWER');
    });

    it('lets members read it, with the role they hold', async () => {
      const asOwner = await t.as(owner).get(`/trips/${tripId}`).expect(200);
      const asEditor = await t.as(editor).get(`/trips/${tripId}`).expect(200);
      const asViewer = await t.as(viewer).get(`/trips/${tripId}`).expect(200);

      expect([
        asOwner.body.role,
        asEditor.body.role,
        asViewer.body.role,
      ]).toEqual(['OWNER', 'EDITOR', 'VIEWER']);
    });

    it('hides it from outsiders and answers 404 / 400 for unknown or malformed ids', async () => {
      await t.as(outsider).get(`/trips/${tripId}`).expect(404);
      await t.as(owner).get(`/trips/${randomUUID()}`).expect(404);
      await t.as(owner).get('/trips/not-a-uuid').expect(400);
    });

    it('lets only the creator change it', async () => {
      const { body } = await t
        .as(owner)
        .patch(`/trips/${tripId}`, { name: 'Renamed', status: 'COMPLETED' })
        .expect(200);

      expect(body).toMatchObject({ name: 'Renamed', status: 'COMPLETED' });
      await t
        .as(editor)
        .patch(`/trips/${tripId}`, { name: 'Other name' })
        .expect(403);
      await t
        .as(viewer)
        .patch(`/trips/${tripId}`, { name: 'Other name' })
        .expect(403);
      await t
        .as(outsider)
        .patch(`/trips/${tripId}`, { name: 'Other name' })
        .expect(404);
    });

    it('lets only the creator delete it, and takes everything in it along', async () => {
      const catalog = await t.data.destination();
      const activityCatalog = await t.data.activity();
      const destination = await t.prisma.tripDestination.create({
        data: { tripId, destinationCatalogId: catalog.id },
      });
      await t.prisma.tripActivity.create({
        data: {
          tripDestinationId: destination.id,
          activityCatalogId: activityCatalog.id,
        },
      });
      await t.prisma.budget.create({ data: { tripId, totalValue: 100 } });

      await t.as(editor).delete(`/trips/${tripId}`).expect(403);
      await t.as(owner).delete(`/trips/${tripId}`).expect(204);

      await t.as(owner).get(`/trips/${tripId}`).expect(404);
      expect(await t.prisma.tripMember.count({ where: { tripId } })).toBe(0);
      expect(await t.prisma.tripDestination.count({ where: { tripId } })).toBe(
        0,
      );
      expect(
        await t.prisma.tripActivity.count({
          where: { tripDestinationId: destination.id },
        }),
      ).toBe(0);
      expect(await t.prisma.budget.count({ where: { tripId } })).toBe(0);
    });
  });
});
