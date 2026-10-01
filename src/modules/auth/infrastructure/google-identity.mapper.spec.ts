import { UnauthorizedException } from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';
import { describe, expect, it } from 'vitest';
import { toGoogleIdentity } from './google-identity.mapper.js';

const profile = (overrides: Partial<Profile> = {}): Profile =>
  ({
    id: '109876543210987654321',
    displayName: 'Gustavo Fidelis',
    emails: [{ value: 'Gustavo@Exemplo.com', verified: true }],
    ...overrides,
  }) as Profile;

describe('toGoogleIdentity', () => {
  it('keeps the Google id, a lower-cased email and the display name', () => {
    expect(toGoogleIdentity(profile())).toEqual({
      googleId: '109876543210987654321',
      email: 'gustavo@exemplo.com',
      name: 'Gustavo Fidelis',
    });
  });

  it('rejects a profile whose email is not verified', () => {
    expect(() =>
      toGoogleIdentity(
        profile({
          emails: [{ value: 'gustavo@exemplo.com', verified: false }],
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a profile without any email', () => {
    expect(() => toGoogleIdentity(profile({ emails: undefined }))).toThrow(
      UnauthorizedException,
    );
  });

  it('falls back to the email local part when there is no display name', () => {
    expect(toGoogleIdentity(profile({ displayName: '  ' })).name).toBe(
      'gustavo',
    );
  });
});
