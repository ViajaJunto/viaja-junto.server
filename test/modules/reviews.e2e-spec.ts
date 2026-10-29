import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Reviews (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;
  let caio: Account;
  let activityId: string;

  beforeAll(async () => {
    t = await startApp();
    [ana, bia, caio] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);
    activityId = (await t.data.activity()).id;
  });

  afterAll(() => t.close());

  const review = (user: Account, body: object = {}) =>
    t.as(user).post('/reviews', { activityId, rating: 5, ...body });

  describe('writing', () => {
    it('takes the author from the token and stores rating and comment', async () => {
      const { body } = await review(ana, {
        rating: 4,
        comment: 'Vale a pena',
      }).expect(201);

      expect(body).toMatchObject({
        userId: ana.id,
        activityId,
        rating: 4,
        comment: 'Vale a pena',
      });
    });

    it('does not accept an author in the payload', async () => {
      await review(bia, { userId: ana.id }).expect(422);
    });

    it('answers 409 for a second review of the same activity by the same user', async () => {
      await review(ana).expect(409);
    });

    it('answers 404 for an activity that does not exist', async () => {
      await review(caio, { activityId: randomUUID() }).expect(404);
    });

    it('requires a token', async () => {
      await t.anonymous.post('/reviews', { activityId, rating: 5 }).expect(401);
    });

    it.each([
      ['a rating of 0', { rating: 0 }],
      ['a rating above 5', { rating: 6 }],
      ['a fractional rating', { rating: 3.5 }],
      ['no rating', { rating: undefined }],
      ['a comment that is too long', { comment: 'x'.repeat(2001) }],
    ])('rejects %s with 422', async (_name, overrides) => {
      await review(caio, overrides).expect(422);
    });
  });

  describe('reading (public)', () => {
    let target: string;

    beforeAll(async () => {
      target = (await t.data.activity()).id;
      for (let i = 1; i <= 3; i++) {
        const author = await t.data.user();
        await t.prisma.review.create({
          data: {
            userId: author.id,
            activityId: target,
            rating: i,
            createdAt: new Date(Date.UTC(2026, 0, i)),
          },
        });
      }
    });

    it('lists the reviews of an activity newest first, without a token', async () => {
      const { body } = await t.anonymous
        .get(`/reviews?activityId=${target}`)
        .expect(200);

      expect(body.data.map((r: { rating: number }) => r.rating)).toEqual([
        3, 2, 1,
      ]);
      expectPage(body, { page: 1, limit: 20, total: 3 });
    });

    it('paginates in the same order', async () => {
      const { body } = await t.anonymous
        .get(`/reviews?activityId=${target}&limit=2&page=2`)
        .expect(200);

      expect(body.data.map((r: { rating: number }) => r.rating)).toEqual([1]);
      expectPage(body, { page: 2, limit: 2, total: 3 });
    });

    it('reads one review, and answers 404 / 400 for an unknown or malformed id', async () => {
      const row = await t.prisma.review.findFirstOrThrow({
        where: { activityId: target },
      });

      await t.anonymous.get(`/reviews/${row.id}`).expect(200);
      await t.anonymous.get(`/reviews/${randomUUID()}`).expect(404);
      await t.anonymous.get('/reviews/not-a-uuid').expect(400);
    });
  });

  describe('changing and removing', () => {
    let id: string;

    beforeAll(async () => {
      id = (await review(bia, { rating: 3 }).expect(201)).body.id;
    });

    it('lets only the author change it, and only the rating and the comment', async () => {
      const { body } = await t
        .as(bia)
        .patch(`/reviews/${id}`, { rating: 5, comment: 'Mudei de ideia' })
        .expect(200);

      expect(body).toMatchObject({
        rating: 5,
        comment: 'Mudei de ideia',
        userId: bia.id,
      });
      await t.as(caio).patch(`/reviews/${id}`, { rating: 1 }).expect(403);
      await t
        .as(bia)
        .patch(`/reviews/${id}`, { activityId: randomUUID() })
        .expect(422);
      await t.as(bia).patch(`/reviews/${id}`, { userId: caio.id }).expect(422);
      await t.anonymous.patch(`/reviews/${id}`, { rating: 1 }).expect(401);
    });

    it('lets only the author delete it', async () => {
      await t.as(caio).delete(`/reviews/${id}`).expect(403);
      await t.as(bia).delete(`/reviews/${id}`).expect(204);

      await t.anonymous.get(`/reviews/${id}`).expect(404);
    });

    it('answers 404 when changing or deleting an unknown review', async () => {
      await t
        .as(bia)
        .patch(`/reviews/${randomUUID()}`, { rating: 1 })
        .expect(404);
      await t.as(bia).delete(`/reviews/${randomUUID()}`).expect(404);
    });
  });
});
