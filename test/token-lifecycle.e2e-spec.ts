import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';

describe('Token lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });

  let user: { id: string; email: string };
  let other: { id: string; email: string };

  /** `iat` is in seconds; `secondsFromNow` lets a test sign "in the future" without waiting. */
  const tokenFor = (
    account: { id: string; email: string },
    secondsFromNow = 0,
  ) =>
    jwt.sign({
      sub: account.id,
      email: account.email,
      iat: Math.floor(Date.now() / 1000) + secondsFromNow,
    });

  const me = (token: string) =>
    request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    user = await prisma.user.create({
      data: { name: 'Session', email: `session-${run}@example.com` },
    });
    other = await prisma.user.create({
      data: { name: 'Bystander', email: `bystander-${run}@example.com` },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [user.id, other.id] } },
    });
    await app.close();
  });

  it('accepts a fresh token', async () => {
    const response = await me(tokenFor(user));

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
  });

  it('requires a token to sign out', async () => {
    const response = await request(app.getHttpServer()).post(
      '/api/auth/logout',
    );

    expect(response.status).toBe(401);
  });

  describe('signing out', () => {
    const oldToken = () => tokenFor(user, -5);

    it('ends the session: the same token no longer works', async () => {
      const before = await me(oldToken());
      expect(before.status).toBe(200);

      const out = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${oldToken()}`);
      expect(out.status).toBe(204);

      const after = await me(oldToken());
      expect(after.status).toBe(401);
    });

    it('ends every session of the account, not only the one that signed out', async () => {
      // Another device holding its own, still unexpired token.
      const anotherDevice = await me(tokenFor(user, -30));

      expect(anotherDevice.status).toBe(401);
    });

    it('does not touch anyone else’s session', async () => {
      const response = await me(tokenFor(other, -5));

      expect(response.status).toBe(200);
    });

    it('lets the account sign in again: a token issued after the sign-out works', async () => {
      // Tokens issued in the next whole second or later are newer than the sign-out.
      const response = await me(tokenFor(user, 2));

      expect(response.status).toBe(200);
    });

    it('is repeatable, and each sign-out ends the sessions that exist at that moment', async () => {
      const out = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokenFor(user, 5)}`);

      expect(out.status).toBe(204);
      // Issued before this second sign-out, so it is gone; one issued after it works.
      expect((await me(tokenFor(user, -1))).status).toBe(401);
      expect((await me(tokenFor(user, 10))).status).toBe(200);
    });
  });

  it('refuses the token of an account that was deleted, before it expires', async () => {
    const doomed = await prisma.user.create({
      data: { name: 'Doomed', email: `doomed-${run}@example.com` },
    });
    const token = tokenFor(doomed);
    expect((await me(token)).status).toBe(200);

    await prisma.user.delete({ where: { id: doomed.id } });

    expect((await me(token)).status).toBe(401);
  });

  it('refuses a token signed with another secret or algorithm', async () => {
    const forged = new JwtService({
      secret: 'a-completely-different-secret-of-32+chars',
    }).sign({
      sub: user.id,
      email: user.email,
    });
    const hs512 = new JwtService({ secret: process.env.JWT_SECRET }).sign(
      { sub: user.id, email: user.email },
      { algorithm: 'HS512' },
    );

    expect((await me(forged)).status).toBe(401);
    expect((await me(hs512)).status).toBe(401);
  });

  it('refuses an expired token', async () => {
    const expired = jwt.sign({
      sub: other.id,
      email: other.email,
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    expect((await me(expired)).status).toBe(401);
  });
});
