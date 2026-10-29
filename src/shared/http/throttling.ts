import type { ExecutionContext } from '@nestjs/common';
import { Throttle, type ThrottlerModuleOptions } from '@nestjs/throttler';
import { env } from '../config/env.js';

export interface RateLimits {
  /** Window length, in milliseconds. */
  ttlMs: number;
  /** Requests per window for reads (GET, HEAD, OPTIONS). */
  readLimit: number;
  /** Requests per window for writes (POST, PATCH, PUT, DELETE). */
  writeLimit: number;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const isRead = (context: ExecutionContext): boolean =>
  READ_METHODS.has(
    context.switchToHttp().getRequest<{ method: string }>().method,
  );

/**
 * One window per client IP, with a smaller budget for writes than for reads.
 * Routes that need to be tighter still opt in with `@StrictRateLimit()`.
 */
export function buildThrottlerOptions(
  limits: RateLimits,
): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: limits.ttlMs,
        limit: (context) =>
          isRead(context) ? limits.readLimit : limits.writeLimit,
      },
    ],
  };
}

export const rateLimitsFromEnv = (): RateLimits => ({
  ttlMs: env.THROTTLE_TTL_SECONDS * 1000,
  readLimit: env.THROTTLE_LIMIT,
  writeLimit: env.THROTTLE_WRITE_LIMIT,
});

/**
 * For routes worth abusing: signing in, guessing an invite code, uploads,
 * reviews and the places search (which spends a rate-limited external API).
 */
export const StrictRateLimit = () =>
  Throttle({
    default: {
      ttl: env.THROTTLE_TTL_SECONDS * 1000,
      limit: env.THROTTLE_STRICT_LIMIT,
    },
  });
