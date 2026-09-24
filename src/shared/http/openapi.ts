import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Single source of truth for the OpenAPI document.
 *
 * Used by the running application (src/main.ts) and by the export script
 * (scripts/generate-openapi.mjs) that feeds Spectral in CI, so the contract
 * that gets linted is exactly the one the API serves.
 */
export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('ViajaJunto API')
    .setDescription(
      [
        'REST API for ViajaJunto — collaborative trip planning.',
        '',
        '### Authentication',
        'Operations marked with a padlock require a JWT in the',
        '`Authorization: Bearer <token>` header. Reading the destination and',
        'activity catalogues, reading reviews and signing up are public.',
        '',
        '### Pagination',
        'List operations accept `page` (default 1) and `limit` (default 20,',
        'maximum 100) and answer with a `{ data, meta }` envelope.',
        '',
        '### Errors',
        '`422` means the payload failed validation and carries one message per',
        'violated rule. `409` means a uniqueness constraint was violated.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setContact(
      'ViajaJunto',
      'https://github.com/BernardoLykawka/viaja-junto.server',
      'dudufid34@gmail.com',
    )
    .setLicense(
      'UNLICENSED',
      'https://github.com/BernardoLykawka/viaja-junto.server',
    )
    .addServer('http://localhost:3000', 'Local development')
    .addTag('Health', 'Liveness probe.')
    .addTag('Users', 'Accounts: sign-up and profile management.')
    .addTag('Trips', 'Trips and their planning stage.')
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
    .addTag('Reviews', 'Community ratings of catalogue activities.')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
}
