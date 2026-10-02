import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/viajajunto',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  JWT_SECRET: 'a-test-secret-that-is-at-least-32-chars',
};

describe('validateEnv', () => {
  it('applies the documented defaults', () => {
    const env = validateEnv(valid);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api');
    expect(env.SWAGGER_PATH).toBe('docs');
  });

  it('coerces PORT from the string the environment always gives', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects a port outside the valid range', () => {
    expect(() => validateEnv({ ...valid, PORT: '70000' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not PostgreSQL', () => {
    expect(() =>
      validateEnv({ ...valid, DATABASE_URL: 'mysql://root@localhost:3306/db' }),
    ).toThrow(/PostgreSQL connection string/);
  });

  it('accepts the postgres:// scheme as well', () => {
    expect(
      validateEnv({
        ...valid,
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      }).DATABASE_URL,
    ).toContain('postgres://');
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('lists every problem at once', () => {
    try {
      validateEnv({ NODE_ENV: 'staging', PORT: 'abc' });
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;

      expect(message).toContain('NODE_ENV');
      expect(message).toContain('PORT');
      expect(message).toContain('DATABASE_URL');
    }
  });

  describe('authentication', () => {
    it('applies the documented defaults', () => {
      const env = validateEnv(valid);

      expect(env.GOOGLE_CALLBACK_URL).toBe(
        'http://localhost:3000/api/auth/google/callback',
      );
      expect(env.AUTH_REDIRECT_URL).toBe('http://localhost:5173/auth/callback');
      expect(env.JWT_EXPIRES_IN).toBe(3600);
    });

    it.each(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'])(
      'rejects a missing %s',
      (name) => {
        const { [name as keyof typeof valid]: _omitted, ...rest } = valid;

        expect(() => validateEnv(rest)).toThrow(new RegExp(name));
      },
    );

    it('rejects a JWT_SECRET too short to resist brute force', () => {
      expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(
        /at least 32 characters/,
      );
    });

    it('rejects a redirect URL that is not a URL', () => {
      expect(() =>
        validateEnv({ ...valid, AUTH_REDIRECT_URL: 'not-a-url' }),
      ).toThrow(/AUTH_REDIRECT_URL/);
    });

    it('coerces JWT_EXPIRES_IN to a number of seconds', () => {
      expect(
        validateEnv({ ...valid, JWT_EXPIRES_IN: '900' }).JWT_EXPIRES_IN,
      ).toBe(900);
    });
  });
});
