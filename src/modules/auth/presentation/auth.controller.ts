import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { env } from '../../../shared/config/env.js';
import { ErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import { UserResponseDto } from '../../users/application/dto/user-response.dto.js';
import { AuthService } from '../application/auth.service.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.entity.js';
import type { GoogleIdentity } from '../domain/google-identity.entity.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

/** Error code the frontend receives when Google sign-in did not complete. */
export const GOOGLE_SIGN_IN_FAILED = 'google_sign_in_failed';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({
    summary: 'Sign in with Google',
    description:
      'Browser entry point: redirects to the Google consent screen. Open it ' +
      'with a full page navigation, not with fetch/XHR. Google is the only ' +
      'sign-in method; the account is created on first sign-in.',
  })
  @ApiFoundResponse({ description: 'Redirect to the Google consent screen.' })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleSignIn(): void {
    // GoogleAuthGuard answers with the redirect; this body never runs.
  }

  @ApiOperation({
    summary: 'Google sign-in callback',
    description:
      'Called by Google, not by clients. Redirects to the frontend ' +
      '(AUTH_REDIRECT_URL) with `#access_token=<jwt>&token_type=Bearer&expires_in=<seconds>` ' +
      'on success, or `#error=google_sign_in_failed` when consent was denied ' +
      'or the request could not be verified.',
  })
  @ApiFoundResponse({
    description: 'Redirect to the frontend with the token or an error.',
  })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    // GoogleAuthGuard leaves request.user empty when the sign-in failed.
    const identity = request.user as GoogleIdentity | null | undefined;

    if (!identity) {
      response.redirect(frontendRedirect({ error: GOOGLE_SIGN_IN_FAILED }));
      return;
    }

    const token = await this.service.signInWithGoogle(identity);

    response.redirect(
      frontendRedirect({
        access_token: token.accessToken,
        token_type: token.tokenType,
        expires_in: String(token.expiresIn),
      }),
    );
  }

  @ApiOperation({
    summary: 'Current user',
    description:
      'Returns the profile of the user who owns the access token. Signing ' +
      'out is done by discarding the token on the client.',
  })
  @ApiOkResponse({
    description: 'The authenticated user.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'The account behind the token has been deleted.',
    type: ErrorResponseDto,
  })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ErrorResponseDto,
  })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getProfile(user.id);
  }
}

/**
 * The frontend page the browser lands on after the Google callback.
 *
 * Parameters travel in the URL fragment rather than the query string:
 * browsers never send the fragment to a server, so the token stays out of
 * access logs, proxies and the Referer header.
 */
function frontendRedirect(params: Record<string, string>): string {
  const url = new URL(env.AUTH_REDIRECT_URL);
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}
