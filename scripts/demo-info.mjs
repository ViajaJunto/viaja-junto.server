// Prints where the one-command demo is running and a token to try it with.
//
//   npm run demo:info
//
// It signs the token with the same secret the demo containers use: JWT_SECRET
// from the environment when set, otherwise the built-in demo secret.
import { existsSync, readFileSync } from 'node:fs';
import { DEMO_JWT_SECRET, DEMO_USER, signDemoToken } from '../prisma/demo-helpers.mjs';

/** A value from the project's .env, the way Docker Compose reads it (the shell wins). */
function fromEnvFile(key) {
  const file = new URL('../.env', import.meta.url);
  if (!existsSync(file)) return undefined;

  const line = readFileSync(file, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${key}=`));

  return line?.slice(key.length + 1).trim().replace(/^(["'])(.*)\1$/, '$2') || undefined;
}

const port = process.env.API_PORT ?? fromEnvFile('API_PORT') ?? '3000';
const secret = process.env.JWT_SECRET ?? fromEnvFile('JWT_SECRET') ?? DEMO_JWT_SECRET;

console.log(`
ViajaJunto demo is running.

  Swagger (try the API)   http://localhost:${port}/docs
  Health                  http://localhost:${port}/api/health
  Photos (emulated S3)    http://localhost:${process.env.MINISTACK_PORT ?? '4566'}

  Demo user               ${DEMO_USER.email} (ADMIN)
  Token (valid 24 h)      paste it in Swagger > Authentication > Bearer token

${signDemoToken(secret)}

Step by step: docs/happy-path.md
Stop it:      npm run demo:down      (npm run demo:reset also deletes the data)
`);
