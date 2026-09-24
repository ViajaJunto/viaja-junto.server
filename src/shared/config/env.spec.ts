import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/viajajunto',
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
      validateEnv({ DATABASE_URL: 'mysql://root@localhost:3306/db' }),
    ).toThrow(/PostgreSQL connection string/);
  });

  it('accepts the postgres:// scheme as well', () => {
    expect(
      validateEnv({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' })
        .DATABASE_URL,
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
});
