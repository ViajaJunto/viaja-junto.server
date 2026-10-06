import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration (generate, migrate, studio).
 *
 * As of Prisma 7 the connection URL no longer lives in schema.prisma: the CLI
 * reads it from here, and the runtime receives the connection through a driver
 * adapter (see src/shared/database/prisma.service.ts).
 *
 * The URL is read with process.env rather than Prisma's env() helper on
 * purpose: env() throws when the variable is missing, but `prisma generate`
 * only reads the schema and never connects. It runs from the postinstall hook
 * inside `docker build` and in CI jobs that have no database, and must not
 * fail there. Commands that do connect (migrate, studio) still fail with a
 * clear error when DATABASE_URL is absent.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    // Also run by `prisma migrate reset` (npm run db:reset).
    seed: 'node prisma/seed.mjs',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
