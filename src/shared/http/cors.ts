import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * CORS policy for the browser frontend.
 *
 * Only the listed origins are allowed (never `*`), and only the headers and
 * methods the API actually uses. The API authenticates with a Bearer token,
 * not cookies, so credentials are not enabled.
 */
export function buildCorsOptions(origins: string[]): CorsOptions {
  return {
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    // Browsers may cache a successful preflight for 10 minutes.
    maxAge: 600,
  };
}
