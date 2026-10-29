import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

describe('Trip currency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  let user: { id: string; email: string };

  const auth = () =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Authorization', auth())
      .send(body);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    user = await prisma.user.create({
      data: { name: 'Money', email: `money-${run}@example.com` },
    });
  });

  afterAll(async () => {
    await prisma.trip.deleteMany({ where: { createdBy: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await app.close();
  });

  it('defaults a new trip to BRL', async () => {
    const { body } = await call('post', '/trips', {
      name: `Default ${run}`,
    }).expect(201);

    expect(body.currency).toBe('BRL');
  });

  it('keeps the currency the creator picks, normalized to upper case', async () => {
    const { body } = await call('post', '/trips', {
      name: `Euro ${run}`,
      currency: 'eur',
    }).expect(201);

    expect(body.currency).toBe('EUR');
  });

  it('rejects a code that is not an ISO 4217 currency', async () => {
    await call('post', '/trips', {
      name: `Bad ${run}`,
      currency: 'XYZW',
    }).expect(422);
    await call('post', '/trips', { name: `Bad ${run}`, currency: '€' }).expect(
      422,
    );
  });

  it('lets the creator change the currency of a trip', async () => {
    const { body: trip } = await call('post', '/trips', {
      name: `Change ${run}`,
    }).expect(201);

    const { body } = await call('patch', `/trips/${trip.id}`, {
      currency: 'USD',
    }).expect(200);

    expect(body.currency).toBe('USD');
  });

  it('shows the currency of the trip on its budget', async () => {
    const { body: trip } = await call('post', '/trips', {
      name: `Budget ${run}`,
      currency: 'JPY',
    }).expect(201);

    const { body: budget } = await call('post', '/budgets', {
      tripId: trip.id,
      totalValue: 500000,
    }).expect(201);
    expect(budget.currency).toBe('JPY');

    const listed = await call('get', '/budgets').expect(200);
    const mine = listed.body.data.find(
      (b: { id: string }) => b.id === budget.id,
    );
    expect(mine.currency).toBe('JPY');

    await call('patch', `/trips/${trip.id}`, { currency: 'KRW' }).expect(200);
    const after = await call('get', `/budgets/${budget.id}`).expect(200);
    expect(after.body.currency).toBe('KRW');
  });
});
