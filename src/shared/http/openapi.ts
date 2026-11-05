import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './dto/error-response.dto.js';

const REPOSITORY_URL = 'https://github.com/ViajaJunto/viaja-junto.server';

const DESCRIPTION = [
  'REST API for ViajaJunto — collaborative trip planning.',
  '',
  '### Authentication',
  'Google is the only sign-in method; there are no passwords. Open',
  '`GET /auth/google` in the browser (a full page load, not `fetch`): after',
  'consent the API redirects to the frontend with an access token in the URL',
  'fragment. Operations marked with a padlock require that JWT in the',
  '`Authorization: Bearer <token>` header; without it they answer `401`.',
  '',
  'Public without a token: reading the destination and activity catalogues,',
  'their public pages and the reviews, and `GET /health`.',
  '',
  '### Permissions',
  '- **Trips** — the creator (`OWNER`) manages the trip and its members; an',
  '  `EDITOR` changes destinations, activities, budget and expenses; a',
  '  `VIEWER` only reads. Someone outside the trip gets `404`, as if it did',
  '  not exist.',
  '- **Catalogues** — only an administrator (`ADMIN` role) creates, edits,',
  '  deletes or imports catalogue entries and uploads their photos (`403`',
  '  otherwise).',
  '- **Reviews** — only the author changes or deletes a review.',
  '',
  '### Pagination',
  'List operations accept `page` (default 1) and `limit` (default 20,',
  'maximum 100) and answer with a `{ data, meta }` envelope.',
  '',
  '### Rate limiting',
  'Requests are counted per client IP in a fixed window (60 s by default):',
  '300 reads and 60 writes per window. Sensitive operations — signing in,',
  'joining a trip with a code, photo uploads, writing reviews, and the places',
  'search, import and discovery — allow 10. Over the limit the API answers `429` with a',
  '`Retry-After` header (seconds). `GET /health` is not limited.',
  '',
  '### Photos',
  'Photos are sent as `multipart/form-data` in a `file` field (JPEG, PNG or',
  'WebP, up to 5 MB, checked by content) and stored in S3; the response',
  'carries the public `photoUrl`. Without object storage configured the',
  'upload answers `503`.',
  '',
  '### Errors',
  'Errors share one shape: `{ statusCode, message, error }`.',
  '',
  '| Code | Meaning |',
  '| ---- | ------- |',
  '| `400` | A path parameter is not a valid UUID |',
  '| `401` | Missing, invalid or expired access token |',
  '| `403` | Signed in, but the role does not allow the action |',
  '| `404` | No such resource, or one the caller cannot see |',
  '| `409` | Uniqueness or a business rule conflict (already a member, entry in use...) |',
  '| `413` | Uploaded file larger than allowed |',
  '| `422` | Payload failed validation; `message` lists every violated rule |',
  '| `429` | Too many requests; retry after `Retry-After` seconds |',
  '| `502` / `504` | An external places provider failed or timed out |',
  '| `503` | An optional integration (S3, places) is not configured, or the database is down (`/health`) |',
].join('\n');

/**
 * Single source of truth for the OpenAPI document metadata.
 *
 * Used through `createOpenApiDocument` by the running application
 * (src/main.ts) and by the export script (scripts/generate-openapi.mjs) that
 * feeds Spectral in CI, so the contract that gets linted is exactly the one
 * the API serves.
 */
export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('ViajaJunto API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .setContact('ViajaJunto', REPOSITORY_URL, 'dudufid34@gmail.com')
    .setLicense('UNLICENSED', REPOSITORY_URL)
    .addServer('http://localhost:3000', 'Local development')
    .addTag('Health', 'Health check for containers and load balancers.')
    .addTag('Auth', 'Sign-in with Google and the current session.')
    .addTag('Users', 'Accounts and profile management.')
    .addTag('Trips', 'Trips, their planning stage and invite codes.')
    .addTag(
      'Trip Members',
      'Who collaborates on a trip and with which permission.',
    )
    .addTag(
      'Destination Catalog',
      'Shared catalogue of destinations, used for discovery.',
    )
    .addTag('Trip Destinations', 'Stops that make up a trip itinerary.')
    .addTag(
      'Activity Catalog',
      'Shared catalogue of tours, restaurants, lodging and transfers.',
    )
    .addTag('Trip Activities', 'Activities scheduled inside a trip stop.')
    .addTag('Budgets', 'Budget tracking per trip.')
    .addTag(
      'Trip Expenses',
      'Shared expenses of a trip: who paid, how it is split and who owes whom.',
    )
    .addTag('Reviews', 'Community ratings of catalogue activities.')
    .addTag(
      'Destination Reviews',
      'Ratings of destinations, written by travellers who completed a trip there.',
    )
    .addTag(
      'Notifications',
      'In-app notifications about changes on a user’s trips.',
    )
    .addTag(
      'Places',
      'Real-world places: activities around a destination found with Google Places, and the administrators’ search and import of cities and places from OpenStreetMap (Nominatim).',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
}

/** Operations the rate limiter skips (`@SkipThrottle`). */
const NOT_RATE_LIMITED = new Set(['Health']);

/**
 * Builds the OpenAPI document for `app` and adds what applies to every
 * operation but is enforced globally rather than per route: the `429` of the
 * rate limiter (an APP_GUARD, invisible to the Swagger scanner).
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig(), {
    extraModels: [ErrorResponseDto],
  });

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object' || !operation.responses)
        continue;
      if (operation.tags?.some((tag: string) => NOT_RATE_LIMITED.has(tag)))
        continue;

      operation.responses['429'] ??= {
        description:
          'Too many requests from this IP in the current window. Retry after the number of seconds in `Retry-After`.',
        headers: {
          'Retry-After': {
            description: 'Seconds until the window resets.',
            schema: { type: 'integer', example: 42 },
          },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponseDto' },
            example: {
              statusCode: 429,
              message: 'ThrottlerException: Too Many Requests',
            },
          },
        },
      };
    }
  }

  return document;
}
