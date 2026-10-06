import { z } from 'zod';

/**
 * Environment variable validation with Zod.
 *
 * Runs once on import: if anything is missing or malformed the application
 * fails at boot with the full list of problems, instead of breaking at
 * runtime in the middle of a request.
 */
/** Treats `KEY=` (present but blank in .env) the same as an absent variable. */
const blankAsUndefined = (value: unknown) => (value === '' ? undefined : value);

const optionalString = z.preprocess(blankAsUndefined, z.string().optional());
const optionalUrl = z.preprocess(blankAsUndefined, z.url().optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  API_PREFIX: z.string().min(1).default('api'),

  SWAGGER_PATH: z.string().min(1).default('docs'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: 'must be a PostgreSQL connection string (postgresql://...)',
    }),

  // OAuth client from Google Cloud Console > APIs & Services > Credentials.
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),

  // Must match one of the "Authorized redirect URIs" registered for the client.
  GOOGLE_CALLBACK_URL: z
    .url()
    .default('http://localhost:3000/api/auth/google/callback'),

  // Frontend page that receives the access token after a Google sign-in.
  AUTH_REDIRECT_URL: z.url().default('http://localhost:5173/auth/callback'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),

  // Access token lifetime, in seconds.
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),

  // ── Object storage (S3) ────────────────────────────────────────────────
  // Optional: without S3_BUCKET the API still boots and photo uploads answer
  // 503. Credentials are never read from here — the AWS SDK resolves them
  // from its default chain (env vars, ECS task role, ~/.aws).
  AWS_REGION: z.string().min(1).default('us-east-1'),

  S3_BUCKET: optionalString,

  // Custom endpoint (MiniStack, LocalStack, MinIO). Unset on real AWS. The SDK
  // also honours AWS_ENDPOINT_URL, which MiniStack injects into ECS tasks.
  S3_ENDPOINT: optionalUrl,

  // Base URL the browser uses to fetch objects, bucket included. Differs from
  // S3_ENDPOINT when the API reaches S3 through an internal hostname.
  S3_PUBLIC_URL: optionalUrl,

  // Emulators address buckets as http://host/bucket instead of by subdomain.
  S3_FORCE_PATH_STYLE: z.preprocess(
    blankAsUndefined,
    z.stringbool().default(false),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(
      `Invalid environment variables:\n${details}\n\n` +
        'Copy .env.example to .env and fill in the missing values.',
    );
  }

  return parsed.data;
}

export const env: Env = validateEnv();
