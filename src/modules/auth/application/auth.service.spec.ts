import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../../users/application/users.service.js';
import type { AccessTokenIssuer } from '../domain/access-token.issuer.js';
import { AuthService } from './auth.service.js';

const identity = {
  googleId: '109876543210987654321',
  email: 'gustavo@exemplo.com',
  name: 'Gustavo Fidelis',
};

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Gustavo Fidelis',
  email: 'gustavo@exemplo.com',
  createdAt: new Date('2026-03-14T18:22:05.000Z'),
};

type UsersMock = Pick<
  Record<keyof UsersService, ReturnType<typeof vi.fn>>,
  'findOrCreateFromGoogle' | 'findOne'
>;

type IssuerMock = {
  [K in keyof AccessTokenIssuer]: ReturnType<typeof vi.fn>;
};

describe('AuthService', () => {
  let users: UsersMock;
  let tokens: IssuerMock;
  let service: AuthService;

  beforeEach(() => {
    users = { findOrCreateFromGoogle: vi.fn(), findOne: vi.fn() };
    tokens = { issue: vi.fn() };
    service = new AuthService(
      users as unknown as UsersService,
      tokens as unknown as AccessTokenIssuer,
    );
  });

  describe('signInWithGoogle', () => {
    beforeEach(() => {
      users.findOrCreateFromGoogle.mockResolvedValue(user);
      tokens.issue.mockResolvedValue({ value: 'signed.jwt', expiresIn: 3600 });
    });

    it('resolves the account from the Google identity', async () => {
      await service.signInWithGoogle(identity);

      expect(users.findOrCreateFromGoogle).toHaveBeenCalledWith(identity);
    });

    it('issues the token for the resolved account, not the Google id', async () => {
      await service.signInWithGoogle(identity);

      expect(tokens.issue).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
      });
    });

    it('returns a bearer token response', async () => {
      const result = await service.signInWithGoogle(identity);

      expect(result).toEqual({
        accessToken: 'signed.jwt',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    });

    it('does not issue a token when the account cannot be resolved', async () => {
      users.findOrCreateFromGoogle.mockRejectedValue(new Error('db down'));

      await expect(service.signInWithGoogle(identity)).rejects.toThrow(
        'db down',
      );
      expect(tokens.issue).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns the profile of the given user', async () => {
      users.findOne.mockResolvedValue(user);

      await expect(service.getProfile(user.id)).resolves.toBe(user);
      expect(users.findOne).toHaveBeenCalledWith(user.id);
    });
  });
});
