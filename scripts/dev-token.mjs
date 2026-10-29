// Prints a short-lived access token signed with JWT_SECRET from .env, for
// calling protected routes while Google sign-in is not configured.
//
//   npm run auth:dev-token
//   npm run auth:dev-token -- someone@example.com
//   npm run auth:dev-token -- someone@example.com --admin   # also makes them an admin
//
// The token belongs to a real account: the user with that email is created in
// the database if it does not exist yet (the API checks the account exists
// before it accepts a token), so DATABASE_URL must point at the API's database.
//
// Development only: whoever holds JWT_SECRET can mint tokens for any user.
import 'dotenv/config';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error('JWT_SECRET missing or shorter than 32 characters in .env');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const admin = args.includes('--admin');
const email = args.find((arg) => !arg.startsWith('--')) ?? 'dev@viajajunto.local';
const name = email.split('@')[0];

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
let userId;
try {
  await db.connect();
  // An existing account keeps its id (and role, unless --admin is given).
  const { rows } = await db.query(
    `INSERT INTO "user" (id, name, email, role)
     VALUES ($1, $2, $3, $4::"UserRole")
     ON CONFLICT (email) DO UPDATE
       SET role = CASE WHEN $5 THEN 'ADMIN'::"UserRole" ELSE "user".role END
     RETURNING id`,
    [randomUUID(), name, email, admin ? 'ADMIN' : 'USER', admin],
  );
  userId = rows[0].id;
} catch (error) {
  console.error(`Could not reach the database: ${error.message}`);
  console.error('Is it running (npm run db:up) and migrated (npx prisma migrate deploy)?');
  process.exit(1);
} finally {
  await db.end().catch(() => undefined);
}

const now = Math.floor(Date.now() / 1000);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const header = b64({ alg: 'HS256', typ: 'JWT' });
const payload = b64({ sub: userId, email, iat: now, exp: now + 3600 });
const signature = createHmac('sha256', secret)
  .update(`${header}.${payload}`)
  .digest('base64url');

console.log(`${header}.${payload}.${signature}`);
