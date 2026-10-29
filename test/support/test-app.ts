import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../../src/app.module.js';
import { PrismaService } from './../../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../../src/shared/http/validation.js';
import { TestData, type Account } from './test-data.js';

type Verb = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** supertest calls bound to one caller (or none), under the API prefix. */
export interface Caller {
  get: (path: string) => request.Test;
  post: (path: string, body?: object) => request.Test;
  patch: (path: string, body?: object) => request.Test;
  put: (path: string, body?: object) => request.Test;
  delete: (path: string) => request.Test;
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  /** Creates users, trips and catalog rows, and removes them again on `close()`. */
  data: TestData;
  /** The API as a visitor with no token. */
  anonymous: Caller;
  /** The API as `user`, with a signed access token. */
  as: (user: Account) => Caller;
  /** Removes what the suite created, then shuts the app down. */
  close: () => Promise<void>;
}

/** A signed access token, the same way sign-in issues one. */
export const tokenFor = (user: Account): string =>
  new JwtService({ secret: process.env.JWT_SECRET }).sign({
    sub: user.id,
    email: user.email,
  });

/**
 * Boots the whole application against the test database, configured like the
 * running API (prefix and validation), and hands back what a suite needs.
 */
export async function startApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(buildValidationPipe());
  await app.init();

  const prisma = app.get(PrismaService);
  const data = new TestData(prisma);

  const callerFor = (token?: string): Caller => {
    const call = (verb: Verb, path: string, body?: object) => {
      const req = request(app.getHttpServer())[verb](`/api${path}`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return body === undefined ? req : req.send(body);
    };

    return {
      get: (path) => call('get', path),
      post: (path, body) => call('post', path, body ?? {}),
      patch: (path, body) => call('patch', path, body ?? {}),
      put: (path, body) => call('put', path, body ?? {}),
      delete: (path) => call('delete', path),
    };
  };

  return {
    app,
    prisma,
    data,
    anonymous: callerFor(),
    as: (user) => callerFor(tokenFor(user)),
    close: async () => {
      await data.dispose();
      await app.close();
    },
  };
}
