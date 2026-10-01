import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '../../../shared/config/env.js';
import {
  AccessToken,
  AccessTokenIssuer,
} from '../domain/access-token.issuer.js';
import { AuthenticatedUser } from '../domain/authenticated-user.entity.js';

/** Claims carried by a ViajaJunto access token. */
export interface JwtPayload {
  /** User id. */
  sub: string;
  email: string;
}

@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async issue(user: AuthenticatedUser): Promise<AccessToken> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      value: await this.jwt.signAsync(payload),
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }
}
