import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { configureHttp } from './../src/shared/http/configure-http.js';
import { buildThrottlerOptions } from './../src/shared/http/throttling.js';

async function boot(
  limits?: { ttlMs: number; readLimit: number; writeLimit: number },
  customize?: (app: NestExpressApplication) => void,
) {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (limits) {
    builder = builder
      .overrideProvider(getOptionsToken())
      .useValue(buildThrottlerOptions(limits));
  }
  const app = (
    await builder.compile()
  ).createNestApplication<NestExpressApplication>();
  configureHttp(app);
  customize?.(app);
  await app.init();

  return app;
}

describe('Health check (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await boot();
  });

  afterAll(async () => {
    await app.close();
  });

  it('is up when the database answers, and needs no token', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('answers 503 when the database does not', async () => {
    const prisma = app.get(PrismaService);
    const original = prisma.$queryRaw;
    prisma.$queryRaw = (() => Promise.reject(new Error('db down'))) as never;

    try {
      const response = await request(app.getHttpServer()).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'error',
        error: { database: { status: 'down' } },
      });
      expect(JSON.stringify(response.body)).not.toContain('db down');
    } finally {
      prisma.$queryRaw = original;
    }
  });

  it('no longer answers the starter "Hello World!" at the root', async () => {
    const response = await request(app.getHttpServer()).get('/api');

    expect(response.status).toBe(404);
  });
});

describe('Security headers (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await boot(undefined, (instance) => {
      // Stand-in for the Scalar page that main.ts mounts under SWAGGER_PATH.
      instance.use(
        '/docs',
        (_req: unknown, res: { send: (b: string) => void }) =>
          res.send('<html></html>'),
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('protects API responses, with a CSP that loads nothing', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
    expect(response.headers['content-security-policy']).not.toContain(
      'jsdelivr',
    );
  });

  it('also protects error responses', async () => {
    const response = await request(app.getHttpServer()).get('/api/trips');

    expect(response.status).toBe(401);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('lets the API reference page load its script from jsDelivr', async () => {
    const response = await request(app.getHttpServer()).get('/docs');

    expect(response.headers['content-security-policy']).toContain(
      'https://cdn.jsdelivr.net',
    );
  });
});

describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await boot({ ttlMs: 60_000, readLimit: 3, writeLimit: 2 });
  });

  afterAll(async () => {
    await app.close();
  });

  const get = () =>
    request(app.getHttpServer()).get('/api/destination-catalog');

  it('lets reads through up to the budget, then answers 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await get()).status);

    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });

  it('tells the client when to come back', async () => {
    const response = await get();

    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(response.body).toMatchObject({ statusCode: 429 });
  });

  it('counts writes against a smaller budget, before authentication runs', async () => {
    // Unauthenticated writes: 401 until the budget is used up, then 429.
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push(
        (await request(app.getHttpServer()).post('/api/trips').send({})).status,
      );
    }

    expect(statuses).toEqual([401, 401, 429, 429]);
  });

  it('never throttles the health check', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      statuses.push(
        (await request(app.getHttpServer()).get('/api/health')).status,
      );
    }

    expect(new Set(statuses)).toEqual(new Set([200]));
  });
});
