import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

/** Every resource route that must reject a caller without a token (NFR03). */
const protectedRoutes: Array<
  [method: 'get' | 'post' | 'patch' | 'delete', path: string]
> = [
  ['get', '/trips'],
  ['get', `/trips/${id}`],
  ['post', '/trips'],
  ['patch', `/trips/${id}`],
  ['delete', `/trips/${id}`],
  ['get', '/trip-members'],
  ['get', `/trip-members/${id}`],
  ['post', '/trip-members'],
  ['patch', `/trip-members/${id}`],
  ['delete', `/trip-members/${id}`],
  ['get', '/trip-destinations'],
  ['get', `/trip-destinations/${id}`],
  ['post', '/trip-destinations'],
  ['patch', `/trip-destinations/${id}`],
  ['delete', `/trip-destinations/${id}`],
  ['get', '/trip-activities'],
  ['get', `/trip-activities/${id}`],
  ['post', '/trip-activities'],
  ['patch', `/trip-activities/${id}`],
  ['delete', `/trip-activities/${id}`],
  ['get', '/budgets'],
  ['get', `/budgets/${id}`],
  ['post', '/budgets'],
  ['patch', `/budgets/${id}`],
  ['delete', `/budgets/${id}`],
  ['get', '/users'],
  ['get', `/users/${id}`],
  ['patch', `/users/${id}`],
  ['delete', `/users/${id}`],
  ['post', '/reviews'],
  ['patch', `/reviews/${id}`],
  ['delete', `/reviews/${id}`],
  ['post', '/destination-catalog'],
  ['patch', `/destination-catalog/${id}`],
  ['delete', `/destination-catalog/${id}`],
  ['post', '/activity-catalog'],
  ['patch', `/activity-catalog/${id}`],
  ['delete', `/activity-catalog/${id}`],
];

describe('Protected routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(protectedRoutes)(
    '%s %s answers 401 without a token',
    async (method, path) => {
      await request(app.getHttpServer())[method](`/api${path}`).expect(401);
    },
  );

  it.each(protectedRoutes)(
    '%s %s answers 401 with a malformed token',
    async (method, path) => {
      await request(app.getHttpServer())
        [method](`/api${path}`)
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    },
  );
});
