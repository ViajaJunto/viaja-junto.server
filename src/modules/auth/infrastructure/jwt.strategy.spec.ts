import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../../users/application/users.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const issuedAt = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe('JwtStrategy', () => {
  let users: { getSession: ReturnType<typeof vi.fn> };
  let strategy: JwtStrategy;

  beforeEach(() => {
    users = { getSession: vi.fn() };
    strategy = new JwtStrategy(users as unknown as UsersService);
  });

  it('exposes the token subject as the authenticated user', async () => {
    users.getSession.mockResolvedValue({ tokensValidAfter: null });

    await expect(
      strategy.validate({
        sub: 'user-id',
        email: 'gustavo@exemplo.com',
        iat: 1,
      }),
    ).resolves.toEqual({ id: 'user-id', email: 'gustavo@exemplo.com' });
    expect(users.getSession).toHaveBeenCalledWith('user-id');
  });

  it('refuses the token of an account that no longer exists', async () => {
    users.getSession.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'gone', email: 'x@y.com', iat: 1 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('after the account signed out', () => {
    const signedOutAt = new Date('2026-07-01T10:00:00.000Z');

    beforeEach(() => {
      users.getSession.mockResolvedValue({ tokensValidAfter: signedOutAt });
    });

    it('refuses a token issued before it', async () => {
      await expect(
        strategy.validate({
          sub: 'u',
          email: 'a@b.com',
          iat: issuedAt('2026-07-01T09:59:59.000Z'),
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts one issued at that instant or after: it came from signing in again', async () => {
      await expect(
        strategy.validate({
          sub: 'u',
          email: 'a@b.com',
          iat: issuedAt('2026-07-01T10:00:00.000Z'),
        }),
      ).resolves.toBeDefined();
      await expect(
        strategy.validate({
          sub: 'u',
          email: 'a@b.com',
          iat: issuedAt('2026-07-01T10:05:00.000Z'),
        }),
      ).resolves.toBeDefined();
    });

    it('refuses a token that carries no issue time at all', async () => {
      await expect(
        strategy.validate({ sub: 'u', email: 'a@b.com' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  it('does not look at the issue time of an account that never signed out', async () => {
    users.getSession.mockResolvedValue({ tokensValidAfter: null });

    await expect(
      strategy.validate({ sub: 'u', email: 'a@b.com' }),
    ).resolves.toBeDefined();
  });
});
