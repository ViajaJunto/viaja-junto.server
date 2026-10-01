import { UnauthorizedException } from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';
import type { GoogleIdentity } from '../domain/google-identity.entity.js';

/**
 * Keeps only what ViajaJunto needs from a Google profile.
 *
 * An unverified email is rejected outright: accounts are linked by email, so
 * trusting one Google has not verified would let anyone take over an account.
 */
export function toGoogleIdentity(profile: Profile): GoogleIdentity {
  const email = profile.emails
    ?.find((entry) => entry.verified)
    ?.value.toLowerCase();

  if (!email) {
    throw new UnauthorizedException(
      'Google account has no verified email address',
    );
  }

  return {
    googleId: profile.id,
    email,
    name: profile.displayName?.trim() || email.split('@')[0],
  };
}
