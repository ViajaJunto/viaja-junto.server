import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { GoogleIdentity } from '../../domain/google-identity.entity.js';
import { GOOGLE_STRATEGY } from '../../infrastructure/google.strategy.js';

/**
 * Starts the Google consent flow and, on the callback, exchanges the code.
 *
 * A failed sign-in (consent denied, state mismatch, unverified email) is not
 * turned into a 401 here: the callback is a browser redirect, so the
 * controller sends the user back to the frontend with an error instead of
 * leaving them on a bare JSON error page.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard(GOOGLE_STRATEGY) {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  handleRequest<TUser = GoogleIdentity>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser | null {
    if (err || !user) {
      this.logger.warn(
        `Google sign-in failed: ${describe(err ?? info ?? 'no user')}`,
      );
      return null;
    }

    return user;
  }
}

function describe(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'object' && reason !== null && 'message' in reason) {
    return String(reason.message);
  }
  return String(reason);
}
