import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { inviteCode } from './helpers.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

type Account = { id: string; email: string };

describe('Budget summary (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let owner: Account;
  let viewer: Account;
  let stranger: Account;
  let budgetedTripId: string;
  let bareTripId: string;
  const catalogIds: string[] = [];
  let destinationCatalogId: string;

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string) =>
    prisma.user.create({ data: { name, email: `${name}-${run}@example.com` } });

  const summary = (tripId: string, user: Account) =>
    request(app.getHttpServer())
      .get(`/api/trips/${tripId}/budget/summary`)
      .set('Authorization', bearer(user));

  const plan = async (
    tripId: string,
    destinationId: string,
    type: 'TOUR' | 'FOOD' | 'LODGING',
    expectedCost: number | null,
  ) => {
    const catalog = await prisma.activityCatalog.create({
      data: { name: `${type} ${run} ${catalogIds.length}`, type },
    });
    catalogIds.push(catalog.id);
    await prisma.tripActivity.create({
      data: {
        tripDestinationId: destinationId,
        activityCatalogId: catalog.id,
        expectedCost,
      },
    });
    return tripId;
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    [owner, viewer, stranger] = await Promise.all([
      account('owner'),
      account('viewer'),
      account('stranger'),
    ]);
    destinationCatalogId = (
      await prisma.destinationCatalog.create({ data: { name: `City ${run}` } })
    ).id;

    const trip = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Budgeted ${run}`,
        createdBy: owner.id,
        currency: 'EUR',
      },
    });
    budgetedTripId = trip.id;
    await prisma.budget.create({
      data: { tripId: trip.id, totalValue: 500 },
    });
    await prisma.tripMember.create({
      data: { tripId: trip.id, userId: viewer.id, permission: 'VIEWER' },
    });
    const destination = await prisma.tripDestination.create({
      data: { tripId: trip.id, destinationCatalogId },
    });
    await plan(trip.id, destination.id, 'FOOD', 120.1);
    await plan(trip.id, destination.id, 'FOOD', 80.2);
    await plan(trip.id, destination.id, 'LODGING', 400);
    await plan(trip.id, destination.id, 'TOUR', null);

    bareTripId = (
      await prisma.trip.create({
        data: {
          inviteCode: inviteCode(),
          name: `Bare ${run}`,
          createdBy: owner.id,
        },
      })
    ).id;
  });

  afterAll(async () => {
    const users = [owner.id, viewer.id, stranger.id];
    await prisma.trip.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.activityCatalog.deleteMany({
      where: { id: { in: catalogIds } },
    });
    await prisma.destinationCatalog.delete({
      where: { id: destinationCatalogId },
    });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  it('derives what is planned from the activities and flags an overrun', async () => {
    const { body } = await summary(budgetedTripId, owner).expect(200);

    expect(body).toMatchObject({
      currency: 'EUR',
      totalValue: 500,
      planned: 600.3,
      remaining: -100.3,
      overBudget: true,
      activityCount: 4,
      unpricedActivities: 1,
    });
  });

  it('breaks consumption down by activity type', async () => {
    const { body } = await summary(budgetedTripId, owner).expect(200);

    expect(body.byCategory).toEqual([
      { type: 'TOUR', planned: 0, count: 1 },
      { type: 'FOOD', planned: 200.3, count: 2 },
      { type: 'LODGING', planned: 400, count: 1 },
      { type: 'TRANSPORT', planned: 0, count: 0 },
      { type: 'OTHER', planned: 0, count: 0 },
    ]);
  });

  it('works for a trip with no budget and no activities', async () => {
    const { body } = await summary(bareTripId, owner).expect(200);

    expect(body).toMatchObject({
      currency: 'BRL',
      totalValue: null,
      planned: 0,
      remaining: null,
      overBudget: false,
      activityCount: 0,
    });
  });

  it('is readable by a viewer', async () => {
    await summary(budgetedTripId, viewer).expect(200);
  });

  it('answers 404 to someone with no access to the trip', async () => {
    await summary(budgetedTripId, stranger).expect(404);
  });

  it('answers 401 without a token', async () => {
    await request(app.getHttpServer())
      .get(`/api/trips/${budgetedTripId}/budget/summary`)
      .expect(401);
  });

  it('no longer accepts a manually typed plannedActivities', async () => {
    await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', bearer(owner))
      .send({ tripId: bareTripId, totalValue: 100, plannedActivities: 50 })
      .expect(422);
  });
});
