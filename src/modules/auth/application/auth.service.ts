import { Injectable } from '@nestjs/common';
import { UserResponseDto } from '../../users/application/dto/user-response.dto.js';
import { UsersService } from '../../users/application/users.service.js';
import { AccessTokenIssuer } from '../domain/access-token.issuer.js';
import type { GoogleIdentity } from '../domain/google-identity.entity.js';
import { AccessTokenResponseDto } from './dto/access-token-response.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: AccessTokenIssuer,
  ) {}

  /**
   * Resolves (or creates) the account behind a Google sign-in and issues a
   * ViajaJunto access token for it.
   */
  async signInWithGoogle(
    identity: GoogleIdentity,
  ): Promise<AccessTokenResponseDto> {
    const user = await this.users.findOrCreateFromGoogle(identity);

    return AccessTokenResponseDto.from(
      await this.tokens.issue({ id: user.id, email: user.email }),
    );
  }

  /** Ends every session of the account: all its access tokens stop working. */
  async signOut(userId: string): Promise<void> {
    await this.users.revokeTokens(userId);
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    return this.users.findOne(userId);
  }
}
