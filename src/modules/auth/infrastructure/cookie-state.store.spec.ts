import type { Request } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieStateStore, OAUTH_STATE_COOKIE } from './cookie-state.store.js';

function fakeRequest(cookieHeader?: string) {
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const req = { headers: { cookie: cookieHeader }, res } as unknown as Request;
  return { req, res };
}

describe('CookieStateStore', () => {
  let store: CookieStateStore;

  beforeEach(() => {
    store = new CookieStateStore({ secure: true, path: '/api/auth/google' });
  });

  it('keeps the arities passport-oauth2 dispatches on', () => {
    expect(store.store.length).toBe(2);
    expect(store.verify.length).toBe(3);
  });

  describe('store', () => {
    it('sets a random state in a hardened cookie and hands it to passport', () => {
      const { req, res } = fakeRequest();
      const callback = vi.fn();

      store.store(req, callback);

      const state = callback.mock.calls[0][1] as string;
      expect(callback).toHaveBeenCalledWith(null, state);
      expect(state.length).toBeGreaterThanOrEqual(43);
      expect(res.cookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/api/auth/google',
        maxAge: 600_000,
      });
    });

    it('generates a different state each time', () => {
      const states = new Set<string>();
      for (let i = 0; i < 5; i++) {
        store.store(fakeRequest().req, (_err, state) => states.add(state!));
      }

      expect(states.size).toBe(5);
    });

    it('fails when there is no response to set the cookie on', () => {
      const callback = vi.fn();

      store.store({ headers: {} } as Request, callback);

      expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe('verify', () => {
    it('accepts the state stored in the cookie', () => {
      const { req } = fakeRequest(`other=1; ${OAUTH_STATE_COOKIE}=abc123`);
      const callback = vi.fn();

      store.verify(req, 'abc123', callback);

      expect(callback).toHaveBeenCalledWith(null, true, 'abc123');
    });

    it('rejects a state that does not match the cookie', () => {
      const { req } = fakeRequest(`${OAUTH_STATE_COOKIE}=abc123`);
      const callback = vi.fn();

      store.verify(req, 'abc124', callback);

      expect(callback).toHaveBeenCalledWith(null, false, {
        message: 'OAuth state does not match.',
      });
    });

    it('rejects a state of a different length without throwing', () => {
      const { req } = fakeRequest(`${OAUTH_STATE_COOKIE}=abc123`);
      const callback = vi.fn();

      store.verify(req, 'abc', callback);

      expect(callback.mock.calls[0][1]).toBe(false);
    });

    it('rejects the callback when the cookie is missing', () => {
      const { req } = fakeRequest('other=1');
      const callback = vi.fn();

      store.verify(req, 'abc123', callback);

      expect(callback).toHaveBeenCalledWith(null, false, {
        message: 'Missing OAuth state.',
      });
    });

    it('rejects the callback when Google returned no state', () => {
      const { req } = fakeRequest(`${OAUTH_STATE_COOKIE}=abc123`);
      const callback = vi.fn();

      store.verify(req, undefined as unknown as string, callback);

      expect(callback.mock.calls[0][1]).toBe(false);
    });

    it('rejects when there are no cookies at all', () => {
      const { req } = fakeRequest();
      const callback = vi.fn();

      store.verify(req, 'abc123', callback);

      expect(callback.mock.calls[0][1]).toBe(false);
    });

    it('clears the cookie so a state cannot be replayed', () => {
      const { req, res } = fakeRequest(`${OAUTH_STATE_COOKIE}=abc123`);

      store.verify(req, 'abc123', vi.fn());

      expect(res.clearCookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        expect.objectContaining({ path: '/api/auth/google' }),
      );
    });
  });
});
