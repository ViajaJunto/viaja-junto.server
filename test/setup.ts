/**
 * Global test setup.
 *
 * src/shared/config/env.ts validates the environment at import time, so any
 * spec that transitively imports it needs these present. Real values are
 * irrelevant here: nothing in the unit suite opens a connection.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public';
process.env.GOOGLE_CLIENT_ID ??= 'test-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET ??= 'test-client-secret';
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-at-least-32-chars';
