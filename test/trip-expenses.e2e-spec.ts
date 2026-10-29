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

describe('Trip expenses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let ana: Account;
  let bia: Account;
  let caio: Account;
  let viewer: Account;
  let stranger: Account;
  let tripId: string;

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string) =>
    prisma.user.create({ data: { name, email: `${name}-${run}@example.com` } });

  const call = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    user: Account,
    body?: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Authorization', bearer(user))
      .send(body);

  const dinner = (overrides: Record<string, unknown> = {}) => ({
    tripId,
    payerId: ana.id,
    amount: 9000,
    description: 'Jantar',
    split: { type: 'equal', participants: [ana.id, bia.id, caio.id] },
    ...overrides,
  });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    [ana, bia, caio, viewer, stranger] = await Promise.all(
      ['ana', 'bia', 'caio', 'viewer', 'stranger'].map(account),
    );
    const trip = await prisma.trip.create({
      data: {
        inviteCode: inviteCode(),
        name: `Trip ${run}`,
        createdBy: ana.id,
      },
    });
    tripId = trip.id;
    await prisma.tripMember.createMany({
      data: [
        { tripId, userId: bia.id, permission: 'EDITOR' },
        { tripId, userId: caio.id, permission: 'EDITOR' },
        { tripId, userId: viewer.id, permission: 'VIEWER' },
      ],
    });
  });

  afterAll(async () => {
    const users = [ana, bia, caio, viewer, stranger].map(({ id }) => id);
    await prisma.trip.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  describe('recording an expense', () => {
    it('stores it in the trip currency by default and returns the split', async () => {
      const { body } = await call(
        'post',
        '/trip-expenses',
        ana,
        dinner(),
      ).expect(201);

      expect(body).toMatchObject({
        tripId,
        payerId: ana.id,
        amount: 9000,
        currency: 'BRL',
        exchangeRate: null,
        description: 'Jantar',
        createdBy: ana.id,
        split: { type: 'equal', participants: [ana.id, bia.id, caio.id] },
      });
    });

    it('lets an editor record an expense for someone else', async () => {
      const { body } = await call(
        'post',
        '/trip-expenses',
        bia,
        dinner({ payerId: caio.id, amount: 3000 }),
      ).expect(201);

      expect(body).toMatchObject({ payerId: caio.id, createdBy: bia.id });
    });

    it('keeps exact and proportional splits as sent', async () => {
      const exact = await call(
        'post',
        '/trip-expenses',
        ana,
        dinner({
          amount: 5000,
          split: {
            type: 'exact',
            shares: [
              { participant: ana.id, amount: 1000 },
              { participant: bia.id, amount: 4000 },
            ],
          },
        }),
      ).expect(201);
      const proportional = await call(
        'post',
        '/trip-expenses',
        ana,
        dinner({
          amount: 10000,
          split: {
            type: 'proportional',
            weights: [
              { participant: ana.id, weight: 2 },
              { participant: bia.id, weight: 3 },
            ],
          },
        }),
      ).expect(201);

      expect(exact.body.split).toEqual({
        type: 'exact',
        shares: [
          { participant: ana.id, amount: 1000 },
          { participant: bia.id, amount: 4000 },
        ],
      });
      expect(proportional.body.split).toEqual({
        type: 'proportional',
        weights: [
          { participant: ana.id, weight: 2 },
          { participant: bia.id, weight: 3 },
        ],
      });
    });

    it('accepts an expense in another currency, with the rate it was paid at', async () => {
      const { body } = await call(
        'post',
        '/trip-expenses',
        ana,
        dinner({ amount: 1000, currency: 'eur', exchangeRate: 5.5 }),
      ).expect(201);

      expect(body).toMatchObject({ currency: 'EUR', exchangeRate: 5.5 });
    });

    it('forbids a viewer', async () => {
      await call('post', '/trip-expenses', viewer, dinner()).expect(403);
    });

    it('answers 404 to someone who is not on the trip', async () => {
      await call('post', '/trip-expenses', stranger, dinner()).expect(404);
    });

    it('answers 401 without a token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/trip-expenses')
        .send(dinner());

      expect(response.status).toBe(401);
    });

    it.each([
      [
        'a payer who is not on the trip',
        () => dinner({ payerId: stranger.id }),
      ],
      [
        'someone in the split who is not on the trip',
        () =>
          dinner({
            split: { type: 'equal', participants: [ana.id, stranger.id] },
          }),
      ],
      ['a foreign currency without a rate', () => dinner({ currency: 'EUR' })],
      [
        'a rate on an expense in the trip currency',
        () => dinner({ exchangeRate: 5 }),
      ],
      [
        'exact shares that do not add up',
        () =>
          dinner({
            split: {
              type: 'exact',
              shares: [{ participant: ana.id, amount: 1 }],
            },
          }),
      ],
      ['a zero amount', () => dinner({ amount: 0 })],
      ['no split', () => dinner({ split: undefined })],
    ])('rejects %s with 422', async (_name, payload) => {
      const response = await call('post', '/trip-expenses', ana, payload());

      expect(response.status).toBe(422);
    });
  });

  describe('listing and reading', () => {
    it('lists the expenses of a trip, newest first, only for its members', async () => {
      const { body } = await call(
        'get',
        `/trip-expenses?tripId=${tripId}`,
        viewer,
      ).expect(200);

      expect(body.meta.total).toBeGreaterThanOrEqual(4);
      expect(body.data[0]).toHaveProperty('split');
      await call('get', `/trip-expenses?tripId=${tripId}`, stranger).expect(
        404,
      );
    });

    it('lists nothing for someone with no trips', async () => {
      const { body } = await call('get', '/trip-expenses', stranger).expect(
        200,
      );

      expect(body.data).toEqual([]);
    });

    it('reads one expense, but not from outside the trip', async () => {
      const created = await call(
        'post',
        '/trip-expenses',
        ana,
        dinner(),
      ).expect(201);

      await call('get', `/trip-expenses/${created.body.id}`, viewer).expect(
        200,
      );
      await call('get', `/trip-expenses/${created.body.id}`, stranger).expect(
        404,
      );
    });
  });

  describe('changing and deleting', () => {
    let expenseId: string;

    beforeEach(async () => {
      expenseId = (
        await call('post', '/trip-expenses', ana, dinner()).expect(201)
      ).body.id;
    });

    it('changes only what was sent', async () => {
      const { body } = await call('patch', `/trip-expenses/${expenseId}`, bia, {
        description: 'Almoço',
        amount: 6000,
      }).expect(200);

      expect(body).toMatchObject({
        description: 'Almoço',
        amount: 6000,
        payerId: ana.id,
        split: { type: 'equal' },
      });
    });

    it('replaces the split', async () => {
      const { body } = await call('patch', `/trip-expenses/${expenseId}`, ana, {
        split: { type: 'equal', participants: [ana.id, bia.id] },
      }).expect(200);

      expect(body.split.participants).toEqual([ana.id, bia.id]);
    });

    it('checks the whole expense again', async () => {
      await call('patch', `/trip-expenses/${expenseId}`, ana, {
        split: { type: 'exact', shares: [{ participant: ana.id, amount: 5 }] },
      }).expect(422);
      await call('patch', `/trip-expenses/${expenseId}`, ana, {
        payerId: stranger.id,
      }).expect(422);
    });

    it('does not let the trip be changed', async () => {
      await call('patch', `/trip-expenses/${expenseId}`, ana, {
        tripId: randomUUID(),
      }).expect(422);
    });

    it('forbids a viewer from changing or deleting', async () => {
      await call('patch', `/trip-expenses/${expenseId}`, viewer, {
        amount: 1,
      }).expect(403);
      await call('delete', `/trip-expenses/${expenseId}`, viewer).expect(403);
    });

    it('answers 404 to someone outside the trip', async () => {
      await call('patch', `/trip-expenses/${expenseId}`, stranger, {
        amount: 1,
      }).expect(404);
      await call('delete', `/trip-expenses/${expenseId}`, stranger).expect(404);
    });

    it('deletes an expense together with its shares', async () => {
      await call('delete', `/trip-expenses/${expenseId}`, bia).expect(204);

      await call('get', `/trip-expenses/${expenseId}`, ana).expect(404);
      expect(
        await prisma.tripExpenseShare.count({ where: { expenseId } }),
      ).toBe(0);
    });
  });

  describe('who owes whom', () => {
    let freshTrip: string;

    beforeAll(async () => {
      freshTrip = (
        await prisma.trip.create({
          data: {
            inviteCode: inviteCode(),
            name: `Fresh ${run}`,
            createdBy: ana.id,
          },
        })
      ).id;
      await prisma.tripMember.createMany({
        data: [
          { tripId: freshTrip, userId: bia.id, permission: 'EDITOR' },
          { tripId: freshTrip, userId: viewer.id, permission: 'VIEWER' },
        ],
      });
    });

    const summary = (user: Account) =>
      call('get', `/trips/${freshTrip}/expenses/summary`, user);

    it('is empty before anything is spent', async () => {
      const { body } = await summary(ana).expect(200);

      expect(body).toEqual({
        currency: 'BRL',
        total: 0,
        balances: [],
        transfers: [],
      });
    });

    it('works out the balances and the payments that settle them', async () => {
      // ana pays 90.00 for ana+bia; bia pays 30.00 for ana+bia; 10 EUR at 5.5 paid by bia, split by ana+bia.
      await call('post', '/trip-expenses', ana, {
        tripId: freshTrip,
        payerId: ana.id,
        amount: 9000,
        split: { type: 'equal', participants: [ana.id, bia.id] },
      }).expect(201);
      await call('post', '/trip-expenses', bia, {
        tripId: freshTrip,
        payerId: bia.id,
        amount: 3000,
        split: { type: 'equal', participants: [ana.id, bia.id] },
      }).expect(201);
      await call('post', '/trip-expenses', bia, {
        tripId: freshTrip,
        payerId: bia.id,
        amount: 1000,
        currency: 'EUR',
        exchangeRate: 5.5,
        split: { type: 'equal', participants: [ana.id, bia.id] },
      }).expect(201);

      const { body } = await summary(viewer).expect(200);

      // total 90.00 + 30.00 + 55.00 = 175.00; each owes 87.50.
      expect(body.total).toBe(17500);
      const nets = Object.fromEntries(
        body.balances.map((b: { participant: string; net: number }) => [
          b.participant,
          b.net,
        ]),
      );
      expect(nets).toEqual({ [ana.id]: 9000 - 8750, [bia.id]: 8500 - 8750 });
      expect(body.transfers).toEqual([
        { from: bia.id, to: ana.id, amount: 250 },
      ]);
    });

    it('always adds up to zero', async () => {
      const { body } = await summary(ana).expect(200);

      expect(
        body.balances.reduce(
          (sum: number, b: { net: number }) => sum + b.net,
          0,
        ),
      ).toBe(0);
    });

    it('hides it from someone outside the trip', async () => {
      await summary(stranger).expect(404);
    });
  });

  describe('the trip currency', () => {
    it('cannot change once the trip has expenses', async () => {
      const response = await call('patch', `/trips/${tripId}`, ana, {
        currency: 'USD',
      });

      expect(response.status).toBe(409);
    });

    it('can still change on a trip without expenses', async () => {
      const empty = (
        await call('post', '/trips', ana, { name: `Empty ${run}` }).expect(201)
      ).body.id;

      await call('patch', `/trips/${empty}`, ana, { currency: 'USD' }).expect(
        200,
      );
    });
  });

  describe('the budget summary', () => {
    it('shows what was spent next to what was planned', async () => {
      const budgetTrip = (
        await call('post', '/trips', ana, { name: `Budget ${run}` }).expect(201)
      ).body.id;
      await call('post', '/budgets', ana, {
        tripId: budgetTrip,
        totalValue: 1000,
      }).expect(201);
      await call('post', '/trip-expenses', ana, {
        tripId: budgetTrip,
        payerId: ana.id,
        amount: 25000,
        split: { type: 'equal', participants: [ana.id] },
      }).expect(201);
      await call('post', '/trip-expenses', ana, {
        tripId: budgetTrip,
        payerId: ana.id,
        amount: 1000,
        currency: 'EUR',
        exchangeRate: 6,
        split: { type: 'equal', participants: [ana.id] },
      }).expect(201);

      const { body } = await call(
        'get',
        `/trips/${budgetTrip}/budget/summary`,
        ana,
      ).expect(200);

      // 250.00 BRL + 10.00 EUR at 6 = 310.00.
      expect(body).toMatchObject({
        totalValue: 1000,
        spent: 310,
        remainingAfterSpent: 690,
      });
    });
  });

  it('refuses to delete a user who is still referenced by an expense (409)', async () => {
    await call('delete', `/users/${ana.id}`, ana).expect(409);
  });
});
