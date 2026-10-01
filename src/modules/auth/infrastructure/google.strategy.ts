import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { StateStore } from 'passport-oauth2';
import { Profile, Strategy } from 'passport-google-oauth20';
import { env } from '../../../shared/config/env.js';
import type { GoogleIdentity } from '../domain/google-identity.entity.js';
import { CookieStateStore } from './cookie-state.store.js';
import { toGoogleIdentity } from './google-identity.mapper.js';

export const GOOGLE_STRATEGY = 'google';

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  Strategy,
  GOOGLE_STRATEGY,
) {
  constructor() {
    super({
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['openid', 'email', 'profile'],
      store: new CookieStateStore({
        secure: env.NODE_ENV === 'production',
        path: `/${env.API_PREFIX}/auth/google`,
      }) as unknown as StateStore,
    });
  }

  // Google's own tokens are not kept: ViajaJunto only needs to know who the
  // user is, and issues its own access token afterwards.
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleIdentity {
    return toGoogleIdentity(profile);
  }
}
