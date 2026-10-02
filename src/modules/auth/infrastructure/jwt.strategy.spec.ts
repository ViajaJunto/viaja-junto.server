import { describe, expect, it } from 'vitest';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('exposes the token subject as the authenticated user', () => {
    const strategy = new JwtStrategy();

    expect(
      strategy.validate({ sub: 'user-id', email: 'gustavo@exemplo.com' }),
    ).toEqual({ id: 'user-id', email: 'gustavo@exemplo.com' });
  });
});
