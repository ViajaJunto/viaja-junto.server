// Prints a short-lived access token signed with JWT_SECRET from .env, for
// calling protected routes (photo upload...) while Google sign-in is not
// configured. The API validates only the signature, so this token is
// accepted by `start:dev`, the compose stack and the MiniStack deploy alike —
// any environment that shares this JWT_SECRET.
//
//   npm run auth:dev-token
//   npm run auth:dev-token -- someone@example.com
//
// Development only: whoever holds JWT_SECRET can mint tokens for any user.
import 'dotenv/config';
import { createHmac, randomUUID } from 'node:crypto';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error('JWT_SECRET missing or shorter than 32 characters in .env');
  process.exit(1);
}

const email = process.argv[2] ?? 'dev@viajajunto.local';
const now = Math.floor(Date.now() / 1000);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const header = b64({ alg: 'HS256', typ: 'JWT' });
const payload = b64({ sub: randomUUID(), email, iat: now, exp: now + 3600 });
const signature = createHmac('sha256', secret)
  .update(`${header}.${payload}`)
  .digest('base64url');

console.log(`${header}.${payload}.${signature}`);
