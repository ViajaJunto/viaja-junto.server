import { AuthenticatedUser } from './authenticated-user.entity.js';

export interface AccessToken {
  value: string;
  /** Lifetime, in seconds. */
  expiresIn: number;
}

/**
 * Issuing contract for ViajaJunto access tokens.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class AccessTokenIssuer {
  abstract issue(user: AuthenticatedUser): Promise<AccessToken>;
}
