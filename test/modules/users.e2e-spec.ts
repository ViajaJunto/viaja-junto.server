import { randomUUID } from 'node:crypto';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Users (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;

  beforeAll(async () => {
    t = await startApp();
    ana = await t.data.user();
    bia = await t.data.user();
  });

  afterAll(() => t.close());

  describe('reading', () => {
    it('lists users newest first, as { data, meta }, without leaking private fields', async () => {
      const { body } = await t.as(ana).get('/users?limit=100').expect(200);

      expect(body.meta.page).toBe(1);
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
      const ids = body.data.map((u: { id: string }) => u.id);
      expect(ids.indexOf(bia.id)).toBeLessThan(ids.indexOf(ana.id));
      for (const user of body.data) {
        expect(user).not.toHaveProperty('googleId');
        expect(Object.keys(user).sort()).toEqual([
          'createdAt',
          'email',
          'id',
          'name',
          'role',
        ]);
      }
    });

    it('paginates', async () => {
      const first = await t.as(ana).get('/users?limit=1&page=1').expect(200);
      const second = await t.as(ana).get('/users?limit=1&page=2').expect(200);

      expect(first.body.data).toHaveLength(1);
      expect(second.body.data).toHaveLength(1);
      expect(first.body.meta).toMatchObject({
        page: 1,
        limit: 1,
        hasNext: true,
        hasPrevious: false,
      });
      expect(second.body.meta).toMatchObject({
        page: 2,
        limit: 1,
        hasPrevious: true,
      });
      expect(first.body.meta.totalPages).toBe(first.body.meta.total);
    });

    it('reads one user, and answers 404 / 400 for an unknown or malformed id', async () => {
      const { body } = await t.as(ana).get(`/users/${bia.id}`).expect(200);

      expect(body).toMatchObject({ id: bia.id, email: bia.email });
      await t.as(ana).get(`/users/${randomUUID()}`).expect(404);
      await t.as(ana).get('/users/not-a-uuid').expect(400);
    });

    it('rejects an invalid page or limit with 422', async () => {
      await t.as(ana).get('/users?page=0').expect(422);
      await t.as(ana).get('/users?limit=101').expect(422);
    });

    it('requires a token', async () => {
      await t.anonymous.get('/users').expect(401);
    });
  });

  describe('changing', () => {
    it('lets users update their own profile', async () => {
      const { body } = await t
        .as(ana)
        .patch(`/users/${ana.id}`, { name: 'Ana Souza' })
        .expect(200);

      expect(body.name).toBe('Ana Souza');
    });

    it('forbids changing someone else’s account', async () => {
      await t.as(ana).patch(`/users/${bia.id}`, { name: 'Hacked' }).expect(403);
      await t.as(ana).delete(`/users/${bia.id}`).expect(403);
    });

    it('answers 409 when the email is already taken', async () => {
      await t
        .as(ana)
        .patch(`/users/${ana.id}`, { email: bia.email })
        .expect(409);
    });

    it('answers 422 for an invalid payload and refuses unknown fields', async () => {
      await t
        .as(ana)
        .patch(`/users/${ana.id}`, { email: 'not-an-email' })
        .expect(422);
      await t.as(ana).patch(`/users/${ana.id}`, { role: 'ADMIN' }).expect(422);
      await t.as(ana).patch(`/users/${ana.id}`, { googleId: 'x' }).expect(422);
    });
  });

  describe('deleting', () => {
    it('lets users delete their own account', async () => {
      const leaving = await t.data.user();

      await t.as(leaving).delete(`/users/${leaving.id}`).expect(204);
      expect(await t.prisma.user.count({ where: { id: leaving.id } })).toBe(0);
    });

    it('refuses while the user still owns trips (409), and works once they are gone', async () => {
      const owner = await t.data.user();
      const trip = await t.data.trip(owner);

      await t.as(owner).delete(`/users/${owner.id}`).expect(409);

      await t.prisma.trip.delete({ where: { id: trip.id } });
      await t.as(owner).delete(`/users/${owner.id}`).expect(204);
    });

    it('takes their memberships and reviews with them', async () => {
      const owner = await t.data.user();
      const member = await t.data.user();
      const trip = await t.data.trip(owner);
      await t.data.member(trip.id, member, 'VIEWER');
      const activity = await t.data.activity();
      await t.prisma.review.create({
        data: { userId: member.id, activityId: activity.id, rating: 5 },
      });

      await t.as(member).delete(`/users/${member.id}`).expect(204);

      expect(
        await t.prisma.tripMember.count({ where: { userId: member.id } }),
      ).toBe(0);
      expect(
        await t.prisma.review.count({ where: { userId: member.id } }),
      ).toBe(0);
    });
  });
});
