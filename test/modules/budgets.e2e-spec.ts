import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Budgets (e2e)', () => {
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

  /** A trip with the whole cast already on it. */
  const trip = async () => {
    const created = await t.data.trip(owner);
    await t.data.member(created.id, editor, 'EDITOR');
    await t.data.member(created.id, viewer, 'VIEWER');
    return created.id;
  };

  describe('creating', () => {
    it('lets the creator and an editor set the budget of a trip', async () => {
      const first = await trip();
      const second = await trip();

      const { body } = await t
        .as(owner)
        .post('/budgets', { tripId: first, totalValue: 8500.5 })
        .expect(201);
      await t
        .as(editor)
        .post('/budgets', { tripId: second, totalValue: 100 })
        .expect(201);

      expect(body).toMatchObject({
        tripId: first,
        totalValue: 8500.5,
        currency: 'BRL',
      });
    });

    it('answers 409 for a second budget on the same trip', async () => {
      const id = await trip();
      await t
        .as(owner)
        .post('/budgets', { tripId: id, totalValue: 1 })
        .expect(201);

      await t
        .as(owner)
        .post('/budgets', { tripId: id, totalValue: 2 })
        .expect(409);
    });

    it('forbids viewers and hides the trip from outsiders', async () => {
      const id = await trip();

      await t
        .as(viewer)
        .post('/budgets', { tripId: id, totalValue: 1 })
        .expect(403);
      await t
        .as(outsider)
        .post('/budgets', { tripId: id, totalValue: 1 })
        .expect(404);
    });

    it.each([
      ['a negative total', { totalValue: -1 }],
      ['a total with three decimals', { totalValue: 1.234 }],
      ['no total', {}],
      ['a total typed as text', { totalValue: 'lots' }],
    ])('rejects %s with 422', async (_name, payload) => {
      await t
        .as(owner)
        .post('/budgets', { tripId: await trip(), ...payload })
        .expect(422);
    });

    it('answers 404 for a trip that does not exist', async () => {
      await t
        .as(owner)
        .post('/budgets', { tripId: randomUUID(), totalValue: 1 })
        .expect(404);
    });
  });

  describe('listing', () => {
    let reader: Account;

    beforeAll(async () => {
      reader = await t.data.user();
      for (let i = 1; i <= 3; i++) {
        const created = await t.data.trip(reader);
        await t.prisma.budget.create({
          data: {
            tripId: created.id,
            totalValue: i * 100,
            createdAt: new Date(Date.UTC(2026, 0, i)),
          },
        });
      }
    });

    it('lists the caller’s budgets, newest first, paginated', async () => {
      const { body } = await t.as(reader).get('/budgets').expect(200);

      expect(
        body.data.map((b: { totalValue: number }) => b.totalValue),
      ).toEqual([300, 200, 100]);
      expectPage(body, { page: 1, limit: 20, total: 3 });

      const page2 = await t
        .as(reader)
        .get('/budgets?limit=2&page=2')
        .expect(200);
      expect(
        page2.body.data.map((b: { totalValue: number }) => b.totalValue),
      ).toEqual([100]);
      expectPage(page2.body, { page: 2, limit: 2, total: 3 });
    });

    it('does not show other people’s budgets', async () => {
      const { body } = await t.as(outsider).get('/budgets').expect(200);

      expect(body.meta.total).toBe(0);
    });
  });

  describe('reading, changing and removing', () => {
    let id: string;
    let tripId: string;

    beforeEach(async () => {
      tripId = await trip();
      id = (
        await t
          .as(owner)
          .post('/budgets', { tripId, totalValue: 500 })
          .expect(201)
      ).body.id;
    });

    it('reads one budget, for members only', async () => {
      await t.as(viewer).get(`/budgets/${id}`).expect(200);
      await t.as(outsider).get(`/budgets/${id}`).expect(404);
      await t.as(owner).get(`/budgets/${randomUUID()}`).expect(404);
      await t.as(owner).get('/budgets/not-a-uuid').expect(400);
    });

    it('lets editors change the total, but never move the budget to another trip', async () => {
      const { body } = await t
        .as(editor)
        .patch(`/budgets/${id}`, { totalValue: 900 })
        .expect(200);

      expect(body.totalValue).toBe(900);
      await t
        .as(editor)
        .patch(`/budgets/${id}`, { tripId: await trip() })
        .expect(422);
      await t.as(viewer).patch(`/budgets/${id}`, { totalValue: 1 }).expect(403);
    });

    it('lets editors delete it', async () => {
      await t.as(viewer).delete(`/budgets/${id}`).expect(403);
      await t.as(editor).delete(`/budgets/${id}`).expect(204);

      await t.as(owner).get(`/budgets/${id}`).expect(404);
    });
  });
});
