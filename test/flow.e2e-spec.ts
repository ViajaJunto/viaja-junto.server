import { startApp, type TestApp } from './support/test-app.js';

/**
 * The journey the product is about, end to end through the public API:
 * an admin curates the catalog, a traveller plans a trip with a friend, the
 * friend reviews an activity the traveller planned, and everything the
 * summaries and listings report stays consistent along the way.
 */
describe('Planning a trip, start to finish (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startApp();
  });

  afterAll(() => t.close());

  it('goes from an empty catalog to a reviewed, budgeted itinerary', async () => {
    const admin = await t.data.user('ADMIN');
    const ana = await t.data.user();
    const bia = await t.data.user();

    // 1. An admin curates the shared catalog.
    const city = (
      await t
        .as(admin)
        .post('/destination-catalog', {
          name: `Lisboa ${t.data.tag}`,
          country: 'Portugal',
          category: 'CITY',
        })
        .expect(201)
    ).body;
    const tour = (
      await t
        .as(admin)
        .post('/activity-catalog', {
          name: `Tour de eléctrico ${t.data.tag}`,
          type: 'TOUR',
          city: 'Lisboa',
          country: 'Portugal',
        })
        .expect(201)
    ).body;
    const dinner = (
      await t
        .as(admin)
        .post('/activity-catalog', {
          name: `Jantar de fado ${t.data.tag}`,
          type: 'FOOD',
          city: 'Lisboa',
          country: 'Portugal',
        })
        .expect(201)
    ).body;

    // 2. Ana creates a trip and sees it on her dashboard.
    const trip = (
      await t
        .as(ana)
        .post('/trips', {
          name: 'Férias em Portugal',
          startDate: '2026-07-01',
          endDate: '2026-07-10',
        })
        .expect(201)
    ).body;
    expect(trip).toMatchObject({
      status: 'PLANNING',
      role: 'OWNER',
      currency: 'BRL',
    });
    const dashboard = await t.as(ana).get('/trips').expect(200);
    expect(dashboard.body.data.map((x: { id: string }) => x.id)).toContain(
      trip.id,
    );

    // 3. She invites Bia as an editor; Bia now sees the trip too.
    await t
      .as(ana)
      .post('/trip-members', {
        tripId: trip.id,
        userId: bia.id,
        permission: 'EDITOR',
      })
      .expect(201);
    const biaTrip = await t.as(bia).get(`/trips/${trip.id}`).expect(200);
    expect(biaTrip.body.role).toBe('EDITOR');

    // 4. Bia adds a stop to the itinerary and Ana plans two activities in it.
    const stop = (
      await t
        .as(bia)
        .post('/trip-destinations', {
          tripId: trip.id,
          destinationCatalogId: city.id,
          arrival: '2026-07-02',
          departure: '2026-07-06',
          order: 1,
        })
        .expect(201)
    ).body;
    await t
      .as(ana)
      .post('/trip-activities', {
        tripDestinationId: stop.id,
        activityCatalogId: tour.id,
        dateTime: '2026-07-03T10:00:00Z',
        expectedCost: 35.5,
      })
      .expect(201);
    await t
      .as(ana)
      .post('/trip-activities', {
        tripDestinationId: stop.id,
        activityCatalogId: dinner.id,
        dateTime: '2026-07-03T21:00:00Z',
        expectedCost: 120,
      })
      .expect(201);

    const plan = await t
      .as(bia)
      .get(`/trip-activities?tripDestinationId=${stop.id}`)
      .expect(200);
    expect(plan.body.data.map((a: { dateTime: string }) => a.dateTime)).toEqual(
      ['2026-07-03T10:00:00.000Z', '2026-07-03T21:00:00.000Z'],
    );

    // 5. A budget turns what is planned into a balance.
    await t
      .as(ana)
      .post('/budgets', { tripId: trip.id, totalValue: 150 })
      .expect(201);
    const summary = (
      await t.as(bia).get(`/trips/${trip.id}/budget/summary`).expect(200)
    ).body;
    expect(summary).toMatchObject({
      totalValue: 150,
      planned: 155.5,
      remaining: -5.5,
      overBudget: true,
      activityCount: 2,
    });
    expect(
      summary.byCategory.find((c: { type: string }) => c.type === 'FOOD'),
    ).toMatchObject({ planned: 120, count: 1 });

    // 6. The trip is confirmed; only Ana may do that.
    await t
      .as(bia)
      .patch(`/trips/${trip.id}`, { status: 'CONFIRMED' })
      .expect(403);
    await t
      .as(ana)
      .patch(`/trips/${trip.id}`, { status: 'CONFIRMED' })
      .expect(200);

    // 7. After the trip Bia reviews the tour; anyone can read it.
    await t
      .as(bia)
      .post('/reviews', {
        activityId: tour.id,
        rating: 5,
        comment: 'Imperdível',
      })
      .expect(201);
    const reviews = await t.anonymous
      .get(`/reviews?activityId=${tour.id}`)
      .expect(200);
    expect(reviews.body.data).toHaveLength(1);
    expect(reviews.body.data[0]).toMatchObject({ userId: bia.id, rating: 5 });

    // 8. Reviewing twice is refused, and nobody can review as someone else.
    await t
      .as(bia)
      .post('/reviews', { activityId: tour.id, rating: 1 })
      .expect(409);
    await t
      .as(ana)
      .patch(`/reviews/${reviews.body.data[0].id}`, { rating: 1 })
      .expect(403);

    // 9. Visitors can still browse the catalog.
    await t.anonymous.get(`/destination-catalog/${city.id}`).expect(200);

    // 10. Deleting the trip removes the whole plan, but not the shared catalog or the review.
    await t.as(bia).delete(`/trips/${trip.id}`).expect(403);
    await t.as(ana).delete(`/trips/${trip.id}`).expect(204);
    await t.as(bia).get(`/trips/${trip.id}`).expect(404);
    expect(
      await t.prisma.tripDestination.count({ where: { tripId: trip.id } }),
    ).toBe(0);
    expect(
      await t.prisma.tripActivity.count({
        where: { tripDestinationId: stop.id },
      }),
    ).toBe(0);
    expect(await t.prisma.budget.count({ where: { tripId: trip.id } })).toBe(0);
    await t.anonymous.get(`/destination-catalog/${city.id}`).expect(200);
    await t.anonymous.get(`/reviews/${reviews.body.data[0].id}`).expect(200);
  });
});
