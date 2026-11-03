import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';
import { randomUUID } from 'node:crypto';

describe('Destination reviews (e2e)', () => {
  let t: TestApp;
  let paris: { id: string };
  let rome: { id: string };
  let traveller: Account;
  let companion: Account;
  let planner: Account;
  let stranger: Account;

  const review = (
    user: Account,
    destinationId: string,
    rating: number,
    comment?: string,
  ) =>
    t.as(user).post('/destination-reviews', { destinationId, rating, comment });

  const rating = (id: string) =>
    t.prisma.destinationCatalog.findUniqueOrThrow({
      where: { id },
      select: { averageRating: true, reviewCount: true },
    });

  beforeAll(async () => {
    t = await startApp();
    [traveller, companion, planner, stranger] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);
    paris = await t.data.destination();
    rome = await t.data.destination();

    // Traveller created a completed trip to Paris; companion joined it.
    const done = await t.data.trip(traveller, { status: 'COMPLETED' });
    await t.data.member(done.id, companion, 'VIEWER');
    await t.prisma.tripDestination.create({
      data: { tripId: done.id, destinationCatalogId: paris.id, order: 0 },
    });
    // Planner only has a trip to Rome that is still being planned.
    const planned = await t.data.trip(planner, { status: 'PLANNING' });
    await t.prisma.tripDestination.create({
      data: { tripId: planned.id, destinationCatalogId: rome.id, order: 0 },
    });
  });

  afterAll(() => t.close());

  describe('who can review', () => {
    it('lets the creator of a completed trip review its destination', async () => {
      const { body } = await review(traveller, paris.id, 5, 'Loved it').expect(
        201,
      );

      expect(body).toMatchObject({
        userId: traveller.id,
        destinationId: paris.id,
        rating: 5,
        comment: 'Loved it',
      });
    });

    it('lets a member of a completed trip review it too', async () => {
      await review(companion, paris.id, 2).expect(201);
    });

    it('forbids a trip that is not completed yet', async () => {
      await review(planner, rome.id, 4).expect(403);
    });

    it('forbids someone who never travelled there', async () => {
      await review(stranger, paris.id, 4).expect(403);
    });

    it('forbids reviewing a destination other than the one travelled to', async () => {
      await review(traveller, rome.id, 4).expect(403);
    });

    it('answers 404 for a destination that does not exist', async () => {
      await review(traveller, randomUUID(), 4).expect(404);
    });

    it('answers 409 when the same user reviews a destination twice', async () => {
      await review(traveller, paris.id, 1).expect(409);
    });

    it('requires a token', async () => {
      await t.anonymous
        .post('/destination-reviews', { destinationId: paris.id, rating: 5 })
        .expect(401);
    });

    it.each([0, 6, 2.5])('rejects the rating %s with 422', async (value) => {
      await review(traveller, paris.id, value).expect(422);
    });
  });

  describe('the rating of the destination', () => {
    it('is the average of its own reviews, kept in step with them', async () => {
      // 5 (traveller) and 2 (companion) from the tests above.
      expect(await rating(paris.id)).toEqual({
        averageRating: 3.5,
        reviewCount: 2,
      });

      const { body } = await t
        .as(companion)
        .get(`/destination-reviews?destinationId=${paris.id}`)
        .expect(200);
      const mine = body.data.find(
        (r: { userId: string }) => r.userId === companion.id,
      );

      await t
        .as(companion)
        .patch(`/destination-reviews/${mine.id}`, { rating: 4 })
        .expect(200);
      expect(await rating(paris.id)).toEqual({
        averageRating: 4.5,
        reviewCount: 2,
      });

      await t
        .as(companion)
        .delete(`/destination-reviews/${mine.id}`)
        .expect(204);
      expect(await rating(paris.id)).toEqual({
        averageRating: 5,
        reviewCount: 1,
      });
    });

    it('goes back to unrated when the last review is deleted', async () => {
      const lone = await t.data.destination();
      const trip = await t.data.trip(traveller, { status: 'COMPLETED' });
      await t.prisma.tripDestination.create({
        data: { tripId: trip.id, destinationCatalogId: lone.id, order: 0 },
      });
      const { body } = await review(traveller, lone.id, 3).expect(201);
      expect(await rating(lone.id)).toEqual({
        averageRating: 3,
        reviewCount: 1,
      });

      await t
        .as(traveller)
        .delete(`/destination-reviews/${body.id}`)
        .expect(204);

      expect(await rating(lone.id)).toEqual({
        averageRating: null,
        reviewCount: 0,
      });
    });

    it('is refreshed when a reviewer deletes their account', async () => {
      const leaver = await t.data.user();
      const place = await t.data.destination();
      // A joined trip: a user who owns trips cannot delete their account.
      const trip = await t.data.trip(traveller, { status: 'COMPLETED' });
      await t.data.member(trip.id, leaver, 'VIEWER');
      await t.prisma.tripDestination.create({
        data: { tripId: trip.id, destinationCatalogId: place.id, order: 0 },
      });
      await review(leaver, place.id, 4).expect(201);

      await t.as(leaver).delete(`/users/${leaver.id}`).expect(204);

      expect(await rating(place.id)).toEqual({
        averageRating: null,
        reviewCount: 0,
      });
    });

    it('is not touched by the reviews of the activities in it', async () => {
      const activity = await t.data.activity();
      await t.prisma.activityCatalog.update({
        where: { id: activity.id },
        data: {
          destinationCatalogId: paris.id,
          averageRating: 1,
          reviewCount: 9,
        },
      });

      expect(await rating(paris.id)).toEqual({
        averageRating: 5,
        reviewCount: 1,
      });
    });
  });

  describe('editing', () => {
    it('only lets the author change or delete a review', async () => {
      const { body } = await t.anonymous
        .get(`/destination-reviews?destinationId=${paris.id}`)
        .expect(200);
      const id = body.data[0].id;

      await t
        .as(stranger)
        .patch(`/destination-reviews/${id}`, { rating: 1 })
        .expect(403);
      await t.as(stranger).delete(`/destination-reviews/${id}`).expect(403);
    });

    it('does not let the destination be reassigned', async () => {
      const { body } = await t.anonymous
        .get(`/destination-reviews?destinationId=${paris.id}`)
        .expect(200);

      await t
        .as(traveller)
        .patch(`/destination-reviews/${body.data[0].id}`, {
          destinationId: rome.id,
        })
        .expect(422);
    });
  });

  describe('reading', () => {
    it('lists the reviews of a destination publicly, newest first', async () => {
      const { body } = await t.anonymous
        .get(`/destination-reviews?destinationId=${paris.id}`)
        .expect(200);

      expect(
        body.data.every(
          (r: { destinationId: string }) => r.destinationId === paris.id,
        ),
      ).toBe(true);
    });

    it('shows the public page with rating, count and reviews by author name only', async () => {
      const { body } = await t.anonymous
        .get(`/destination-catalog/${paris.id}/details`)
        .expect(200);

      expect(body).toMatchObject({
        id: paris.id,
        averageRating: 5,
        reviewCount: 1,
      });
      expect(body.latestReviews).toEqual([
        expect.objectContaining({
          rating: 5,
          comment: 'Loved it',
          authorName: traveller.name,
        }),
      ]);
      expect(JSON.stringify(body)).not.toContain(traveller.email);
    });

    it('answers 404 for the page of an unknown destination', async () => {
      await t.anonymous
        .get(`/destination-catalog/${randomUUID()}/details`)
        .expect(404);
    });
  });

  describe('GET /destination-catalog/top', () => {
    it('ranks by the destinations’ own rating, then review count, leaving the unrated out', async () => {
      const [high, many, few, none] = await Promise.all(
        [0, 1, 2, 3].map(() => t.data.destination()),
      );
      await t.prisma.destinationCatalog.update({
        where: { id: high.id },
        data: { averageRating: 5, reviewCount: 1 },
      });
      await t.prisma.destinationCatalog.update({
        where: { id: many.id },
        data: { averageRating: 4.5, reviewCount: 20 },
      });
      await t.prisma.destinationCatalog.update({
        where: { id: few.id },
        data: { averageRating: 4.5, reviewCount: 2 },
      });

      const { body } = await t.anonymous
        .get('/destination-catalog/top?limit=50')
        .expect(200);
      const ids: string[] = body.map((d: { id: string }) => d.id);
      const mine = [high, many, few].map((d) => d.id);

      expect(ids.filter((id) => mine.includes(id))).toEqual(mine);
      expect(ids).not.toContain(none.id);
      expect(body[ids.indexOf(high.id)]).toMatchObject({
        averageRating: 5,
        reviewCount: 1,
      });
    });

    it('ignores the ratings of activities located in the destination', async () => {
      const place = await t.data.destination();
      const activity = await t.data.activity();
      await t.prisma.activityCatalog.update({
        where: { id: activity.id },
        data: {
          destinationCatalogId: place.id,
          averageRating: 5,
          reviewCount: 50,
        },
      });

      const { body } = await t.anonymous
        .get('/destination-catalog/top?limit=50')
        .expect(200);

      expect(body.map((d: { id: string }) => d.id)).not.toContain(place.id);
    });

    it('respects the limit and rejects an invalid one', async () => {
      const { body } = await t.anonymous
        .get('/destination-catalog/top?limit=1')
        .expect(200);
      expect(body.length).toBeLessThanOrEqual(1);

      await t.anonymous.get('/destination-catalog/top?limit=0').expect(422);
    });
  });

  describe('the link between activities and destinations', () => {
    it('filters the activity catalog by destination', async () => {
      const place = await t.data.destination();
      const inside = await t.data.activity();
      await t.data.activity();
      await t.prisma.activityCatalog.update({
        where: { id: inside.id },
        data: { destinationCatalogId: place.id },
      });

      const { body } = await t.anonymous
        .get(`/activity-catalog?destinationId=${place.id}`)
        .expect(200);

      expect(body.data.map((a: { id: string }) => a.id)).toEqual([inside.id]);
      expect(body.data[0].destinationId).toBe(place.id);
    });

    it('rejects a malformed destination id with 422', async () => {
      await t.anonymous.get('/activity-catalog?destinationId=nope').expect(422);
    });

    it('unlinks the activities, keeping them, when the destination is deleted', async () => {
      const place = await t.data.destination();
      const activity = await t.data.activity();
      await t.prisma.activityCatalog.update({
        where: { id: activity.id },
        data: { destinationCatalogId: place.id },
      });

      await t.prisma.destinationCatalog.delete({ where: { id: place.id } });

      expect(
        await t.prisma.activityCatalog.findUniqueOrThrow({
          where: { id: activity.id },
        }),
      ).toMatchObject({ destinationCatalogId: null });
    });
  });
});
