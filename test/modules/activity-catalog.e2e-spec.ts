import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Activity catalog (e2e)', () => {
  let t: TestApp;
  let admin: Account;
  let member: Account;
  const names: string[] = [];

  beforeAll(async () => {
    t = await startApp();
    admin = await t.data.user('ADMIN');
    member = await t.data.user();
    for (const letter of ['C', 'A', 'B']) {
      names.push(
        (
          await t.data.activity({
            name: `${letter} ${t.data.tag}`,
            type: 'TOUR',
          })
        ).name,
      );
    }
  });

  afterAll(() => t.close());

  const mine = async () => {
    const { body } = await t.anonymous
      .get('/activity-catalog?limit=100')
      .expect(200);

    return body.data
      .map((a: { name: string }) => a.name)
      .filter((name: string) => name.endsWith(t.data.tag));
  };

  describe('browsing (public)', () => {
    it('lists activities A to Z, as { data, meta }, without a token', async () => {
      const { body } = await t.anonymous
        .get('/activity-catalog?limit=100')
        .expect(200);

      expect(await mine()).toEqual([...names].sort());
      expectPage(body, { page: 1, limit: 100, total: body.meta.total });
      expect(body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('paginates', async () => {
      const first = await t.anonymous
        .get('/activity-catalog?limit=1&page=1')
        .expect(200);
      // Far past the end, so rows other suites insert meanwhile cannot reach it.
      const beyond = await t.anonymous
        .get('/activity-catalog?limit=1&page=1000000')
        .expect(200);

      expectPage(first.body, {
        page: 1,
        limit: 1,
        total: first.body.meta.total,
      });
      expect(first.body.data).toHaveLength(1);
      expect(beyond.body.data).toEqual([]);
      expect(beyond.body.meta).toMatchObject({
        page: 1000000,
        hasNext: false,
        hasPrevious: true,
      });
    });

    it('reads one activity', async () => {
      const row = await t.prisma.activityCatalog.findFirstOrThrow({
        where: { name: names[0] },
      });

      const { body } = await t.anonymous
        .get(`/activity-catalog/${row.id}`)
        .expect(200);

      expect(body).toMatchObject({
        id: row.id,
        type: 'TOUR',
        averageRating: null,
      });
      await t.anonymous.get(`/activity-catalog/${randomUUID()}`).expect(404);
      await t.anonymous.get('/activity-catalog/not-a-uuid').expect(400);
    });
  });

  describe('administering', () => {
    it('lets an admin create, update and delete', async () => {
      const created = await t
        .as(admin)
        .post('/activity-catalog', {
          name: `Louvre ${t.data.tag}`,
          type: 'TOUR',
          city: 'Paris',
          country: 'França',
        })
        .expect(201);

      expect(created.body).toMatchObject({
        type: 'TOUR',
        city: 'Paris',
        averageRating: null,
      });
      const id = created.body.id;
      await t
        .as(admin)
        .patch(`/activity-catalog/${id}`, { description: 'Museu' })
        .expect(200);
      await t.as(admin).delete(`/activity-catalog/${id}`).expect(204);
      await t.anonymous.get(`/activity-catalog/${id}`).expect(404);
    });

    it('defaults the type to OTHER', async () => {
      const { body } = await t
        .as(admin)
        .post('/activity-catalog', { name: `Misc ${t.data.tag}` })
        .expect(201);

      expect(body.type).toBe('OTHER');
      await t.as(admin).delete(`/activity-catalog/${body.id}`).expect(204);
    });

    it('does not let the rating be typed in', async () => {
      await t
        .as(admin)
        .post('/activity-catalog', { name: 'Rated', averageRating: 5 })
        .expect(422);
      await t
        .as(admin)
        .post('/activity-catalog', { name: 'Rated', reviewCount: 9 })
        .expect(422);
    });

    it('forbids regular users and visitors', async () => {
      const row = await t.prisma.activityCatalog.findFirstOrThrow({
        where: { name: names[0] },
      });

      await t
        .as(member)
        .post('/activity-catalog', { name: 'Nope' })
        .expect(403);
      await t
        .as(member)
        .patch(`/activity-catalog/${row.id}`, { name: 'Nope' })
        .expect(403);
      await t.as(member).delete(`/activity-catalog/${row.id}`).expect(403);
      await t.anonymous.delete(`/activity-catalog/${row.id}`).expect(401);
    });

    it('rejects an invalid payload with 422', async () => {
      await t.as(admin).post('/activity-catalog', {}).expect(422);
      await t
        .as(admin)
        .post('/activity-catalog', { name: 'X', type: 'MOON' })
        .expect(422);
    });

    it('refuses to delete an activity that a trip uses (409)', async () => {
      const owner = await t.data.user();
      const trip = await t.data.trip(owner);
      const destination = await t.data.destination();
      const used = await t.data.activity();
      const stop = await t.prisma.tripDestination.create({
        data: { tripId: trip.id, destinationCatalogId: destination.id },
      });
      await t.prisma.tripActivity.create({
        data: { tripDestinationId: stop.id, activityCatalogId: used.id },
      });

      await t.as(admin).delete(`/activity-catalog/${used.id}`).expect(409);
    });
  });
});
