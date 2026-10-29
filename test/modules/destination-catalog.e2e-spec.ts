import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Destination catalog (e2e)', () => {
  let t: TestApp;
  let admin: Account;
  let member: Account;
  const names: string[] = [];

  beforeAll(async () => {
    t = await startApp();
    admin = await t.data.user('ADMIN');
    member = await t.data.user();
    // Inserted out of alphabetical order on purpose.
    for (const letter of ['C', 'A', 'D', 'B']) {
      names.push(
        (await t.data.destination({ name: `${letter} ${t.data.tag}` })).name,
      );
    }
  });

  afterAll(() => t.close());

  /** The suite's own destinations, in the order the API returned them. */
  const mine = async (query = '') => {
    const { body } = await t.anonymous
      .get(`/destination-catalog?limit=100${query}`)
      .expect(200);

    return body.data
      .map((d: { name: string }) => d.name)
      .filter((name: string) => name.endsWith(t.data.tag));
  };

  describe('browsing (public)', () => {
    it('lists destinations A to Z, as { data, meta }, without a token', async () => {
      const { body } = await t.anonymous
        .get('/destination-catalog?limit=100')
        .expect(200);

      expect(await mine()).toEqual([...names].sort());
      expectPage(body, { page: 1, limit: 100, total: body.meta.total });
      expect(body.meta.total).toBeGreaterThanOrEqual(4);
    });

    it('paginates in the same order', async () => {
      const first = await t.anonymous
        .get('/destination-catalog?limit=1&page=1')
        .expect(200);
      const second = await t.anonymous
        .get('/destination-catalog?limit=1&page=2')
        .expect(200);
      // Far past the end, so rows other suites insert meanwhile cannot reach it.
      const beyond = await t.anonymous
        .get('/destination-catalog?limit=1&page=1000000')
        .expect(200);

      expectPage(first.body, {
        page: 1,
        limit: 1,
        total: first.body.meta.total,
      });
      expect(first.body.data).toHaveLength(1);
      expect(second.body.data).toHaveLength(1);
      expect(second.body.meta).toMatchObject({ page: 2, hasPrevious: true });
      expect(beyond.body.data).toEqual([]);
      expect(beyond.body.meta).toMatchObject({
        hasNext: false,
        hasPrevious: true,
      });
    });

    it('reads one destination, and answers 404 / 400 for an unknown or malformed id', async () => {
      const row = await t.prisma.destinationCatalog.findFirstOrThrow({
        where: { name: names[0] },
      });

      const { body } = await t.anonymous
        .get(`/destination-catalog/${row.id}`)
        .expect(200);
      expect(body).toMatchObject({
        id: row.id,
        name: names[0],
        photoUrl: null,
      });
      await t.anonymous.get(`/destination-catalog/${randomUUID()}`).expect(404);
      await t.anonymous.get('/destination-catalog/not-a-uuid').expect(400);
    });
  });

  describe('administering', () => {
    let id: string;

    it('lets an admin create, update and delete', async () => {
      const created = await t
        .as(admin)
        .post('/destination-catalog', {
          name: `Lisbon ${t.data.tag}`,
          country: 'Portugal',
          category: 'CITY',
          latitude: 38.7223,
          longitude: -9.1393,
        })
        .expect(201);
      id = created.body.id;
      expect(created.body).toMatchObject({
        country: 'Portugal',
        category: 'CITY',
      });

      const updated = await t
        .as(admin)
        .patch(`/destination-catalog/${id}`, { description: 'A capital' })
        .expect(200);
      expect(updated.body.description).toBe('A capital');

      await t.as(admin).delete(`/destination-catalog/${id}`).expect(204);
      await t.anonymous.get(`/destination-catalog/${id}`).expect(404);
    });

    it('forbids regular users and visitors from writing', async () => {
      const row = await t.prisma.destinationCatalog.findFirstOrThrow({
        where: { name: names[0] },
      });

      await t
        .as(member)
        .post('/destination-catalog', { name: 'Nope' })
        .expect(403);
      await t
        .as(member)
        .patch(`/destination-catalog/${row.id}`, { name: 'Nope' })
        .expect(403);
      await t.as(member).delete(`/destination-catalog/${row.id}`).expect(403);
      await t.anonymous
        .post('/destination-catalog', { name: 'Nope' })
        .expect(401);
    });

    it.each([
      ['no name', {}],
      ['an unknown category', { name: 'Place', category: 'MOON' }],
      ['a latitude out of range', { name: 'Place', latitude: 91 }],
    ])('rejects %s with 422', async (_name, payload) => {
      await t.as(admin).post('/destination-catalog', payload).expect(422);
    });

    it('answers 404 when updating or deleting an unknown destination', async () => {
      await t
        .as(admin)
        .patch(`/destination-catalog/${randomUUID()}`, { name: 'Ghost' })
        .expect(404);
      await t
        .as(admin)
        .delete(`/destination-catalog/${randomUUID()}`)
        .expect(404);
    });

    it('refuses to delete a destination that a trip uses (409)', async () => {
      const owner = await t.data.user();
      const trip = await t.data.trip(owner);
      const used = await t.data.destination();
      await t.prisma.tripDestination.create({
        data: { tripId: trip.id, destinationCatalogId: used.id },
      });

      await t.as(admin).delete(`/destination-catalog/${used.id}`).expect(409);
    });
  });
});
