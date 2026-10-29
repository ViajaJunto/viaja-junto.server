import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { env } from './../src/shared/config/env.js';
import { buildCorsOptions } from './../src/shared/http/cors.js';

describe('CORS (e2e)', () => {
  let app: INestApplication;
  const allowed = env.CORS_ORIGINS[0];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableCors(buildCorsOptions(env.CORS_ORIGINS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the preflight of an authenticated request from the frontend', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/trips')
      .set('Origin', allowed)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(allowed);
    expect(response.headers['access-control-allow-headers']).toBe(
      'Authorization,Content-Type',
    );
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-max-age']).toBe('600');
  });

  it('does not grant access to an unknown origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/trips')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('adds the CORS header to real responses for the frontend origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/trips')
      .set('Origin', allowed)
      .expect(401);

    expect(response.headers['access-control-allow-origin']).toBe(allowed);
  });
});
