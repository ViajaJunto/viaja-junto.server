import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/google redirects to Google with a state bound to a cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(302);

    const location = new URL(response.headers.location);
    expect(location.host).toBe('accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe(
      process.env.GOOGLE_CLIENT_ID,
    );

    const state = location.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(String(response.headers['set-cookie'])).toContain(
      `vj_oauth_state=${state}`,
    );
  });

  it('GET /auth/google/callback without a matching state sends the user back with an error', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/google/callback?code=forged&state=forged')
      .expect(302);

    expect(response.headers.location).toContain('#error=google_sign_in_failed');
  });

  it('GET /auth/me rejects a request without a token', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /auth/me rejects a token signed with another secret', () => {
    const forged = new JwtService({
      secret: 'another-secret-that-is-at-least-32-chars',
    }).sign({ sub: 'someone', email: 'x@y.com' });

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });
});
