import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../../shared/config/env.js';
import { UsersService } from '../../users/application/users.service.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.entity.js';
import { acceptedSecrets, secretProviderFor } from './jwt-secrets.js';
import type { JwtPayload } from './jwt-access-token.issuer.js';

export const JWT_STRATEGY = 'jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // The current secret, plus the previous one while a rotation settles.
      secretOrKeyProvider: secretProviderFor(
        acceptedSecrets(env.JWT_SECRET, env.JWT_SECRET_PREVIOUS),
      ),
      // Pinned so a token signed with another algorithm is never accepted.
      algorithms: ['HS256'],
    });
  }

  /**
   * A valid signature is not enough: the account must still exist and the token
   * must not predate its last sign-out. That is what makes signing out (and
   * deleting an account) effective before the token's own expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.users.getSession(payload.sub);

    if (!session) {
      throw new UnauthorizedException('The account no longer exists');
    }

    const issuedAt = (payload.iat ?? 0) * 1000;
    if (
      session.tokensValidAfter &&
      issuedAt < session.tokensValidAfter.getTime()
    ) {
      throw new UnauthorizedException('The session has ended: sign in again');
    }

    return { id: payload.sub, email: payload.email };
  }
}
