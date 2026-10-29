import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

type Account = { id: string; email: string };

describe('Trip invite code (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let owner: Account;
  let guest: Account;
  let other: Account;
  let tripId: string;
  let code: string;

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const account = (name: string) =>
    prisma.user.create({ data: { name, email: `${name}-${run}@example.com` } });

  const call = (
    method: 'get' | 'post',
    path: string,
    user: Account,
    body?: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Authorization', bearer(user))
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

    [owner, guest, other] = await Promise.all([
      account('owner'),
      account('guest'),
      account('other'),
    ]);

    const created = await call('post', '/trips', owner, {
      name: `Invite ${run}`,
    }).expect(201);
    tripId = created.body.id;
  });

  afterAll(async () => {
    const users = [owner.id, guest.id, other.id];
    await prisma.trip.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  it('generates a code when the trip is created, and never returns it with the trip', async () => {
    const trip = await call('get', `/trips/${tripId}`, owner).expect(200);
    expect(trip.body).not.toHaveProperty('inviteCode');

    const response = await call(
      'get',
      `/trips/${tripId}/invite-code`,
      owner,
    ).expect(200);

    expect(response.body.code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    code = response.body.code;
  });

  it('shows the code to the creator only', async () => {
    await call('get', `/trips/${tripId}/invite-code`, other).expect(404);
  });

  it('lets a user join with the code as a VIEWER', async () => {
    const response = await call('post', '/trips/join', guest, {
      code: code.toLowerCase(),
    }).expect(201);

    expect(response.body).toMatchObject({ id: tripId, role: 'VIEWER' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId, userId: guest.id },
    });
    expect(member?.permission).toBe('VIEWER');
  });

  it('then shows the trip on the guest’s dashboard but still hides the code', async () => {
    const trips = await call('get', '/trips', guest).expect(200);
    expect(trips.body.data.map((t: { id: string }) => t.id)).toContain(tripId);

    await call('get', `/trips/${tripId}/invite-code`, guest).expect(403);
    await call('post', `/trips/${tripId}/invite-code/regenerate`, guest).expect(
      403,
    );
  });

  it('answers 409 when the user already joined', async () => {
    await call('post', '/trips/join', guest, { code }).expect(409);
  });

  it('answers 409 when the creator joins their own trip', async () => {
    await call('post', '/trips/join', owner, { code }).expect(409);
  });

  it('answers 404 for a well-formed code that belongs to no trip', async () => {
    await call('post', '/trips/join', other, { code: 'AAAAAAAA' }).expect(404);
  });

  it('answers 422 for a malformed code', async () => {
    await call('post', '/trips/join', other, { code: 'nope' }).expect(422);
  });

  it('regenerates the code: the old one stops working, members keep access', async () => {
    const regenerated = await call(
      'post',
      `/trips/${tripId}/invite-code/regenerate`,
      owner,
    ).expect(200);

    expect(regenerated.body.code).not.toBe(code);
    await call('post', '/trips/join', other, { code }).expect(404);
    await call('post', '/trips/join', other, {
      code: regenerated.body.code,
    }).expect(201);
    await call('get', `/trips/${tripId}`, guest).expect(200);
  });
});
