// Shared by the demo seed and the demo token script: the deterministic ids and
// the signing of a development token. Plain JavaScript, no dependencies.
import { createHash, createHmac } from 'node:crypto';

/** A version 4 UUID derived from a key, so the same key is always the same id. */
export function id(key) {
  const h = createHash('sha1').update(`viajajunto-demo:${key}`).digest('hex');
  const variant = '89ab'[parseInt(h[16], 16) % 4];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const DEMO_DOMAIN = 'demo.viajajunto.dev';
export const DEMO_USER = { id: id('user:admin'), email: `admin@${DEMO_DOMAIN}` };

/** Secret the one-command demo uses when JWT_SECRET is not set. Never use it anywhere else. */
export const DEMO_JWT_SECRET = 'viajajunto-demo-jwt-secret-not-for-production-use';

const base64url = (value) => Buffer.from(value).toString('base64url');

/**
 * An HS256 access token for the demo user, valid for `hours`. It is what the
 * API issues after a Google sign-in, so it can be pasted in the Swagger
 * "Authorize" box, which lets someone try the API without a Google account.
 */
export function signDemoToken(secret, hours = 24) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: DEMO_USER.id, email: DEMO_USER.email, iat: now, exp: now + hours * 3600 }));
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

  return `${header}.${payload}.${signature}`;
}
