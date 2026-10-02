import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../application/auth.service.js';
import { AuthController, GOOGLE_SIGN_IN_FAILED } from './auth.controller.js';

/**
 * The controller is a thin HTTP boundary: these specs assert that every route
 * hands the request to the service and turns the outcome into the right
 * redirect. The behaviour itself is covered by auth.service.spec.ts.
 */
describe('AuthController', () => {
  const identity = {
    googleId: '109876543210987654321',
    email: 'gustavo@exemplo.com',
    name: 'Gustavo Fidelis',
  };

  let service: Record<keyof AuthService, ReturnType<typeof vi.fn>>;
  let controller: AuthController;
  let response: { redirect: ReturnType<typeof vi.fn> };

  const fragmentOfRedirect = () =>
    new URLSearchParams(
      new URL(response.redirect.mock.calls[0][0] as string).hash.slice(1),
    );

  beforeEach(() => {
    service = {
      signInWithGoogle: vi.fn(),
      getProfile: vi.fn(),
    };
    controller = new AuthController(service as unknown as AuthService);
    response = { redirect: vi.fn() };
  });

  it('leaves the sign-in entry point to the guard', () => {
    expect(controller.googleSignIn()).toBeUndefined();
  });

  describe('googleCallback', () => {
    it('forwards the Google identity to the service', async () => {
      service.signInWithGoogle.mockResolvedValue({
        accessToken: 'signed.jwt',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      await controller.googleCallback(
        { user: identity } as unknown as Request,
        response as unknown as Response,
      );

      expect(service.signInWithGoogle).toHaveBeenCalledWith(identity);
    });

    it('redirects to the frontend with the token in the fragment', async () => {
      service.signInWithGoogle.mockResolvedValue({
        accessToken: 'signed.jwt',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      await controller.googleCallback(
        { user: identity } as unknown as Request,
        response as unknown as Response,
      );

      const target = new URL(response.redirect.mock.calls[0][0] as string);
      expect(`${target.origin}${target.pathname}`).toBe(
        'http://localhost:5173/auth/callback',
      );
      expect(target.search).toBe('');
      expect(Object.fromEntries(fragmentOfRedirect())).toEqual({
        access_token: 'signed.jwt',
        token_type: 'Bearer',
        expires_in: '3600',
      });
    });

    it('redirects with an error code when the guard rejected the sign-in', async () => {
      await controller.googleCallback(
        { user: null } as unknown as Request,
        response as unknown as Response,
      );

      expect(service.signInWithGoogle).not.toHaveBeenCalled();
      expect(Object.fromEntries(fragmentOfRedirect())).toEqual({
        error: GOOGLE_SIGN_IN_FAILED,
      });
    });
  });

  it('forwards the token owner id on me', () => {
    controller.me({ id: 'user-id', email: 'a@b.com' });

    expect(service.getProfile).toHaveBeenCalledWith('user-id');
  });

  it('returns whatever the service returns on me', () => {
    const profile = { id: 'user-id' };
    service.getProfile.mockReturnValue(profile);

    expect(controller.me({ id: 'user-id', email: 'a@b.com' })).toBe(profile);
  });
});
