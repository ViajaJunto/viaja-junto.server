import { JwtService } from '@nestjs/jwt';

type SecretProvider = (
  request: unknown,
  rawJwtToken: string,
  done: (error: Error | null, secret?: string) => void,
) => void;

/**
 * Lets passport-jwt verify a token with any of several secrets, so rotating
 * `JWT_SECRET` does not sign everyone out: the new secret goes first (it is the
 * one that signs), the previous one stays valid until its tokens have expired.
 *
 * It picks the secret whose signature matches; passport-jwt then verifies
 * again with it, so expiry and algorithm are still checked there. When none
 * matches it hands back the first secret, so verification fails normally.
 */
export function secretProviderFor(
  secrets: string[],
  jwt: JwtService = new JwtService(),
): SecretProvider {
  return (_request, rawJwtToken, done) => {
    const matching = secrets.find((secret) => {
      try {
        // `ignoreExpiration` here only: a matching signature is all this checks.
        jwt.verify(rawJwtToken, {
          secret,
          algorithms: ['HS256'],
          ignoreExpiration: true,
        });
        return true;
      } catch {
        return false;
      }
    });

    done(null, matching ?? secrets[0]);
  };
}

/** The secrets in order of preference: current first, then the previous one if set. */
export function acceptedSecrets(current: string, previous?: string): string[] {
  return previous && previous !== current ? [current, previous] : [current];
}
