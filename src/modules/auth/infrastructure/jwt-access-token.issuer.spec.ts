import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { JwtAccessTokenIssuer } from './jwt-access-token.issuer.js';

describe('JwtAccessTokenIssuer', () => {
  // A real JwtService, so the token is checked for what it actually holds.
  const jwt = new JwtService({
    secret: 'test-jwt-secret-that-is-at-least-32-chars',
    signOptions: { expiresIn: 3600 },
  });
  const issuer = new JwtAccessTokenIssuer(jwt);

  it('signs the user id as subject, with the email', async () => {
    const token = await issuer.issue({ id: 'user-id', email: 'a@b.com' });

    await expect(jwt.verifyAsync(token.value)).resolves.toMatchObject({
      sub: 'user-id',
      email: 'a@b.com',
    });
  });

  it('reports the configured lifetime', async () => {
    const token = await issuer.issue({ id: 'user-id', email: 'a@b.com' });

    expect(token.expiresIn).toBe(3600);
  });
});
