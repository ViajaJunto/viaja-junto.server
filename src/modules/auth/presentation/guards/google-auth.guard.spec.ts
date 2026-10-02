import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuthGuard } from './google-auth.guard.js';

describe('GoogleAuthGuard.handleRequest', () => {
  let guard: GoogleAuthGuard;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    guard = new GoogleAuthGuard();
  });

  it('passes the identity through on success', () => {
    const identity = { googleId: '1', email: 'a@b.com', name: 'A' };

    expect(guard.handleRequest(null, identity, undefined)).toBe(identity);
  });

  it('turns a strategy error into null instead of throwing', () => {
    expect(guard.handleRequest(new Error('unverified'), false, undefined)).toBe(
      null,
    );
  });

  it('turns a failed state check into null', () => {
    expect(
      guard.handleRequest(null, false, {
        message: 'OAuth state does not match.',
      }),
    ).toBe(null);
  });

  it('logs why the sign-in failed', () => {
    guard.handleRequest(null, false, 'denied');

    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      'Google sign-in failed: denied',
    );
  });
});
