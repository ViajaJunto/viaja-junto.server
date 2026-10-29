import type { NestExpressApplication } from '@nestjs/platform-express';
import { env } from '../config/env.js';
import { buildCorsOptions } from './cors.js';
import { securityHeaders } from './security.js';
import { buildValidationPipe } from './validation.js';

/**
 * Everything the running API applies to the HTTP layer, in one place so the
 * e2e suite exercises exactly what `main.ts` serves.
 */
export function configureHttp(app: NestExpressApplication): void {
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }

  app.use(securityHeaders(env.SWAGGER_PATH));
  app.setGlobalPrefix(env.API_PREFIX);
  app.enableCors(buildCorsOptions(env.CORS_ORIGINS));
  app.useGlobalPipes(buildValidationPipe());
}
