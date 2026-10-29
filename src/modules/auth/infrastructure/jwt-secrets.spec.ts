import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { acceptedSecrets, secretProviderFor } from './jwt-secrets.js';

const CURRENT = 'current-secret-that-is-at-least-32-chars';
const PREVIOUS = 'previous-secret-that-is-at-least-32-chars';
const OTHER = 'some-other-secret-that-is-at-least-32-chars';

const sign = (secret: string, options: { expiresIn?: number } = {}) =>
  new JwtService().sign(
    { sub: 'u' },
    { secret, algorithm: 'HS256', ...options },
  );

const pick = (secrets: string[], token: string) => {
  let picked: string | undefined;
  secretProviderFor(secrets)(undefined, token, (_error, secret) => {
    picked = secret;
  });
  return picked;
};

describe('secretProviderFor', () => {
  it('picks the current secret for a token signed with it', () => {
    expect(pick([CURRENT, PREVIOUS], sign(CURRENT))).toBe(CURRENT);
  });

  it('picks the previous secret for a token signed before the rotation', () => {
    expect(pick([CURRENT, PREVIOUS], sign(PREVIOUS))).toBe(PREVIOUS);
  });

  it('hands back the first secret for a token signed with none of them, so it fails to verify', () => {
    expect(pick([CURRENT, PREVIOUS], sign(OTHER))).toBe(CURRENT);
  });

  it('hands back the first secret for something that is not a token at all', () => {
    expect(pick([CURRENT, PREVIOUS], 'not-a-jwt')).toBe(CURRENT);
  });

  it('still picks the matching secret for an expired token, leaving expiry to passport-jwt', () => {
    const expired = new JwtService().sign(
      { sub: 'u', exp: Math.floor(Date.now() / 1000) - 60 },
      { secret: PREVIOUS, algorithm: 'HS256' },
    );

    expect(pick([CURRENT, PREVIOUS], expired)).toBe(PREVIOUS);
  });

  it('does not accept a token signed with another algorithm', () => {
    const hs512 = new JwtService().sign(
      { sub: 'u' },
      { secret: PREVIOUS, algorithm: 'HS512' },
    );

    expect(pick([CURRENT, PREVIOUS], hs512)).toBe(CURRENT);
  });

  it('works with a single secret', () => {
    expect(pick([CURRENT], sign(CURRENT))).toBe(CURRENT);
  });
});

describe('acceptedSecrets', () => {
  it('is only the current secret when there is no previous one', () => {
    expect(acceptedSecrets(CURRENT)).toEqual([CURRENT]);
    expect(acceptedSecrets(CURRENT, undefined)).toEqual([CURRENT]);
  });

  it('puts the current secret first and the previous one after it', () => {
    expect(acceptedSecrets(CURRENT, PREVIOUS)).toEqual([CURRENT, PREVIOUS]);
  });

  it('ignores a previous secret equal to the current one', () => {
    expect(acceptedSecrets(CURRENT, CURRENT)).toEqual([CURRENT]);
  });
});
