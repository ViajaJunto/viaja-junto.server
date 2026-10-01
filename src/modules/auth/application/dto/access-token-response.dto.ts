import { ApiProperty } from '@nestjs/swagger';
import type { AccessToken } from '../../domain/access-token.issuer.js';

/**
 * Result of a successful sign-in.
 *
 * Delivered to the frontend in the redirect URL fragment, with the
 * OAuth 2.0 names (`access_token`, `token_type`, `expires_in`).
 */
export class AccessTokenResponseDto {
  @ApiProperty({
    description: 'JWT to send as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Always "Bearer".', example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Lifetime, in seconds.', example: 3600 })
  expiresIn!: number;

  static from(token: AccessToken): AccessTokenResponseDto {
    return {
      accessToken: token.value,
      tokenType: 'Bearer',
      expiresIn: token.expiresIn,
    };
  }
}
